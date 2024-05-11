import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import * as cryptos from 'crypto';
import mongoose, { Model } from 'mongoose';
import { PaymentService } from 'src/paymentModule/payment.service';
import { AdminSettingsService } from 'src/adminSettingsModule/adminSettings.service';
import { Request, Response } from 'express';
import { attachCookiesToResponse, jwtIsValid, sendEmail } from 'src/util';
import { CloudinaryService } from 'src/cloudinary/cloudinary.services';
import * as request from 'request';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('CharityAppUsers') private User: Model<any>,
    @InjectModel('wallet') private wallet: Model<any>,
    @InjectModel('adminsettings') private admin: Model<any>,
    @InjectModel('accountValIntent') private accountValIntent: Model<any>,
    @InjectModel('withdrawalIntent') private withdrawalIntent: Model<any>,
    @InjectModel('vCardIntent') private vCardIntent: Model<any>,
    @Inject(forwardRef(() => PaymentService))
    private paymentservice: PaymentService,
    private adminservice: AdminSettingsService,
    private cloudinary: CloudinaryService,
  ) {}

  // async createPayStackCustomer({
  //   email,
  //   first_name,
  //   last_name,
  //   phone,
  // }: {
  //   email: string;
  //   first_name: string;
  //   last_name: string;
  //   phone?: string;
  // }) {
  //   try {
  //     const url = `https://api.paystack.co/customer`;
  //     const options = {
  //       method: 'GET',
  //       url,
  //       headers: {
  //         Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  //         'content-type': 'application/json',
  //         'cache-control': 'no-cache',
  //       },
  //       body: { email, first_name, last_name, phone },
  //       json: true,
  //     };

  //     request(options, async (error: any, response: any) => {
  //       if (error) {
  //         return {
  //           msg: `Something went wrong with Paystack's API`,
  //           payload: error,
  //         };
  //       }
  //       // console.log(response.body);
  //       const result = response.body;
  //       if (result.status === 'error') {
  //         return {
  //           msg: 'error status',
  //           payload: result,
  //         };
  //       }
  //       return { msg: 'success', payload: result };
  //     });
  //   } catch (err) {
  //     return { msg: 'server_error', payload: err.message };
  //   }
  // }

  async login(email: string, password: string, res: Response) {
    if (!email || !password) {
      return res.status(400).json({ msg: 'Incomplete credentials' });
    }
    try {
      const user = await this.User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ msg: 'This user does not exist. Try registering' });
      }
      const isPassCorrect = await bcrypt.compare(password, user.password);
      if (isPassCorrect) {
        if (user?.isVerified) {
          const { _id, email, isAdmin, firstName, lastName } = user;

          const token = await jwt.sign(
            {
              _id,
              email,
              isAdmin,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_LIFETIME,
            },
          );
          
          return res.status(201).json({
            msg: 'success',
            user: {
              _id,
              email,
              token,
              firstName,
              lastName
            },
          });
        } else {
          return res.status(400).json({
            msg: 'Your email is unverified. Visit the email we sent to you during registration.',
          });
        }
      } else {
        return res.status(400).json({ msg: 'Wrong email or password' });
        // throw new ForbiddenException({ msg: 'wrong email or password' });
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async logout(res: Response) {
    //cookie name must be same with normal session cookie.
    //just so it gets replaced
    try {
      res.cookie('accessToken', 'logout', {
        httpOnly: true,
        expires: new Date(Date.now()),
        secure: process.env.NODE_ENV === 'production',
        signed: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      });
      return res.status(200).json({ msg: 'User logged out' });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async startRegistration(body: any, res: Response) {
    const { password, phoneNumber, dateOfBirth, email, firstName, lastName } =
      body;
    if (!password) {
      return res
        .status(400)
        .json({ msg: 'incomplete credentials. No password sent' });
    }
    if (!new Date(dateOfBirth)) {
      return res.status(400).json({ msg: 'invalid date' });
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedpass = await bcrypt.hash(password, salt);

      const url = `https://api.paystack.co/customer`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        body: {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumber,
        },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res.status(400).json({
            msg: `Something went wrong with Paystack's API`,
            payload: error,
          });
        }
        const result = response.body;
        // console.log(result);
        // console.log(result.data);

        if (result.status === 'error') {
          return res.status(400).json({
            msg: 'error status',
            payload: result,
          });
        }
        try {
          const user = await this.User.create({
            ...body,
            dateOfBirth: new Date(dateOfBirth),
            phoneNumber: String(phoneNumber),
            password: hashedpass,
            paystack_customer_code: result?.data?.customer_code,
            paystack_customer_id: result?.data?.id,
            paystack_customer_integration: result?.data?.integration,
          });
          if (!user) {
            return res.status(400).json({
              msg: 'Something went wrong. Please try again',
            });
          }

          const { _id } = user;
          return res.status(200).json({
            msg: 'successful',
            payload: { _id, email },
          });
        } catch (err) {
          if (err.message.includes('email_1 dup key')) {
            return res.status(500).json({
              payload: 'server error',
              msg: 'Email has already been registered',
            });
          }
          return res
            .status(500)
            .json({ payload: 'server error', msg: err.message });
        }
      });
    } catch (err) {
      if (err.message.includes('email_1 dup key')) {
        return res.status(500).json({
          payload: 'server error',
          msg: 'Email has already been registered',
        });
      }
      return res
        .status(500)
        .json({ payload: 'server error', msg: err.message });
    }
  }

  async completeRegistration(userId: string, res: Response) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        return res.status(401).json({
          msg: 'unsuccessful',
          payload: 'User was not created. Please go back and resubmit details',
        });
      }

      const verificationToken = cryptos.randomBytes(40).toString('hex');

      await this.User.findOneAndUpdate(
        { _id: userId },
        { $set: { verificationToken } },
      );
      const { _id, email, isAdmin, firstName, lastName } = user;
      const token = await jwt.sign(
        {
          _id,
          email,
          isAdmin,
          firstName,
          lastName,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_LIFETIME,
        },
      );

      sendEmail(
        user,
        `
          <div>
            <h4>Email account verification</h4>
            <h5>Click on the button below to verify your email address</h5>
            <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/verify?verificationToken=${verificationToken}&email=${user?.email}'>Verify Email</a></button>
            </div>
        `,
      ).then(
        (response) => {
          return res.status(200).json({
            msg: 'success! we sent you an email to verify your account',
            user: {
              _id,
              email,
              token,
            },
          });
        },
        (err) => {
          console.log('email err', err);
          return res.status(400).json({ msg: 'unsuccessful', payload: err });
        },
      );
    } catch (err) {
      console.log('normal err', err);
      return res.status(500).json({ msg: err.message });
    }
  }

  async verifyEmail(verificationToken: string, email: string, res: Response) {
    try {
      const user = await this.User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          msg: 'No user with this email. Please try registering',
        });
      }
      if (user.verificationToken !== verificationToken) {
        return res.status(400).json({
          msg: 'false or expired token. You may already have been verified. Go to login page and try. Or contact customer care for support',
        });
      }
      user.isVerified = true;
      user.verified = Date.now();
      user.verificationToken = '';
      await user.save();
      const { _id, firstName, lastName, phoneNumber, isVerified, isAdmin } =
        user;
      await this.paymentservice.validateUserWallet(_id);
      await attachCookiesToResponse(res, {
        _id,
        firstName,
        lastName,
        phoneNumber,
        isAdmin,
      });
      return res.status(200).json({
        msg: 'email verified',
        user: {
          _id,
          email: user.email,
          firstName,
          lastName,
          phoneNumber,
        },
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async sendResetPassToEmail(email: string, res: Response) {
    try {
      const useremail = await this.User.findOne({ email });
      if (!useremail) {
        return res.status(400).json({
          msg: 'This user email does not exist. Please go back and register afresh',
        });
      }
      const resetToken = cryptos.randomBytes(40).toString('hex');
      const tokenifiedUser = await this.User.findOneAndUpdate(
        { email },
        { $set: { verificationToken: resetToken } },
        { new: true },
      );
      if (!tokenifiedUser) {
        return res.status(400).json({
          msg: 'Token could not be generated. Contact customer care with this error',
        });
      }

      sendEmail(
        tokenifiedUser,
        `
          <div>
            <h4>CharityOrg Account Password reset</h4>
            <h5>Click on the button below to reset your password</h5>
            <button><a style='padding:10px; border-radius:10px' href='${process.env.FRONT_END_CONNECTION}/resetPassword?verificationToken=${resetToken}&email=${tokenifiedUser?.email}'>Reset Password</a></button>
            </div>
        `,
      ).then(
        (response) => {
          return res.status(200).json({
            msg: `success! we sent an email to you at ${tokenifiedUser.email}. Please visit to reset your password`,
            payload: response,
          });
        },
        (err) => {
          return res.status(400).json({ msg: 'unsuccessful', payload: err });
        },
      );
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async resetPassword(
    resetToken: string,
    email: string,
    password: string,
    res: Response,
  ) {
    try {
      const user = await this.User.findOne({ email });
      if (!user) {
        throw new NotFoundException({
          msg: 'No user with this email. Please try registering',
        });
      }
      if (user.verificationToken !== resetToken) {
        return res.status(400).json({
          msg: 'false or expired token',
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedpass = await bcrypt.hash(password, salt);

      user.password = hashedpass;
      user.isVerified = true;
      user.verified = Date.now();
      user.verificationToken = '';
      await user.save();

      const { _id, firstName, lastName, phoneNumber, isVerified, isAdmin } =
        user;
      await this.paymentservice.validateUserWallet(_id);
      await attachCookiesToResponse(res, {
        _id,
        firstName,
        lastName,
        phoneNumber,
        isAdmin,
      });
      return res.status(200).json({
        msg: 'password reset successful',
        user: {
          _id,
          email: user.email,
          firstName,
          lastName,
          phoneNumber,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchCompleteUserDetails(userId: any, req: Request, res: Response) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'Forbidden request. This user does not exist',
        );
      }

      const token = req?.headers.authorization?.split(' ')[1];
      let decodedUser = await jwtIsValid(token);
      // console.log(decodedUser)
      const {
        email,
        firstName,
        lastName,
        phoneNumber,
        _id,
        profilePic,
        isVerified,
        isAdmin,
        address,
        is_offically_verified,
        accountBankVerified,
        subscription,
        bundle,
        country,
        my_pledges,
      } = user;

      if (decodedUser._id.toString() !== userId && !decodedUser.isAdmin) {
        return res.status(200).json({
          msg: 'success',
          user: {
            _id,
            email: email,
            firstName,
            lastName,
            phoneNumber,
            isVerified,
            isAdmin,
            address,
            profilePic,
          },
        });
      }
      const extraObjects = {};

      if (is_offically_verified) {
        extraObjects['accountBank'] = user?.accountBank;
        extraObjects['accountNumber'] = user?.accountNumber;
        extraObjects['accountName'] = user?.accountName;
        extraObjects['accountBankCode'] = user?.accountBankCode;
        extraObjects['accountCurrency'] = user?.accountCurrency;
      }
      const accountValidationStatus = await this.accountValIntent.findOne({
        userId: _id,
      });
      if (accountBankVerified) {
        extraObjects['idValidationStatus'] =
          accountValidationStatus?.intentStatus;
        if (
          accountValidationStatus?.intentStatus === 'attended' &&
          !is_offically_verified
        ) {
          extraObjects['dissatisfaction_reason'] =
            accountValidationStatus?.dissatisfaction_reason;
        }
      }
      return res.status(200).json({
        msg: 'success',
        user: {
          _id,
          email: email,
          firstName,
          lastName,
          phoneNumber,
          address,
          country,
          profilePic,
          ...extraObjects,
          is_offically_verified,
          accountBankVerified,
          isVerified,
          isAdmin,
          subscription,
          bundle,
          my_pledges,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async searchUser(searchWord: string, res: Response) {
    try {
      // Define a function to check if a string is a valid ObjectId
      const isValidObjectId = (str) => mongoose.Types.ObjectId.isValid(str);
      if (searchWord) {
        const users = await this.User.find({
          $or: [
            { firstName: { $regex: searchWord, $options: 'xi' } },
            { lastName: { $regex: searchWord, $options: 'xi' } },
            // { email: { $regex: searchWord, $options: 'xi' } },
            isValidObjectId(searchWord)
              ? { _id: new mongoose.Types.ObjectId(searchWord) }
              : { email: { $regex: searchWord, $options: 'xi' } },
            // : {},
            // { _id: { $regex: new RegExp(searchWord, 'i') } },
          ],
        }).select('firstName lastName email _id');

        if (users?.length === 0) {
          return res.status(400).json([]);
        }
        return res.status(200).json(users);
      } else {
        return res.status(400).json([]);
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  //helper function
  async implementWalletWithdrawal(
    user: any,
    userId: string,
    amount: number,
    currency: string,
    subType?: string,
    bundleType?: string,
  ) {
    await this.paymentservice.validateUserWallet(userId);
    const oldwallet = await this.wallet.findOne({ userId });
    if (!oldwallet) {
      throw new BadRequestException(
        'You do not seem to have a wallet. Please contact customer support',
      );
    }
    //get the particular currency object from wallet to work with
    let particularCurrency = await oldwallet.currencies.find((eachCur: any) => {
      return eachCur?.currency_type === currency;
    });

    //calculate outflow percent from old outflow and subscription cost, a.k.a amount
    let outflow_percent = 0;
    if (particularCurrency.total_outflow === 0) {
      outflow_percent = 100;
    } else {
      outflow_percent =
        (Number(amount) / Number(particularCurrency.total_outflow)) * 100;
    }
    if (particularCurrency?.balance < amount) {
      throw new ForbiddenException(
        `You do not have up to ${currency} ${amount} in your ${currency} wallet`,
      );
    }
    //reduce user wallet balance by amount
    const newwalletBalance = await this.wallet.findOneAndUpdate(
      {
        userId,
        'currencies.currency_type': currency,
      },
      {
        $inc: {
          'currencies.$.balance': -Number(amount).toFixed(3),
          'currencies.$.total_outflow': -Number(amount),
        },
        $set: {
          'currencies.$.total_outflow_percent_dec': outflow_percent.toFixed(3),
        },
      },
      { new: true },
    );
    if (!newwalletBalance) {
      throw new BadRequestException({
        msg: 'Could not withdraw from wallet. Please refresh page and try again or contact customer support',
      });
    }
    //create wallet transaction and transaction (type of transfer is ${mainEventName}, as would appear in tx history)
    const status = 'successful';
    const description = subType
      ? `${subType} Subscription Purchase`
      : `Bundle Purchase`;
    const narration = !bundleType
      ? 'In-app Transaction'
      : `Item: ${bundleType}`;
    const tx_ref = `charityapp${Date.now()}${Math.random()}`;
    const customer = {
      email: user.email,
      phone_number: user.phoneNumber,
      name: `${user.firstName} ${user.lastName}`,
    };
    const id = `${Math.random() * 1000}${Date.now()}`;

    await this.paymentservice.createWalletTransactions(
      userId,
      false,
      status,
      currency,
      amount,
      description,
      narration,
    );
    await this.paymentservice.createTransaction(
      userId,
      false,
      id,
      status,
      currency,
      amount,
      customer,
      tx_ref,
      description,
      narration,
    );
  }

  //helper function
  async confirmFeatureEligibility(feature: string, userId: string) {
    //fetch user to check if they have no penalties.
    //If they dont, proceed to check for subscription and bundles
    const user = await this.User.findOne({ _id: userId });
    if (!user) {
      throw new BadRequestException('user does not exist');
    }

    //check for penalties
    // const penalty = user?.penalty?.length;
    // if (penalty > 0) {
    //   return false;
    // }

    //check for user subscription
    const userSubscriptionType = user?.subscription?.subscription_type;

    //check for subscription expiration date
    const userSubscriptionExpiration = user?.subscription?.subscription_date;

    //fetch admin settings document from database
    const adminservice = await this.admin.findOne({
      _id: '6466adefaaed2bfa0761592b',
    });

    //define an empty date variable
    let date = null;
    let someDate = new Date(userSubscriptionExpiration);
    let numberOfTimeOrDaysToAdd = Number(
      adminservice.subscription.expiration.value,
    );
    //check the particular day or time for subscription expiration (using admin settings)
    //compile subscription expiration into the date variable above
    if (
      adminservice.subscription.expiration.quantifier === 'hour' ||
      adminservice.subscription.expiration.quantifier === 'hours'
    ) {
      date = someDate.setHours(someDate.getHours() + numberOfTimeOrDaysToAdd);
    }
    if (
      adminservice.subscription.expiration.quantifier === 'day' ||
      adminservice.subscription.expiration.quantifier === 'days'
    ) {
      date = someDate.setDate(someDate.getDate() + numberOfTimeOrDaysToAdd);
    }
    if (
      adminservice.subscription.expiration.quantifier === 'month' ||
      adminservice.subscription.expiration.quantifier === 'months'
    ) {
      date = someDate.setMonth(someDate.getMonth() + numberOfTimeOrDaysToAdd);
    }
    if (
      adminservice.subscription.expiration.quantifier === 'year' ||
      adminservice.subscription.expiration.quantifier === 'years'
    ) {
      date = someDate.setFullYear(
        someDate.getFullYear() + numberOfTimeOrDaysToAdd,
      );
    }
    //check if user has bundles for chosen feature,
    //if so, end algorithm and return true
    let bundlePresent = false;
    let bundleName = undefined;

    //new check for bundle's presence
    user?.bundle.map((eachBundle: any) => {
      return eachBundle.bundleFeatures.map((eachFeature: any) => {
        if (eachFeature.featureName === feature && eachFeature.stockLeft > 0) {
          bundlePresent = true;
          bundleName = eachBundle.bundleName;
        }
      });
    });

    //if subscription has expired but there is bundle, dont throw below error.
    //Just move on and later substract from bundle.
    if (
      new Date().getTime() > new Date(date).getTime() &&
      !bundlePresent &&
      userSubscriptionType !== 'free'
    ) {
      throw new ForbiddenException(
        `Your subscription to this feature has expired. Renew your subscription or buy a timeless bundle containing this feature`,
      );
    }

    let eligibilityResult = false;
    //the above variable is the final result that determines user access to feature.

    //check if feature is present in user's subscription package(as set by admin)
    //manipulate eligibilityResult accordingly
    for (let singleFeature in adminservice.subscription[userSubscriptionType]) {
      if (singleFeature === feature) {
        eligibilityResult = true;
      }
    }

    //if eligibilityResult remains false, check whether there is bundle
    //manipulate eligibility to true
    if (!eligibilityResult && bundlePresent) {
      user.bundle
        .find((eachBundle: any) => {
          return eachBundle.bundleName === bundleName;
        })
        ?.bundleFeatures.map((eachFeature: any) => {
          if (eachFeature.featureName === feature) {
            return (eachFeature.stockLeft -= 1);
          }
        });
      await user.save();
      eligibilityResult = true;
    }

    return eligibilityResult;
  }

  async editUserDetails(
    userId: string,
    first_name: string,
    last_name: string,
    // profilePic: Express.Multer.File,
    profilePic: any,
    address: string,
    phone_number: string,
    req: Request,
    res: Response,
  ) {
    // console.log(userId, accountBank, accountNumber, accountName)
    try {
      const token = req?.headers?.authorization?.split(' ')[1];

      // let decodedU;
      let decodedUser = await jwtIsValid(token);
      // console.log(decodedUser)
      const userExists = await this.User.findOne({ _id: userId });

      if (!userExists) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Unauthorized. User does not exist. Try registering on our welcome page',
        });
      }

      if (decodedUser?._id.toString() !== userId && !userExists?.isAdmin) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: 'Unauthorized access',
        });
      }

      const infoObject = {};
      if (
        (first_name || last_name) &&
        !userExists?.is_offically_verified &&
        !userExists?.accountBankVerified
      ) {
        infoObject['firstName'] = first_name || '';
        infoObject['lastName'] = last_name || '';
      }

      if (address) {
        infoObject['address'] = address;
      }
      if (phone_number) {
        infoObject['phoneNumber'] = phone_number;
      }
      if (profilePic) {
        const result = await this.cloudinary.uploadImage(profilePic?.buffer);
        infoObject['profilePic'] = result?.secure_url;
      }
      // console.log(infoObject);
      const user = await this.User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            ...infoObject,
          },
        },
        { new: true },
      );
      if (!user) {
        return res
          .status(400)
          .json(
            'Forbidden request. Could not edit user details. Try again or contact customer support',
          );
      }

      const {
        _id,
        email,
        firstName,
        lastName,
        phoneNumber,
        profilePic: profilePicture,
        address: useraddress,
        is_offically_verified,
        accountBankVerified,
        isAdmin,
        country,
        subscription,
        bundle,
      } = user;

      const extraObjects = {};

      if (is_offically_verified) {
        extraObjects['accountBank'] = user?.accountBank;
        extraObjects['accountNumber'] = user?.accountNumber;
        extraObjects['accountName'] = user?.accountName;
        extraObjects['accountBankCode'] = user?.accountBankCode;
        extraObjects['accountCurrency'] = user?.accountCurrency;
      }
      const accountValidationStatus = await this.accountValIntent.findOne({
        userId: _id,
      });
      if (accountBankVerified && accountValidationStatus) {
        extraObjects['idValidationStatus'] =
          accountValidationStatus.intentStatus;
        if (
          accountValidationStatus.intentStatus === 'attended' &&
          !is_offically_verified
        ) {
          extraObjects['dissatisfaction_reason'] =
            accountValidationStatus.dissatisfaction_reason;
        }
      }
      return res.status(200).json({
        msg: 'success',
        user: {
          _id,
          email: email,
          firstName,
          lastName,
          profilePic: profilePicture,
          phoneNumber,
          address: useraddress,
          country,
          ...extraObjects,
          accountBankVerified,
          is_offically_verified,
          isAdmin,
          subscription,
          bundle,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //only happens after a user's account is verified by paystack, if they are nigerians
  //a verification intent is created and sent to admin thereafter
  async acceptGovermentIssuedIdCard(
    userId: string,
    idCard: Express.Multer.File,
    req: Request,
    res: Response,
  ) {
    try {
      const token = req?.headers?.authorization?.split(' ')[1];

      let decodedUser = await jwtIsValid(token);
      // console.log(decodedUser)
      const userExists = await this.User.findOne({ _id: userId });

      if (!userExists) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Unauthorized. User does not exist. Try registering on our welcome page',
        });
      }

      if (decodedUser?._id.toString() !== userId && !userExists?.isAdmin) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: 'Unauthorized access',
        });
      }

      if (
        userExists?.country === 'nigeria' &&
        !userExists?.accountBankVerified
      ) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Please verify your bank account information before submitting verification document',
        });
      }

      if (idCard) {
        //first check if user doesn't have pending verification intent
        const pendingIntent = await this.accountValIntent.findOne({ userId });
        if (pendingIntent && pendingIntent?.intentStatus === 'awaiting') {
          return res
            .status(400)
            .json({ msg: 'You have an awaiting request already' });
        }
        if (
          pendingIntent &&
          pendingIntent?.intentStatus === 'attended' &&
          pendingIntent?.verdict === 'satisfied'
        ) {
          return res.status(400).json({
            msg: 'Your account seems to be verified already. Check your notification or reach to customer support for confirmation',
          });
        }
        const admin = await this.User.findOne({ _id: process?.env?.ADMIN_ID });

        //CODE LINE NOT YET WRITTEN
        //CHECK IF THE USER HAS A PHOTOID ON THEIR INTENT,
        //IF YES, DESTROY IT FORST BEFORE SAVING THE NEW ONE, TO SAVE CLOUDINARY SPACE

        //Save id card photo
        const result = await this.cloudinary.uploadImage(idCard?.buffer);

        if (!result?.secure_url) {
          return res
            .status(400)
            .json(
              'Verification document could not be saved. Please refresh page and resumbit, or contact customer support',
            );
        }

        const user = await this.User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              official_verification_id: result?.secure_url,
            },
          },
          { new: true },
        );

        if (!user) {
          return res
            .status(400)
            .json(
              'Verification document could not be saved. Please try again or contact customer support',
            );
        }
        // console.log(user)
        let valIntent;
        if (pendingIntent) {
          valIntent = await this.accountValIntent.findOneAndUpdate(
            {
              userId,
            },
            {
              userName: `${user?.firstName} ${user?.lastName}`,
              govt_issued_id_doc: result?.secure_url,
              intentStatus: 'awaiting',
            },
            { new: true },
          );
        } else {
          valIntent = await this.accountValIntent.create({
            userId,
            userName: `${user?.firstName} ${user?.lastName}`,
            govt_issued_id_doc: result?.secure_url,
            accountBankCode: user?.accountBankCode,
            accountBankName: user?.accountBank,
            accountNumber: user?.accountNumber,
            accountName: user?.accountName,
            intentStatus: 'awaiting',
          });
        }

        if (!valIntent) {
          return res
            .status(400)
            .json(
              'Validation intent could not be created. Please try again or contact customer support',
            );
        }
        await sendEmail(
          admin,
          `
          <div>
            <h4>New Verification Intent</h4>
            <h5>A user ${user?.firstName} ${user?.lastName} wants to be verified</h5>
            <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/adminDashboard/${admin._id}/manage_account_verification_intent'>View Validation Intent</a></button>
            </div>
        `,
        );

        return res.status(200).json({
          msg: 'success',
          payload:
            'Verification intent has been created. Approval status will communicated to you soon',
        });
      }
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async createWithdrawalIntent({
    userId,
    userName,
    amount,
    currency,
    accountBank,
    accountBankCode,
    accountNumber,
    accountBankName,
    res,
  }: {
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    accountBank: string;
    accountBankCode: string;
    accountNumber: string;
    accountBankName: string;
    res: Response;
  }) {
    try {
      //first check if user does not have pending withdrawal
      const intentExists = await this.withdrawalIntent.findOne({
        userId,
        intentStatus: 'pending',
      });

      if (intentExists) {
        return res.status(400).json({
          msg: 'You have a pending withdrawal request. Cancel the request before making new ones',
        });
      }

      //ensure they have a wallet created
      await this.paymentservice.validateUserWallet(userId);
      //decrement the wallet by amount to be withdrawn.
      //This method checks if the user has enough funds in the wallet currency
      await this.paymentservice.decreaseWallet(userId, amount, currency);

      const intent = await this.withdrawalIntent.create({
        userId,
        userName,
        amount,
        currency,
        accountBank,
        accountNumber,
        accountBankCode,
        accountBankName,
      });
      if (!intent) {
        return res.status(400).json({ msg: 'Intent could not be created' });
      }
      return res.status(201).json({
        msg: 'successful',
        payload: {
          _id: intent?._id,
          intentStatus: intent?.intentStatus,
          userId,
          userName,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchSingleUserWithdrawalIntents({
    userId,
    res,
  }: {
    userId: string;
    res: Response;
  }) {
    try {
      //unlike wallet transaction history, user intents will exclusively show user's withdrawal history
      //this is where user checks to find the status of their withdrawals
      //they can also cancel the withdrawals
      const userIntents = await this.withdrawalIntent
        .find({ userId })
        .select(
          'amount currency intentStatus cancellationReason createdAt updatedAt',
        );
      return res.status(201).json({ msg: 'successful', payload: userIntents });
    } catch (err) {
      return res.status(500).json({ msg: '' });
    }
  }

  async cancelUserWithdrawalIntent({
    userId,
    intentId,
    res,
  }: {
    userId: string;
    intentId: string;
    res: Response;
  }) {
    try {
      //unlike wallet transaction history, user intents will exclusively show user's withdrawal history
      //this is where user checks to find the status of their withdrawals
      //they can also cancel the withdrawals
      const intentIsProccessing = await this.withdrawalIntent.findOne({
        userId,
        _id: intentId,
      });

      if (intentIsProccessing?.intentStatus === 'processing') {
        return res.status(400).json({
          msg: 'You can only cancel a withdrawal request while it is pending. Your withdrawl is already being processed and can no longer be canceled',
          payload:
            'You can only cancel a withdrawal request while it is pending. Your withdrawl is already being processed and can no longer be canceled',
        });
      }
      intentIsProccessing.intentStatus = 'cancelled';
      intentIsProccessing.save();
      return res
        .status(200)
        .json({ msg: 'successful', payload: intentIsProccessing });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //virtual Card Intents
  async createVirtualCardIntent({
    userId,
    userName,
    res,
  }: {
    userId: string;
    userName: string;
    res: Response;
  }) {
    try {
      const user = await this.User.findOne({ _id: userId });
      //first check if user does not have pending withdrawal
      if (!user) {
        return res.status(400).json({
          msg: 'Unauthorized. This user does not exist',
        });
      }

      if (!user?.is_offically_verified) {
        return res.status(400).json({
          msg: 'Unauthorized. Only fully verified users can create virtual cards',
        });
      }

      const intentExists = await this.vCardIntent.findOne({
        userId,
        intentStatus: 'awaiting',
      });

      if (intentExists) {
        return res.status(400).json({
          msg: 'You have a pending request. Wait for the result before creating a new virtual card',
        });
      }

      //check if user has requested amount in their wallet, if not reject.
      // first validate user wallet
      //ensure they have a wallet created
      await this.paymentservice.validateUserWallet(userId);
      //decrement the wallet by amount to be withdrawn.
      //This method checks if the user has enough funds in the wallet currency
      await this.paymentservice.decreaseWallet(userId, Number(100), 'NGN');


      const intent = await this.vCardIntent.create({
        userId,
        userName,
        amount: 100,
        currency: 'NGN',
      });
      if (!intent) {
        return res
          .status(400)
          .json({ msg: 'Virtual request could not be created' });
      }
      return res.status(201).json({
        msg: 'successful',
        payload: {
          _id: intent?._id,
          intentStatus: intent?.intentStatus,
          userId,
          userName,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchSingleUserVirtualCardIntents({
    userId,
    res,
  }: {
    userId: string;
    res: Response;
  }) {
    try {
      //unlike wallet transaction history, user intents will exclusively show user's withdrawal history
      //this is where user checks to find the status of their withdrawals
      //they can also cancel the withdrawals
      const userIntents = await this.vCardIntent
        .find({ userId })
        .select(
          'amount currency intentStatus cancellationReason createdAt updatedAt',
        );
      return res.status(201).json({ msg: 'successful', payload: userIntents });
    } catch (err) {
      return res.status(500).json({ msg: '' });
    }
  }

  async cancelUserVirtualCardIntent({
    userId,
    intentId,
    res,
  }: {
    userId: string;
    intentId: string;
    res: Response;
  }) {
    try {
      //unlike wallet transaction history, user intents will exclusively show user's withdrawal history
      //this is where user checks to find the status of their withdrawals
      //they can also cancel the withdrawals
      const intentIsProccessing = await this.vCardIntent.findOne({
        userId,
        _id: intentId,
      });

      intentIsProccessing.intentStatus = 'cancelled';
      intentIsProccessing.save();
      return res.status(200).json({
        msg: 'successful',
        payload: { ...intentIsProccessing, dissatisfaction_reason: null },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async editUserSubscriptiontype({
    subType,
    userId,
  }: {
    subType: string;
    userId: string;
  }) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'Forbidden request. This user does not exist',
        );
      }
      const {
        email,
        firstName,
        lastName,
        phoneNumber,
        _id,
        isVerified,
        isAdmin,
        cardNumber,
        subscription,
        bundle,
        expirationDate,
        cvv,
        accountBank,
        accountNumber,
      } = user;
      const userData = {
        _id,
        email: email,
        firstName,
        lastName,
        phoneNumber,
        cardNumber,
        expirationDate,
        cvv,
        accountBank,
        accountNumber,
        isVerified,
        isAdmin,
        subscription,
        // bundles,
        bundle,
      };

      const sub_and_bundle =
        await this.adminservice.fetchSubscriptionAndBundles();

      if (subType === user.subscription.subscription_type) {
        return {
          msg: 'success',
          user: userData,
        };
      }
      if (
        subType === 'free' &&
        user?.subscription?.subscription_type !== 'free'
      ) {
        const maxUsers =
          sub_and_bundle?.subscription?.free?.free_participant_no;
        user.subscription.subscription_type = 'free';
        user.subscription.subscription_date = new Date();
        user.event_max_allowed_participants = maxUsers;
        await user.save();
      }
      if (
        subType === 'gold' &&
        user.subscription.subscription_type === 'platinum'
      ) {
        const maxUsers =
          sub_and_bundle?.subscription?.gold?.gold_participant_no;
        user.subscription.subscription_type = 'gold';
        user.subscription.subscription_date = new Date();
        user.event_max_allowed_participants = maxUsers;
        await user.save();
      }
      if (
        subType === 'gold' &&
        user.subscription.subscription_type === 'free'
      ) {
        const amount = sub_and_bundle?.subscription?.goldprice?.value;
        const currency = sub_and_bundle?.subscription?.goldprice?.currency;
        const maxUsers =
          sub_and_bundle?.subscription?.gold?.gold_participant_no;
        await this.implementWalletWithdrawal(
          user,
          userId,
          amount,
          currency,
          subType,
        );
        user.subscription.subscription_type = 'gold';
        user.subscription.subscription_date = new Date();
        user.event_max_allowed_participants = maxUsers;
        await user.save();
      }
      if (
        subType === 'platinum' &&
        (user.subscription.subscription_type === 'gold' ||
          user.subscription.subscription_type === 'free')
      ) {
        const amount = sub_and_bundle?.subscription?.platinumprice?.value;
        const currency = sub_and_bundle?.subscription?.platinumprice?.currency;
        const maxUsers =
          sub_and_bundle?.subscription?.platinum?.platinum_participant_no;
        await this.implementWalletWithdrawal(
          user,
          userId,
          amount,
          currency,
          subType,
        );
        user.subscription.subscription_type = 'platinum';
        user.subscription.subscription_date = new Date();
        user.event_max_allowed_participants = maxUsers;
        await user.save();
      }
      return {
        msg: 'success',
        user: userData,
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async editUserBundleAmount(userId: string, frontendBundleName: string) {
    try {
      let user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'Forbidden request. This user does not exist',
        );
      }

      //check if user has previously purchased specified bundle
      const bundleHasOnceBeenPurchased = await this.User.findOne({
        _id: userId,
        bundle: { $elemMatch: { bundleName: frontendBundleName } },
      });
      const adminObject = await this.admin.findOne({
        _id: '6466adefaaed2bfa0761592b',
      });

      let bundleNamesArray = [];
      //extract bundleNames into an array (for later use)
      adminObject?.bundle_settings.map((eachBundle: any) => {
        bundleNamesArray.push(eachBundle.bundleName);
        return;
      });

      let particularBundleFromAdmin = (bundleN: string) => {
        return adminObject?.bundle_settings.find((eachBundle: any) => {
          return eachBundle.bundleName === bundleN;
        });
      };
      if (bundleHasOnceBeenPurchased) {
        //user purchases bundle
        function buildUserBundle(bundleName: string) {
          this.buildup = function () {
            const userBundle = user?.bundle.find((eachBundle: any) => {
              return eachBundle.bundleName === bundleName;
            });
            const adminFeatureObj = particularBundleFromAdmin(bundleName);

            let fieldMatch = [];
            let aggregate = [];

            particularBundleFromAdmin(bundleName).bundleFeatures.map(
              (adminFeature: any) => {
                let result = userBundle.bundleFeatures.find(
                  (userFeature: any) => {
                    return adminFeature.featureName === userFeature.featureName;
                  },
                );
                if (result) {
                  const newObj = {
                    featureName: adminFeature.featureName,
                    stockLeft:
                      Number(adminFeature.featureStock) +
                      Number(result.stockLeft),
                  };
                  fieldMatch.push(newObj);
                  return;
                }
              },
            );
            // compare fieldMatch with the rest of userBundle features
            if (fieldMatch.length === 0) {
              //then no feature in adminsettins is present in user module
              const reburbishedAdmin = adminFeatureObj.bundleFeatures.map(
                (eachFeature: any) => {
                  return {
                    featureName: eachFeature.featureName,
                    stockLeft: eachFeature.featureStock,
                  };
                },
              );
              aggregate = [...userBundle.bundleFeatures, ...reburbishedAdmin];
            } else {
              // console.log(`fieldMatch: ${fieldMatch}`)
              let featureNameList = fieldMatch.map((eachFeature: any) => {
                return eachFeature.featureName;
              });
              let userFeatureCheck = [];

              userBundle?.bundleFeatures.map((eachFeature: any) => {
                if (featureNameList.includes(eachFeature?.featureName)) {
                  let concernedFieldObj = fieldMatch.find((eachF: any) => {
                    return eachF?.featureName === eachFeature?.featureName;
                  });
                  userFeatureCheck.push(concernedFieldObj);
                } else {
                  userFeatureCheck.push(eachFeature);
                }
                return;
              });
              let adminFeatureCheck = [];
              let compiledUserFeatureNameList = userFeatureCheck.map(
                (eachFeature: any) => {
                  return eachFeature.featureName;
                },
              );
              adminFeatureObj?.bundleFeatures.map((eachFeature: any) => {
                if (
                  !compiledUserFeatureNameList.includes(
                    eachFeature?.featureName,
                  )
                ) {
                  let temp = eachFeature.featureStock;
                  delete eachFeature.featureStock;
                  eachFeature.stockLeft = temp;
                  adminFeatureCheck.push(eachFeature);
                }
                aggregate = [...userFeatureCheck, ...adminFeatureCheck];
                return;
              });
            }
            return aggregate;
          };
        }
        const newFeatures = new buildUserBundle(frontendBundleName).buildup();
        // console.log(newFeatures);
        user = await this.User.findOneAndUpdate(
          { _id: userId, 'bundle.bundleName': frontendBundleName },
          { $set: { 'bundle.$.bundleFeatures': newFeatures } },
        );
      } else {
        const adminBundle = particularBundleFromAdmin(frontendBundleName);
        if (!adminBundle) {
          throw new BadRequestException(
            'This bundle package does not exist. Please contact customer care with error message',
          );
        }
        const refurbishedAdminBundle = adminBundle.bundleFeatures.map(
          (eachBundle: any) => {
            return {
              featureName: eachBundle?.featureName,
              stockLeft: eachBundle?.featureStock,
            };
          },
          { new: true },
        );
        // console.log(refurbishedAdminBundle);
        user = await this.User.findOneAndUpdate(
          { _id: userId },
          {
            $push: {
              bundle: {
                bundleName: frontendBundleName,
                bundleFeatures: refurbishedAdminBundle,
              },
            },
          },
          { new: true },
        );
      }

      // user.bundles[bundle_type_variable] += Number(bundle_quantity_to_buy);
      // await user.save();

      //prepare data for wallet withdrawal

      let bundleValue = Number(
        particularBundleFromAdmin(frontendBundleName).bundlePrice,
      );
      let bundleCurrency =
        particularBundleFromAdmin(frontendBundleName).bundleCurrency;

      let _ = undefined;
      let bundle_name = frontendBundleName;
      await this.implementWalletWithdrawal(
        user,
        userId,
        bundleValue,
        bundleCurrency,
        _,
        bundle_name,
      );

      const {
        email,
        firstName,
        lastName,
        phoneNumber,
        _id,
        isVerified,
        isAdmin,
        cardNumber,
        subscription,
        bundles,
        bundle,
        expirationDate,
        cvv,
        accountBank,
        accountNumber,
      } = user;
      const userData = {
        _id,
        email: email,
        firstName,
        lastName,
        phoneNumber,
        cardNumber,
        expirationDate,
        cvv,
        accountBank,
        accountNumber,
        isVerified,
        isAdmin,
        subscription,
        bundles,
        bundle,
      };
      return {
        msg: 'success',
        user: userData,
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async acceptVerificationDocuments(files: any, userId: string, res: Response) {
    try {
      const userExist = await this.User.findOne({ _id: userId });
      if (!userExist) {
        return res.status(400).json({ msg: 'This user does not exist' });
      }
      const firstImage = files[0];
      const secondImage = files[1];
      const result1 = await this.cloudinary.uploadImage(firstImage);
      const result2 = await this.cloudinary.uploadImage(secondImage);
      // console.log(result1, result2);
      const user = await this.User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            offical_verification_bank_statement: result1?.secure_url,
            official_verification_id: result2?.secure_url,
          },
        },
        { new: true },
      );
      if (!user) {
        return res.status(400).json({ msg: 'Something went wrong' });
      }
      return res.status(200).json({ msg: 'success' });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async tokenIsStillValid(req: Request, res: Response) {
    try {
      const token = req?.headers.authorization?.split(' ')[1];
      const result = await jwtIsValid(token);
      if (result) {
        return res.status(200).json({ msg: true });
      } else {
        return res.status(400).json({ msg: false });
      }
    } catch (err) {
      return res.status(500).json({ msg: false });
    }
  }
}

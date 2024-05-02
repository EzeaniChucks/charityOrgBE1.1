import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import * as cryptos from 'crypto';
import { Model } from 'mongoose';
import { PaymentController } from 'src/paymentModule/payment.controller';
import { PaymentService } from 'src/paymentModule/payment.service';
import { Request, Response } from 'express';
import { chargeRangeDeletionDTO } from './adminSettings.dto';
import { sendEmail } from 'src/util';
import * as request from 'request';
import { NotifService } from 'src/notificationModule/notifService';
import * as Flutterwave from 'flutterwave-node-v3';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectModel('adminsettings') private Admin: Model<any>,
    @InjectModel('CharityAppUsers') private user: Model<any>,
    @InjectModel('events') private event: Model<any>,
    @InjectModel('membership') private membership: Model<any>,
    @InjectModel('accountValIntent') private accountValIntent: Model<any>,
    @InjectModel('withdrawalIntent') private withdrawalIntent: Model<any>,
    @InjectModel('vCardIntent') private vCardIntent: Model<any>,
    private paymentservice: PaymentService,
    private notificationservice: NotifService,
  ) {}

  async confirmAdminStatus(req: any) {
    try {
      // console.log(req?.decodedAdmin)
      if (req?.decodedAdmin.isAdmin) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //for users who somehow didn't get to be registered on paystack during onboarding process to this app
  async createNewPaystackCustomer(userId: string, res: Response) {
    try {
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        return res.status(400).json({
          msg: 'User does not exist. Confirm the validity of the userId or ask user to re-register',
        });
      }

      if (user?.paystack_customer_code) {
        return res.status(400).json({
          msg: `${user.firstName} ${user.lastName} already has a customer code of ${user?.paystack_customer_code}`,
        });
      }

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
          email: user.email,
          first_name: user?.firstName,
          last_name: user?.lastName,
          phone: user?.phoneNumber,
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

        if (result.status === 'error') {
          return res.status(400).json({
            msg: 'error status',
            payload: result,
          });
        }
        try {
          user.paystack_customer_code = result?.data?.customer_code;
          user.paystack_customer_id = result?.data?.id;
          user.paystack_customer_integration = result?.data?.integration;
          if (!user?.country) {
            user.country = 'nigeria';
          }
          await user.save();
          return res
            .status(200)
            .json({ msg: 'successful', payload: 'paystack customer created' });
        } catch (err) {
          return res
            ?.status(500)
            ?.json({ payload: 'server error', msg: err?.message });
        }
      });
    } catch (err: any) {
      return res
        ?.status(500)
        ?.json({ payload: 'server error', msg: err?.message });
    }
  }

  async fetchUserDetailsForAdminManagement(req: any, res: Response) {
    try {
      if (req?.decodedAdmin?.isAdmin === false) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'unauthorized access' });
      }
      let users = await this.user.find({});
      let finalUserArray = [];
      const userlooping = users.map(async (eachUser: any) => {
        const charities = await this.event
          .find({ creatorId: eachUser._id })
          .select(
            '_id eventName currency totalEventAmount eventAmountExpected',
          );
        const memberships = await this.membership
          .find({ creatorId: eachUser?._id })
          .select('_id title members');

        finalUserArray?.push({
          _id: eachUser._id,
          name: `${eachUser?.firstName} ${eachUser?.lastName}`,
          charities,
          memberships,
          status: eachUser?.userStatus,
          isVerifiedAsOrganization: eachUser?.is_offically_verified || false,
          verification_documents: {
            govt_issued_id: eachUser?.official_verification_id,
            bank_statement: eachUser?.offical_verification_bank_statement,
          },
        });
      });
      await Promise.all(userlooping);
      return res
        .status(200)
        .json({ msg: 'successful', payload: finalUserArray });
    } catch (err) {
      return res
        .status(500)
        .json({ msg: 'unsuccessful. Server error', payload: err.message });
    }
  }

  async fetchVerificationIntents(
    status: 'attended' | 'awaiting' | 'all',
    res: Response,
  ) {
    try {
      let intents;
      if (status === 'attended') {
        intents = await this.accountValIntent.find({
          intentStatus: 'attended',
        });
      }
      if (status === 'awaiting') {
        intents = await this.accountValIntent.find({
          intentStatus: 'awaiting',
        });
      }
      if (status === 'all') {
        intents = await this.accountValIntent.find();
      }

      return res.status(200).json({ msg: 'successful', payload: intents });
    } catch (err: any) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async giveVerificationVerdict(
    verdict: string,
    userId: string,
    dissatisfaction_reason: string,
    res: Response,
  ) {
    try {
      if (verdict !== 'satisfied' && verdict !== 'dissatisfied') {
        return res.status(400).json({
          msg: `Verdict values can only be 'satisfied' or 'dissatified'`,
        });
      }

      if (verdict === 'satisfied') {
        await this.accountValIntent.findOneAndUpdate(
          { userId },
          { $set: { intentStatus: 'attended', verdict: 'satisfied' } },
        );

        const user = await this.user.findOneAndUpdate(
          { _id: userId },
          { is_offically_verified: true },
          { new: true },
        );

        await this.notificationservice.logSingleNotification(
          'Your photo_Id is approved and your account is now fully verified',
          user?._id,
          '65c681387a7de5645968486f',
          `${process.env.FRONT_END_CONNECTION}/user/${user?._id}`,
          'account_verification',
        );

        await sendEmail(
          user,
          `
          <div>
            <h4>Congrats! Your account is verified</h4>
            <h5>${user?.firstName} ${user?.lastName}, your account is verified</h5>
            <h5>You can now make unlimited deposits to your wallets, donations to charities and withdrawals from our platform</h5>
            <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/user/${user?._id}'>Go to your profile</a></button>
            </div>
        `,
        );
        return res.status(200).json({
          msg: 'successful',
          payload: 'User account successfully verified',
        });
      }

      if (verdict === 'dissatisfied') {
        if (!dissatisfaction_reason) {
          return res
            .status(400)
            .json({ msg: 'Please provide a reason for being dissatified' });
        }
        const user = await this.user.findOne({ _id: userId });

        await this.accountValIntent.findOneAndUpdate(
          { userId },
          {
            $set: {
              intentStatus: 'attended',
              verdict: 'dissatisfied',
              dissatisfaction_reason,
            },
          },
        );

        await this.notificationservice.logSingleNotification(
          `Your account verificatio needs a little work and you are good to go: Reason for rejection: ${dissatisfaction_reason}`,
          user?._id,
          '65c681387a7de5645968486f',
          `${process.env.FRONT_END_CONNECTION}/user/${user?._id}`,
          'account_verification',
        );
        await sendEmail(
          user,
          `
          <div>
          <h4>Your verification intent needs attention</h4>
          <h5>${user?.firstName} ${user?.lastName}, your account didn't pass verification yet</h5>
          <h5>Reason: ${dissatisfaction_reason}</h5>
          <h5>Please make neccessary adjustments and try re-verifying from your profile page</h5>
          <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/user/${user?._id}'>Go to your profile</a></button>
          </div>
          `,
        );
      }
      return res.status(200).json({
        msg: 'successful',
        payload:
          'User verification intent is rejected. Notification has been been sent to the user along with reason for rejection',
      });
    } catch (err: any) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchWithdrawalIntents({
    intentStatus,
    res,
  }: {
    intentStatus: 'pending' | 'processing' | 'attended' | 'cancelled';
    res: Response;
  }) {
    try {
      const intentStatus_enums = [
        'pending',
        'processing',
        'attended',
        'cancelled',
      ];
      if (!intentStatus_enums.includes(intentStatus)) {
        return res.status(400).json({
          msg: "intent status can only be 'pending', 'processing', 'attended' or 'cancelled'",
        });
      }
      const userIntents = await this.withdrawalIntent.find({ intentStatus });
      return res.status(201).json({ msg: 'successful', payload: userIntents });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async acceptWithdrawalIntent({
    userId,
    intentId,
    res,
  }: {
    userId: string;
    intentId: string;
    res: Response;
  }) {
    try {
      //create flutterwave withdrawal request here
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        return res
          .status(400)
          .json('forbidden request. This user doen not exist');
      }

      const intent = await this.withdrawalIntent.findOne({
        userId,
        _id: intentId,
      });

      if (!intent) {
        return res
          .status(400)
          .json(
            'This withdrawal request does not exist. Please contact developer team for extra assistance',
          );
      }

      if (intent?.intentStatus === 'cancelled') {
        return res
          .status(400)
          .json(
            'This withdrawl request has been cancelled by user and should no longer be processed',
          );
      }

      const amount = intent?.amount;
      const currency = intent?.currency;
      const account_bank = intent?.accountBankCode;
      const account_number = intent?.accountNumber;
      // const account_bank = intent?.accountBank;
      // const account_bank_name = intent?.accountBankName;

      //wallet has been validated and account balance has been debited during creation of intent by user

      //here, just create the transaction and wallet transaction docs
      const walletTrans = await this.paymentservice.createWalletTransactions(
        userId,
        false,
        'pending',
        currency,
        amount,
        'Wallet Withdraw',
        'Bank Transfer',
      );

      const callback_url = `https://${process.env.BACK_END_CONNECTION}/respond_to_fl_bank_payment`;

      const reference = `${user?.firstName}_${user?.lastName}_${Date.now()}`;

      const data = {
        account_bank,
        account_number,
        amount: Number(amount),
        narration: `Transfer from ${user?.firstName} ${user?.lastName} @CharityApp`,
        currency,
        reference,
        callback_url,
        debit_currency: 'NGN',
        beneficiary_name: `${user?.firstName} ${user?.lastName}`,
        meta: {
          beneficiary_id: userId,
          first_name: user.firstName,
          last_name: user.lastName,
          intentId,
          mobile_number: user.phoneNumber,
          email: user.email,
          beneficiary_country: user.country || 'NG',
          beneficiary_occupation: 'merchant',
          wallettransaction_id: walletTrans._id,
          // wallettransaction_id: 'test_wallet_trx_ID',
          recipient_address:
            user.address || 'opposite Access bank, ilupeju, lagos Nigeria',
          sender: 'Bankole Kasumu',
          sender_country: 'NG',
          sender_id_number: '22177327049',
          sender_id_type: 'ID CARD',
          sender_id_expiry: 'N/A',
          sender_mobile_number: '2348124669500',
          sender_address: 'opposite Access bank, ilupeju, lagos Nigeria',
          sender_occupation: 'Legal Practitioner',
          sender_beneficiary_relationship: 'Customer',
          transfer_purpose: 'Wallet withdrawal',
        },
      };

      const flw = new Flutterwave(
        // 'FLWPUBK_TEST-31f261f02a971b32bd56cf4deff5e74a-X',
        `${process.env.FLUTTERWAVE_V3_PUBLIC_KEY}`,
        `${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
      );

      const result = await flw.Transfer.initiate(data);
      // console.log(result);
      if (result.status === 'error') {
        return res
          .status(400)
          .json({ msg: 'failed', payload: result?.message });
      }

      await this.paymentservice.createTransaction(
        userId,
        false,
        result?.data?.id,
        'pending',
        currency,
        amount,
        {
          email: user?.email,
          phone_number: user?.phoneNumber,
          name: `${user?.firstName} ${user?.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        'Wallet Withdraw: Bank credit transfer',
        'Bank Transaction: Flutterwave bank credit',
      );

      const intentUpdated = await this.withdrawalIntent.findOneAndUpdate(
        { userId, _id: intentId },
        { intentStatus: 'processing' },
        { new: true },
      );
      return res.status(200).json({
        msg: 'success',
        payload: { ...result?.data, ...intentUpdated },
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async rejectWithdrawalIntent({
    userId,
    intentId,
    cancellationReason,
    res,
  }: {
    userId: string;
    intentId: string;
    cancellationReason: string;
    res: Response;
  }) {
    try {
      //create flutterwave withdrawal request here
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        return res
          .status(400)
          .json('forbidden request. This user doen not exist');
      }

      const intent = await this.withdrawalIntent.findOne({
        userId,
        _id: intentId,
      });

      if (!intent) {
        return res
          .status(400)
          .json(
            'This withdrawal request does not exist. Please contact developer team for extra assistance',
          );
      }

      if (intent?.intentStatus === 'cancelled') {
        return res
          .status(400)
          .json(
            'This withdrawl request has been cancelled by user and should no longer be processed',
          );
      }

      //refund the user
      await this.paymentservice.increaseWallet(
        user?._id,
        Number(intent.amount),
        intent?.currency,
        'wallet refund from admin rejection',
      );

      //update withdrawal intent to show rejection
      const intentUpdated = await this.withdrawalIntent.findOneAndUpdate(
        { userId, _id: intentId },
        { intentStatus: 'rejected', cancellationReason },
        { new: true },
      );

      await this.notificationservice.logSingleNotification(
        `We cannot process your withdrawal request for ${intent?.currency} ${
          intent?.amount
        }, which you submitted on ${new Date(
          intent?.createdAt,
        ).toDateString()}. Please click here for details`,
        user?._id,
        '65c681387a7de5645968486f',
        `${process.env.FRONT_END_CONNECTION}/dashboard/${user?._id}?click='withdrawal'`,
        'account_verification',
      );

      const submissionDate = new Date(
          intent?.createdAt,
        ).toDateString()

      await sendEmail(
        user,
        `
          <div>
            <h4>Hey ${user?.firstName} ${user?.lastName}, we cannot process your withdrawal request for ${intent?.currency} ${intent?.amount}, which you submitted on ${submissionDate}</h4>
            <h5>Reason: ${cancellationReason}</h5>
            <h6>Click the button below to see the details on your profile</h6>
            <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/user/${user?._id}'>Go to your profile</a></button>
            </div>
        `,
      )
        .then(
          (response) => {
            return res.status(200).json({
              msg: 'success',
              payload: intentUpdated,
            });
          },
          (err) => {
            console.log('email err', err);
            return res.status(400).json({ msg: 'unsuccessful', payload: err });
          },
        )
        .catch((err) => {
          return res.status(500).json({ msg: err?.message });
        });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async walletChargeHandler(
    completeBody: {
      to: number;
      from: number;
      percent: number;
    },
    req: any,
  ) {
    const { to, from, percent } = completeBody;
    if ((!to && !from) || !percent) {
      throw new BadRequestException({ msg: 'Incomplete credentials' });
    }
    try {
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      const rangeExists = await this.Admin.findOne({
        chargeRanges: { $elemMatch: { to, from } },
      });
      if (rangeExists) {
        throw new BadRequestException({ msg: 'range already exists' });
      }
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $push: { chargeRanges: completeBody } },
        { new: true },
      );
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async chargeDeleteHandler(chargerangeId: string, req: any) {
    try {
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $pull: { chargeRanges: { _id: chargerangeId } } },
        { new: true },
      ).select('chargeRanges');
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async fetchChargeRanges(req: any) {
    try {
      const result = await this.Admin.findOne({
        _id: '6466adefaaed2bfa0761592b',
      }).select('chargeRanges');
      //I commented out the below code after deciding that users will need to fetch charge ranges too
      // console.log('decodedAdmin:', req?.decodedAdmin);
      // let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      // if (!isAdmin) {
      //   throw new ForbiddenException('You cannot make this request');
      // }
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async setSubscription(userId: string, subObj: any, req: any) {
    //check if user is an admin
    try {
      // const user = await this.user.findOne({ _id: userId });
      // if (!user?.isAdmin) {
      //   throw new ForbiddenException('Forbidden request.');
      // }
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      let objectIsTamperedWith = false;
      const newObj = { ...subObj?.free, ...subObj?.gold, ...subObj?.platinum };
      // const newObjLength = Object.values(newObj).length;
      const schema = [
        'can_use_crypto',
        'can_use_currency_conversion',
        'can_use_pledge_forms',
        'dep_in_multi_eventCategories',
        'extend_dep_comp_deadlines',
        'can_be_obs_or_dep',
        'can_pick_event_currency',
        'can_pick_event_timezone',
        'can_pick_event_privacy',
        'can_invite_obser_or_depos',
        'can_add_new_category',
        'can_transfer_money_inapp',
        'can_see_full_list_of_transaction',
        'free_participant_no',
        'gold_participant_no',
        'platinum_participant_no',
      ];
      for (let subname in newObj) {
        if (!schema.includes(subname)) {
          objectIsTamperedWith = true;
        }
      }
      if (objectIsTamperedWith) {
        throw new ForbiddenException(
          'You have sent one or more wrong subscription feature name. Visit documentation for right list of allowed features',
        );
      }
      // check if all features are sent. I decided to remove the code implementing this (below)
      // because you might want to completely take off a praticular feature from
      // all subTypes (free, gold and platinum)

      // if (newObjLength !== schema.length) {
      //   throw new ForbiddenException(
      //     'Send full list of features. Visit documentation for list of allowed feature names',
      //   );
      // }

      //set subObj in admin subscription settings
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $set: { subscription: subObj } },
        { new: true },
      );
      return {
        msg: 'successful',
        subscription: result.subscription,
        bundle: result.bundle_settings || {},
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async setBundles(userId: string, bundleObj: any, req: any) {
    //check if user is an admin
    // const user = await this.user.findOne({ _id: userId });
    // if (!user.isAdmin) {
    //   throw new ForbiddenException('Forbidden request.');
    // }
    let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
    if (!isAdmin) {
      throw new ForbiddenException('You cannot make this request');
    }
    const schema = [
      'can_use_crypto',
      'can_use_currency_conversion',
      'can_use_pledge_forms',
      'dep_in_multi_eventCategories',
      'extend_dep_comp_deadlines',
      'can_be_obs_or_dep',
      'can_pick_event_currency',
      'can_pick_event_timezone',
      'can_invite_obser_or_depos',
      'can_add_new_category',
      'can_transfer_money_inapp',
      'can_see_full_list_of_transaction',
    ];

    //check if bundlenames aren't repeated
    let bundleName = undefined;
    let nameIsRepeated = false;
    let objectIsTamperedWith = false;

    bundleObj.map((eachBundle: any) => {
      if (eachBundle.bundleName === bundleName) {
        nameIsRepeated = true;
      } else {
        bundleName = eachBundle.bundleName;
      }
      eachBundle.bundleFeatures.map((eachFeature: any) => {
        if (!schema.includes(eachFeature.featureName)) {
          objectIsTamperedWith = true;
        }
      });
      return;
    });

    if (nameIsRepeated) {
      throw new BadRequestException(
        'You cannot repeat bundle names. each name must be unique',
      );
    }
    if (objectIsTamperedWith) {
      throw new ForbiddenException(
        'You have sent one or more wrong subscription feature name. Visit documentation for list of allowed feature names',
      );
    }
    const adminObj = await this.Admin.findOne({
      _id: '6466adefaaed2bfa0761592b',
    });

    let bundleNamesArray = [];
    //extract bundleNames into an array (for later use)
    adminObj.bundle_settings.map((eachBundle: any) => {
      bundleNamesArray.push(eachBundle.bundleName);
      return;
    });

    let particularBundle = (bundleN: string) =>
      bundleObj.find((eachBundle: any) => {
        return eachBundle.bundleName === bundleN;
      });
    let result = undefined;
    for (let indBundle of bundleObj) {
      if (bundleNamesArray.includes(indBundle.bundleName)) {
        result = await this.Admin.findOneAndUpdate(
          {
            _id: '6466adefaaed2bfa0761592b',
            'bundle_settings.bundleName': indBundle.bundleName,
          },
          {
            $set: {
              'bundle_settings.$': particularBundle(indBundle.bundleName),
            },
          },
          { new: true },
        );
      } else {
        result = await this.Admin.findOneAndUpdate(
          {
            _id: '6466adefaaed2bfa0761592b',
          },
          {
            $push: {
              bundle_settings: particularBundle(indBundle.bundleName),
            },
          },
          { new: true },
        );
      }
    }
    return {
      msg: 'successful',
      // subscription: result.subscription,
      // bundle: result.bundle_prices || {},
      bundlenew: result.bundle_settings || {},
    };
  }

  async fetchSubscriptionAndBundles() {
    //pull out subObj
    const result = await this.Admin.findOne({
      _id: '6466adefaaed2bfa0761592b',
    });
    return {
      msg: 'successful',
      subscription: result?.subscription,
      bundlenew: result?.bundle_settings || {},
      // bundle: result?.bundle_prices || {},
    };
  }
}

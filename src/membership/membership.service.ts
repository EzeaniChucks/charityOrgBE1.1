import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import { Model } from 'mongoose';
import { PaymentService } from 'src/paymentModule/payment.service';
import { createMembershipDTO, updateMembershipDTO } from './membership.dto';
import { jwtIsValid } from 'src/util';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel('membership') private membership: Model<any>,
    @InjectModel('CharityAppUsers') private user: Model<any>,
    private readonly walletservice: PaymentService,
  ) {}

  //create CRON job for charging members of membership groups
  //soon to be executed
  async recurrentPaymentFromWalletForMembershipCron(res: Response) {
    try {
      const allMemberships = await this.membership.find();
      for (let eachmembership of allMemberships) {
        if (eachmembership?.members?.length > 0) {
          // console.log('the membership:', eachmembership);
          const { creatorId, amount, currency, title, charge_frequency_MS } =
            eachmembership;
          for (let everymember of eachmembership.members) {
            const {
              userId: memberId,
              userName: memberName,
              chargeDate,
            } = everymember;

            let chargeDateArrayLength = chargeDate?.length;
            if (chargeDate[chargeDateArrayLength - 1] < new Date()) {
              try {
                // console.log('every expired member:', everymember);

                //charge member by transfering money from their wallet to membership creator's wallet
                //firstly reduce member's wallet
                await this.walletservice.validateUserWallet(memberId);
                await this.walletservice.decreaseWallet(
                  memberId,
                  amount,
                  currency,
                );

                //then increase creator's wallet
                await this.walletservice.validateUserWallet(creatorId);
                await this.walletservice.increaseWallet(
                  creatorId,
                  amount,
                  currency,
                  'membership payment',
                );

                //create wallet transaction and general trx data for both creator's credit and members' debit

                //creator's record
                const creator = await this.user.findOne({ _id: creatorId });
                //wallet trx
                await this.walletservice.createWalletTransactions(
                  creatorId,
                  true,
                  'successful',
                  currency,
                  amount,
                  'Wallet Top-up',
                  `Membership remission of ${currency} ${amount} from ${memberName} on your membership: "${title}"`,
                );
                //general trx
                await this.walletservice.createTransaction(
                  creatorId,
                  true,
                  `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
                  'successful',
                  currency,
                  amount,
                  {
                    email: creator?.email,
                    phone_number: creator?.phoneNumber,
                    name: `${creator?.firstName} ${creator.lastName}`,
                  },
                  `charityapp${Date.now()}${Math.random()}`,
                  'Wallet Top-up',
                  `Membership remission of ${currency} ${amount} from ${memberName} on your membership: "${title}"`,
                  'inapp_membership',
                  null,
                  {
                    senderId: `${memberId}`,
                    senderName: `membership&${memberName}`,
                  },
                );

                //member's record
                const member = await this.user.findOne({ _id: memberId });

                //wallet trx
                await this.walletservice.createWalletTransactions(
                  memberId,
                  false,
                  'successful',
                  currency,
                  amount,
                  'Wallet Withdraw',
                  `Membership remission of ${currency} ${amount} from you to a membership you belong to: "${title}"`,
                );

                //general trx
                await this.walletservice.createTransaction(
                  memberId,
                  false,
                  `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
                  'successful',
                  currency,
                  amount,
                  {
                    email: member?.email,
                    phone_number: member?.phoneNumber,
                    name: `${member?.firstName} ${member.lastName}`,
                  },
                  `charityapp${Date.now()}${Math.random()}`,
                  'Wallet Withdraw',
                  `Membership remission of ${currency} ${amount} from you to a membership you belong to: "${title}"`,
                  'inapp_membership',
                  null,
                  null,
                  {
                    recipientId: `${creator?._id}`,
                    recipientName: `membership&${creator?.firstName} ${creator?.lastName}`,
                  },
                );

                //lastly, push new charge date into the member's payment plan (marked by the chargeDate field)
                await this.membership.findOneAndUpdate(
                  {
                    _id: eachmembership?._id,
                    'members.userId': everymember.userId,
                  },
                  {
                    $push: {
                      'members.$.chargeDate': new Date(
                        Date.now() + charge_frequency_MS,
                      ),
                    },
                  },
                );
              } catch (err) {
                //send email to user asking them to fund their wallet to allow deduction from a particular membership,
                //created by a perticular person, if err message is: "You do not have up to 239 NGN in your NGN wallet"
                console.log({ msg: `server error: ${err?.message}` });
              }
            }
          }
        }
      }
    } catch (err) {
      //send email to user asking them to fund their wallet to allow deduction from a particular membership,
      //created by a perticular person, if err message is: "You do not have up to 239 NGN in your NGN wallet"
      console.log({ msg: `server error: ${err?.message}` });
    }
  }

  // export const membershipSchema = new mongoose.Schema({
  //   creatorId: { type: mongoose.Schema.Types.ObjectId },
  //   title: { type: String, required: true, unique:true },
  //   members: [
  //     {
  //       userId: { type: mongoose.Schema.Types.ObjectId },
  //       userName: { type: String },
  //       chargeDate: [Date], //array of charge date strings
  //     },
  //   ],
  //   currency: { type: String, required: true },
  //   amount: { type: Number, required: true },
  //   description: { type: String, required: true },
  //   status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  //   chargeFrequencyUnit: { type: String, required: true },
  //   chargeFrequencyValue: { type: Number, required: true },
  //   charge_frequency_MS: { type: Number }, //charge milliseconds to be added
  //   reviews: [
  //     new mongoose.Schema(
  //       {
  //         name: { type: String },
  //         comment: { type: String },
  //         reviewerId:{type:mongoose.Schema.Types.ObjectId, required:true}
  //       },
  //       { timestamps: true },
  //     ),
  //   ],
  // });
  async recurrentPaymentFromCardForMembershipCron() {
    try {
    } catch (err) {}
  }

  //create membrship
  async createMembership(
    body: createMembershipDTO,
    req: Request,
    res: Response,
  ) {
    try {
      const result = await jwtIsValid(req.signedCookies.accessToken);
      // console.log(result._id, body?.creatorId);
      if (result?._id !== body?.creatorId) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'forbidden request' });
      }
      if (
        !body.creatorId ||
        typeof body.creatorId !== 'string' ||
        !body.chargeFrequencyUnit || //unit of days (days, weeks, months) for recurrent charge to happen
        !body.chargeFrequencyValue //number days for recurrent charge to happen
      ) {
        return res.status(400).json({
          msg: 'Please pass right credentials. Check documentation or email our customer service for right paramters',
        });
      }
      //     const creatorExists = await this.membership.findOne({creatorId:body?.creatorId});
      //    if(creatorExists){
      //     return res.status(400).json({msg:'You already have a running membership and cannot create a new one'});
      //    }

      const { chargeFrequencyUnit, chargeFrequencyValue } = body;
      let charge_frequency_MS: number = 0;

      if (chargeFrequencyUnit === 'days') {
        charge_frequency_MS =
          Number(chargeFrequencyValue) * 24 * 60 * 60 * 1000;
      }

      if (chargeFrequencyUnit === 'weeks') {
        charge_frequency_MS =
          Number(chargeFrequencyValue) * 7 * 24 * 60 * 60 * 1000;
      }

      if (chargeFrequencyUnit === 'months') {
        charge_frequency_MS =
          Number(chargeFrequencyValue) * 30 * 24 * 60 * 60 * 1000;
      }
      let newMembership = await this.membership.create({
        ...body,
        charge_frequency_MS,
        chargeFrequencyUnit,
        chargeFrequencyValue,
        // exactChargeDateMs: Date.now(),
      });
      if (!newMembership) {
        return res.status(400).json({
          msg: 'Something went wrong. New membership could not be created. Please try again',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.find({ creatorId: body?.creatorId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //fetch membership
  async fetchMembership(creatorId: string, res: Response) {
    try {
      const membership = await this.membership.find({ creatorId });
      if (!membership) {
        return res.status(400).json({
          msg: 'Memberships do not exist yet. Create one or Contact customer support',
        });
      }
      return res.status(200).json({ msg: 'success', payload: membership });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //fetch single membership
  async fetchSingleMembership(
    creatorId: string,
    membershipId: string,
    res: Response,
  ) {
    try {
      const membership = await this.membership.findOne({
        creatorId,
        _id: membershipId,
      });
      if (!membership) {
        return res.status(400).json({
          msg: 'Membership does not exist yet. Create one or Contact customer support',
        });
      }
      return res.status(200).json({ msg: 'success', payload: membership });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //update membership
  async updateMembership(
    body: updateMembershipDTO,
    req: Request,
    res: Response,
  ) {
    try {
      //require memberIdnow
      const result = await jwtIsValid(req.signedCookies.accessToken);

      // console.log(result._id, body?.creatorId);
      if (result?._id !== body?.creatorId) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'forbidden request' });
      }
      if (!body?.creatorId || !body?.membershipId) {
        return res
          .status(400)
          .json({ msg: 'Please provide creatorId and membershipId' });
      }
      const { chargeFrequencyUnit, chargeFrequencyValue } = body;
      let charge_frequency_MS: number = 0;
      let membership;
      if (chargeFrequencyUnit && chargeFrequencyUnit) {
        if (chargeFrequencyUnit === 'days') {
          charge_frequency_MS =
            Number(chargeFrequencyValue) * 24 * 60 * 60 * 1000;
        }
        if (chargeFrequencyUnit === 'weeks') {
          charge_frequency_MS =
            Number(chargeFrequencyValue) * 7 * 24 * 60 * 60 * 1000;
        }
        if (chargeFrequencyUnit === 'months') {
          charge_frequency_MS =
            Number(chargeFrequencyValue) * 30 * 24 * 60 * 60 * 1000;
        }
        membership = await this.membership.findOneAndUpdate(
          { creatorId: body?.creatorId, _id: body?.membershipId },
          { $set: { ...body, charge_frequency_MS } },
          { new: true },
        );
      } else {
        membership = await this.membership.findOneAndUpdate(
          { creatorId: body?.creatorId, _id: body?.membershipId },
          { $set: { ...body } },
          { new: true },
        );
      }
      if (!membership) {
        return res.status(400).json({
          msg: 'Something went wrong. Membership could not be updated. Please try again',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.find({ creatorId: body?.creatorId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //accept membership review
  async acceptMembershipReview(
    reviewerId: string,
    membershipOwnerId: string,
    membershipId: string,
    reviewName: string,
    reviewComment: string,
    req: Request,
    res: Response,
  ) {
    try {
      //require review comment. review name is optional
      if (!reviewComment) {
        return res.status(400).json({ msg: 'Review comment cannot be empty' });
      }
      if (!reviewerId || !membershipOwnerId) {
        return res
          .status(400)
          .json({ msg: 'reviewerId and membershipOwnerId are both required' });
      }
      const result = await jwtIsValid(req.signedCookies.accessToken);

      // console.log(result._id, body?.creatorId);
      // console.log(reviewerId, membershipOwnerId)
      if (reviewerId === membershipOwnerId) {
        return res
          .status(400)
          .json({ msg: 'You cannot leave reviews on your own membership' });
      }

      const membership = await this.membership.findOneAndUpdate(
        { _id: membershipId },
        {
          $push: {
            reviews: {
              name: reviewName || 'Anonymous',
              comment: reviewComment,
            },
          },
        },
        { new: true },
      );
      if (!membership) {
        return res.status(400).json({
          msg: 'Something went wrong. Membership could not be updated. Please try again',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.find({ creatorId: membershipOwnerId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //edit membership review
  async editMembershipReview() {
    try {
    } catch (err) {}
  }

  //delete membership review
  async deleteMembershipReview() {
    try {
    } catch (err) {}
  }

  //delete membership
  async deleteMembership(
    creatorId: string,
    membershipId: string,
    req: Request,
    res: Response,
  ) {
    try {
      const result = await jwtIsValid(req.signedCookies.accessToken);
      // console.log(result._id, body?.creatorId);
      if (result?._id !== creatorId) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'forbidden request' });
      }
      //if not, find the membership and add user
      let deletemembership = await this.membership.findOneAndDelete(
        { creatorId, _id: membershipId },
        { new: true },
      );
      if (!deletemembership) {
        return res.status(400).json({
          msg: 'Something went wrong. New membership could not be delete. Please try again or contact customer support',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.find({ creatorId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //join membership
  async joinMembership(
    creatorId: string,
    membershipId: string,
    userId: string,
    userName: string,
    res: Response,
  ) {
    try {
      //make sure user isn't joining their own membership. Because of course, it makes no sense.
      if (creatorId === userId) {
        return res
          .status(400)
          .json({ msg: 'You cannot join your own membership' });
      }
      //check if user is already part of membership array. Prevent joining if yes
      const userIsAMember = await this.membership.findOne({
        creatorId,
        _id: membershipId,
        members: { $elemMatch: { userId } },
      });
      if (userIsAMember) {
        return res.status(400).json({
          msg: 'You already have an ongoing membership with this user',
        });
      }
      //if user is not already a member, find the membership and add user
      const themembership = await this.membership.findOne({
        _id: membershipId,
      });
      if (!themembership) {
        return res.status(400).json({
          msg: 'This membership may have been deleted. Please refresh the page and try again or contact customer service',
        });
      }
      // console.log(themembership?.charge_frequency_MS)
      let membership = await this.membership.findOneAndUpdate(
        { creatorId, _id: membershipId },
        {
          $push: {
            members: {
              userId,
              userName,
              chargeDate: [
                new Date(
                  Date.now() + Number(themembership?.charge_frequency_MS),
                ),
              ],
            },
          },
        },
        { new: true },
      );
      if (!membership) {
        return res.status(400).json({
          msg: 'Something went wrong. New membership could not be created. Please try again',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.findOne({ _id: membershipId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //leave membership
  async leaveMembership(
    creatorId: string,
    membershipId: string,
    userId: string,
    res: Response,
  ) {
    try {
      //if not, find the membership and add user
      let leavemembership = await this.membership.findOneAndUpdate(
        { creatorId, _id: membershipId },
        { $pull: { members: { userId } } },
        { new: true },
      );
      if (!leavemembership) {
        return res.status(400).json({
          msg: 'Something went wrong. New membership could not be delete. Please try again or contact customer support',
        });
      }
      return res.status(200).json({
        msg: 'success',
        payload: await this.membership.find({ _id: membershipId }),
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
}

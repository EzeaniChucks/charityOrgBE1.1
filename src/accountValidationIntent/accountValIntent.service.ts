import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import { Model } from 'mongoose';
import { PaymentService } from 'src/paymentModule/payment.service';
import { sendEmail } from 'src/util';

@Injectable()
export class AccountValIntentService {
  constructor(
    @InjectModel('accountVallIntent') private accountValIntent: Model<any>,
    @InjectModel('CharityAppUsers') private user: Model<any>,
    private readonly paymentservice: PaymentService,
  ) {}

  async createAccountValIntent({
    userId,
    amount,
    currency,
    res,
  }: {
    userId: string;
    amount: number | string;
    currency: string;
    res: Response;
  }) {
    try {
      const admin = await this.user.findOne({
        _id: '655231c77bd194ba99e67827',
      });

      const userIsverified = await this.user.findOne({ _id: userId });

      if (!userIsverified) {
        return res.status(400).json({
          msg: 'Your details does not exist on our database. Contact customer support or register on the sign page',
          payload: 'unsuccessful',
        });
      }

      const isVerified = userIsverified?.accountBankVerified;

      if (isVerified) {
        return res.status(400).json({
          msg: 'Your identity is yet to be verified. Contact customer support with this error message',
          payload: 'unsuccessful',
        });
      }

      const accountBank = userIsverified?.accountBankCode;
      const accountNumber = userIsverified?.accountNumber;
      const accountBankName = userIsverified?.accountBank;
      const userName = `${userIsverified?.firstName} ${userIsverified?.lastName}`;

      const WI = await this.accountValIntent.create({
        userId,
        userName,
        amount,
        currency,
        accountBank,
        accountNumber,
        accountBankName,
      });

      if (!WI) {
        return res.status(400).json({
          msg: 'Something went wrong creating intent. Please contact support with this error message',
          payload: 'unsuccessful',
        });
      }

      await sendEmail(
        admin,
        `
            <div>
                <h4>New Withdrawal Intent</h4>
                <h5>A user, ${userName}, wishes to make a withdrawal</h5>
                <h6>Amount: ${currency} ${amount}</h6>
                <h6>User wallet balance (in concerned currency): ${currency} ${amount}</h6>
                <br/>
                <button><a style='padding:5px; border-radius:10px;' href='${process.env.FRONT_END_CONNECTION}/adminDashboard/${admin._id}/withdrawalIntents?userId=${userIsverified._id}'>View Intent</a></button>
            </div>
        `,
      );

      return res.status(200).json({
        msg: 'successful',
        payload:
          'Withdrawal intent received. Admin will respond to your request shortly. If you do not hear from us within an hour, please contact customer support',
      });
    } catch (err) {
      return res.status(400).json({
        msg: 'unsuccessful',
        payload: err?.message,
      });
    }
  }

  // async cancelaccountVallIntent({
  //   userId,
  //   accountValidationIntentId,
  //   cancellation_reason,
  //   res,
  // }: {
  //   userId: string;
  //   accountValidationIntentId: string;
  //   cancellation_reason: string;
  //   res: Response;
  // }) {
  //   try {
  //     const admin = await this.user.findOne({
  //       _id: process.env.ADMIN_ID,
  //     });

  //     const userIsverified = await this.user.findOne({ _id: userId });

  //     if (!userIsverified) {
  //       return res.status(400).json({
  //         msg: 'Your details does not exist on our database. Contact customer support or register on the sign page',
  //         payload: 'unsuccessful',
  //       });
  //     }

  //     const userName = `${userIsverified?.firstName} ${userIsverified?.lastName}`;

  //     const withdrawalIntent = await this.accountValIntent.findOneAndUpdate({
  //       _id: accountValidationIntentId,
  //     });

  //     if (!withdrawalIntent) {
  //       return res.status(400).json({
  //         msg: 'This intent is non-existent. Please contact customer support with this particular error message',
  //         payload: 'unsuccessful',
  //       });
  //     }
  //     if (withdrawalIntent?.userId.toString() !== userId) {
  //       return res.status(400).json({
  //         msg: 'Unathorized. Please contact customer support with this particular error message',
  //         payload: 'unsuccessful',
  //       });
  //     }

  //     const WI = await this.accountValIntent.findOneAndUpdate(
  //       {
  //         _id: accountValidationIntentId,
  //       },
  //       {
  //         $set: {
  //           cancellationReason: cancellation_reason,
  //           intentStatus: 'cancelled',
  //         },
  //       },
  //       { new: true },
  //     );

  //     if (!WI) {
  //       return res.status(400).json({
  //         msg: 'Something went wrong cancelling intent. Please contact support with this error message',
  //         payload: 'unsuccessful',
  //       });
  //     }

  //     //send mail to admin informing them of user withdrawal intent cancellation
  //     await sendEmail(
  //       admin,
  //       `
  //           <div>
  //               <h4>Withdrawal Intent Cancellation</h4>
  //               <h5>A user, ${userName}, has just cancelled their withdrawal</h5>
  //               <h5>Reason: ${WI?.cancellationReason || 'not specified'}</h5>
  //               <h6>Amount: ${WI?.currency} ${WI?.amount}</h6>
  //               <h6>Amount: ${WI?.currency} ${WI?.amount}</h6>
  //               <br/>
  //               <button>
  //                   <a
  //                       style='padding:5px; border-radius:10px;'
  //                       href='${
  //                         process.env.FRONT_END_CONNECTION
  //                       }/adminDashboard/${
  //         admin._id
  //       }/withdrawalIntents?userId=${userIsverified._id}'
  //                   >
  //                       View Intent
  //                   </a>
  //               </button>
  //           </div>
  //       `,
  //     );

  //     return res.status(200).json({
  //       msg: 'successful',
  //       payload:
  //         'Withdrawal intent successfully cancelled. If you have complaints or suggestions, please reach out to customer support',
  //     });
  //   } catch (err) {
  //     return res.status(400).json({
  //       msg: 'unsuccessful',
  //       payload: err?.message,
  //     });
  //   }
  // }
}

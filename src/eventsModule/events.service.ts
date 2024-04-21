import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { readFile, unlink } from 'fs';
import { Model } from 'mongoose';
import * as fs from 'fs';
import mongoose from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.services';
import { EventDetailsServices } from 'src/eventDetailsModule/eventDetails.service';
import { PaymentService } from 'src/paymentModule/payment.service';
import { Cron, CronExpression } from '@nestjs/schedule/dist';
import { AuthService } from 'src/authModule/auth.service';
import { Request, Response } from 'express';
import * as request from 'request';
import { fork } from 'child_process';
import { promisify } from 'util';
import { NotifService } from 'src/notificationModule/notifService';

// const asyncFork = promisify(fork);
@Injectable()
export class EventsServices {
  constructor(
    @InjectModel('events') public event: Model<any>,
    @InjectModel('eventBackUp') public eventBackUp: Model<any>,
    @InjectModel('CharityAppUsers') private user: Model<any>,
    @InjectModel('eventDetails') private eventDetails: Model<any>,
    @InjectModel('recurrentPayment') private recurrentPayment: Model<any>,
    @InjectModel('wallet') private wallet: Model<any>,
    @InjectModel('walletTransaction') private walletTransaction: Model<any>,
    @InjectModel('transaction') private transaction: Model<any>,
    private notifservice: NotifService,
    private cloudinary: CloudinaryService,
    private Wallet: PaymentService,
    private authservice: AuthService,
  ) {}

  //CRONJOB
  //charity recurring payment with card/bank transfer
  async recurrentPaymentWithCardForCharitiesCron(res: Response) {
    try {
      //first find recurrent payment with all the right parameters
      const card_recurrence = await this.recurrentPayment.find({
        type: 'charity',
        payment_medium: 'card',
        frequencyfactor: {
          $gt: 0, //right code is $gt
        },
        renewalDateMicroSec: {
          $lte: new Date().valueOf(), //right code is $lte
        },
      });

      // console.log('start');

      //WORKFLOW
      //loop through the above collected repayment array
      //make paystack call that charges each user's authorization code for previous card payments
      //reward concerned charity with value
      //adjust the recurrentPayment plan to show that user has just paid. E.g, extend next charge date if relevant
      //create transaction history
      for (let eachrecurrence of card_recurrence) {
        const url = `https://api.paystack.co/transaction/charge_authorization`;
        const options = {
          method: 'POST',
          url,
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'content-type': 'application/json',
            'cache-control': 'no-cache',
          },
          body: {
            authorization_code:
              eachrecurrence?.card_authorization?.authorization_code,
            email: eachrecurrence?.card_authorization?.email,
            amount: eachrecurrence?.amount * 100,
          },
          json: true,
        };

        request(options, async (error: any, response: any) => {
          if (error) {
            return res
              .status(400)
              .json({ msg: `Something went wrong with Paystack's API` });
          }

          const result = response?.body;
          if (result?.status === 'error') {
            console.log({ msg: result?.message || 'Something went wrong' });
          }
          // console.log('result:', result);
          if (result?.data?.status === 'success') {
            try {
              const {
                eventId,
                senderId: userId,
                senderName,
                amount,
                currency,
              } = eachrecurrence;

              const user = await this.user.findOne({ _id: userId });
              const userName = user
                ? `${user?.firstName} ${user?.lastName}`
                : 'Anonymous';
              const event = await this.event.findOneAndUpdate(
                { _id: eventId },
                {
                  $push: {
                    contributors: {
                      userId,
                      name: senderName || userName,
                      actualName: senderName || userName,
                      note: `Recurrent payment received from ${
                        senderName || 'Anonymous'
                      }`,
                      amount,
                      date: Date.now(),
                    },
                  },
                  $inc: {
                    totalEventAmount: amount,
                  },
                },
                { new: true },
              );

              eachrecurrence.frequencyfactor--;

              eachrecurrence.renewalDateMicroSec +=
                eachrecurrence.frequencyDateMilliseconds;
              if (!eachrecurrence.senderName) {
                eachrecurrence.senderName = userName;
              }
              await eachrecurrence.save();
              // console.log(eachrecurrence)
              const id = `${Math.random() * 1000}${Date.now()}`;
              const status = 'successful';
              const description = 'Wallet Withdraw';
              const narration = 'In-app Transaction: Charity funding';
              const tx_ref = `charityapp${Date.now()}${Math.random()}`;
              const customer = {
                email: eachrecurrence?.card_authorization?.email,
                phone_number: user?.phoneNumber,
                name: userName,
              };

              await this.Wallet.createTransaction(
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
                'paystack',
                null,
                null,
                {
                  recipientId: `${eventId}`,
                  recipientName: `charity&${event?.eventName}`,
                },
              );
            } catch (err) {
              console.log({
                msg: `error from charity wallet recur payment: ${err?.message}`,
              });
            }
          }
        });
      }

      res.status(200).json({ msg: 'success' });
      // console.log('finish');
    } catch (err) {
      console.log({
        msg: `error from charity wallet recur payment: ${err.message}`,
      });
    }
  }

  //CRON JOB
  //charity recurring payment with wallet
  async recurrentPaymentWithWalletForCharitiesCron(res: Response) {
    try {
      let charity_wallet_recurrence = await this.recurrentPayment.find({
        type: 'charity',
        payment_medium: 'wallet',
        frequencyfactor: {
          $gt: 0, //right code is $gt
        },
        renewalDateMicroSec: {
          $lte: new Date().valueOf(), //right code is $lte
        },
      });

      console.log(charity_wallet_recurrence);
      console.log('res sent');
      //send response header to cron request client and continue code below in the server background
      res.status(200).json({ msg: 'success' });

      //WORKFLOW
      //loop through the above collected wallet-repayment array
      //make call that charges each user's in-app wallet.
      //Special note: For user to have used wallet to pay previously, they must from logged in on client.
      //Visitors can't use this feature for obvios reasons. They have no in-app wallet
      //Next, reward concerned charity with value (following wallet deduction)
      //adjust the recurrentPayment plan to show that user has just paid. E.g, extend next charge date if relevant
      //create transaction history
      console.log('start');
      for (let eachrecurrence of charity_wallet_recurrence) {
        try {
          const {
            eventId,
            senderId: userId,
            amount,
            currency,
            senderName,
          } = eachrecurrence;
          const user = await this.user.findOne({ _id: userId });
          const userName = user
            ? `${user?.firstName} ${user?.lastName}`
            : 'Anonymous';

          await this.Wallet.validateUserWallet(userId);
          await this.Wallet.decreaseWallet(userId, amount, currency);
          const status = 'successful';
          const description = 'Wallet Withdraw';
          const narration = 'In-app Transaction: Charity funding';
          const tx_ref = `charityapp${Date.now()}${Math.random()}`;
          const customer = {
            email: user?.email,
            phone_number: user?.phoneNumber,
            name: userName,
          };

          await this.event.findOneAndUpdate(
            { _id: eventId },
            {
              $push: {
                contributors: {
                  userId,
                  name: senderName || 'Anonymous',
                  actualName: senderName || 'Anonymous',
                  note: `Recurrent payment received from ${
                    user ? senderName : 'Anonymous'
                  }`,
                  amount,
                  date: Date.now(),
                },
              },
              $inc: {
                totalEventAmount: amount,
              },
            },
            { new: true },
          );

          const id = `${Math.random() * 1000}${Date.now()}`;

          await this.Wallet.createWalletTransactions(
            user._id,
            false,
            status,
            currency,
            amount,
            description,
            narration,
          );

          await this.Wallet.createTransaction(
            user._id,
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
          eachrecurrence.frequencyfactor--;
          eachrecurrence.renewalDateMicroSec += Number(
            eachrecurrence?.frequencyDateMilliseconds,
          );
          if (!eachrecurrence?.senderName) {
            eachrecurrence.senderName = userName;
          }
          await eachrecurrence.save();
        } catch (err) {
          console.log({
            msg: `error from charity wallet recur payment: ${err.message}`,
          });
        }
      }
      console.log('finish');
    } catch (err) {
      console.log({
        msg: `error from charity wallet recur payment: ${err.message}`,
      });
    }
  }

  async createEvent(imagefile: Express.Multer.File, body: any, res: Response) {
    try {
      const newevent = await this.event.create(body);
      if (imagefile) {
        const result = await this.cloudinary.uploadImage(imagefile?.buffer);
        newevent.eventImageName = result?.secure_url;
      }
      await newevent.save();
      return res.status(200).json({ msg: 'Success', event: newevent });
    } catch (err) {
      if (err.message.includes('dup key: { eventName:')) {
        return res.status(500).json({
          msg: 'Event Name already exists. Please choose a different name for your event',
        });
      }
      return res.status(500).json({ msg: err?.message });
    }
  }

  async addCommentOnEvent(
    eventId: string,
    userName: string,
    comment: string,
    res: Response,
  ) {
    try {
      let newCommentEent = await this.event.findOneAndUpdate(
        { _id: eventId },
        { $push: { commenters: { userName, comment } } },
        { new: true },
      );
      return res.status(200).json({ msg: 'success', payload: newCommentEent });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }
  async editCommentOnEvent(
    eventId: string,
    commentId: string,
    newComment: string,
    res: Response,
  ) {
    try {
      let editedCommentEvent = await this.event.findOneAndUpdate(
        { _id: eventId, 'commenters._id': commentId },
        { $set: { 'commenters.$.comment': newComment } },
        { new: true },
      );
      return res
        .status(200)
        .json({ msg: 'success', payload: editedCommentEvent });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }
  async deleteCommentOnEvent(
    eventId: string,
    commentId: string,
    res: Response,
  ) {
    try {
      let deletedCommentEvent = await this.event.findOneAndUpdate(
        { _id: eventId },
        { $pull: { commenters: { _id: commentId } } },
        { new: true },
      );
      return res
        .status(200)
        .json({ msg: 'success', payload: deletedCommentEvent });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }
  //one-time wallet payment
  async createOneTimePayment(
    userId: string,
    userName: string,
    actualName: string,
    eventId: string,
    note: string,
    depositAmount: string | number,
    res: Response,
  ) {
    try {
      //check credentials
      if (!userId || !userName) {
        return res.status(400).json({ msg: 'Provide complete credentials' });
      }
      //pull out event and event details object
      let event = await this.event.findOne({ _id: eventId });
      const user = await this.user.findOne({ _id: userId });

      if (!event) {
        return res.status(400).json({
          msg: 'Event detail or event does not seem to exist. Contact customer support',
        });
      }
      const eventCreator = await this.user.findOne({ _id: event?.creatorId });

      await this.Wallet.validateUserWallet(userId);

      //check if the user didn't deposit zero currency
      if (Number(depositAmount) <= 0) {
        return res.status(400).json({ msg: 'Amount cannot be zero or less' });
      }

      //add contributor and increase overall event contribution by amount
      // but before then, confirm if wallet has enough funds in currency specified
      const wallet = await this.wallet.findOne({ userId });

      //first declare a function for finding actual currency within wallet
      let particularCurrency = await wallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === event?.currency;
      });
      //then check currency sufficiency
      const walletBalance = Number(particularCurrency?.balance);
      if (walletBalance < Number(depositAmount)) {
        return res.status(400).json({
          msg: `Insufficient funds. Kindly fund your wallet with this event's currency ${event?.currency} or reduce deposit amount`,
        });
      }
      if (!depositAmount) {
        return res.status(400).json({
          msg: 'Provide deposit amount',
        });
      }
      event = await this.event.findOneAndUpdate(
        { _id: eventId },
        {
          $push: {
            contributors: {
              userId,
              name: userName,
              actualName,
              note,
              amount: depositAmount,
              date: Date.now(),
            },
          },
          $inc: {
            totalEventAmount: depositAmount,
          },
        },
        { new: true },
      );

      //decrease donor's wallet
      await this.Wallet.decreaseWallet(userId, depositAmount, event?.currency);

      //get creator wallet for creating event increase record
      const creatorWallet = await this.wallet.findOne({
        userId: eventCreator._id,
      });

      //create event donation increase percentage on user's wallet
      const particularcurrency = creatorWallet?.currencies?.find(
        (cur: any) => cur?.currency_type === event?.currency,
      );

      let total_income_from_events_percent_inc =
        ((Number(particularcurrency?.total_income_from_events) -
          Number(depositAmount)) *
          100) /
        Number(particularcurrency?.total_income_from_events);

      await this.wallet.findOneAndUpdate(
        {
          userId: eventCreator?._id,
          'currencies.currency_type': event?.currency,
        },
        {
          $inc: {
            'currencies.$.total_income_from_events': depositAmount,
          },
          $set: {
            'currencies.$.total_income_from_events_percent_inc':
              total_income_from_events_percent_inc,
          },
        },
      );
      // total_income_from_events: { type: Number, default: 0 },
      // total_income_from_events_percent_inc: { type: Number, default: 0 },
      const status = 'successful';
      const description = 'Wallet Withdraw: Charity funding';
      const narration = 'Wallet Withdraw: Charity Funding';
      const tx_ref = `charityapp${Date.now()}${Math.random()}`;
      const customer = {
        email: user?.email,
        phone_number: user?.phoneNumber,
        name: `${user?.firstName} ${user?.lastName}`,
      };
      const id = `${Math.random() * 1000}${Date.now()}`;
      let currency = event?.currency;

      await this.Wallet.createWalletTransactions(
        user._id,
        false,
        status,
        currency,
        depositAmount,
        description,
        narration,
      );

      await this.Wallet.createTransaction(
        user._id,
        false,
        id,
        status,
        currency,
        depositAmount,
        customer,
        tx_ref,
        description,
        narration,
        'inapp_event',
        null,
        null,
        {
          recipientId: eventId,
          recipientName: `charity&${event?.eventName}`,
        },
      );

      //create transaction record for event creator
      if (eventCreator) {
        await this.Wallet.createTransaction(
          eventCreator._id,
          true,
          id,
          status,
          currency,
          depositAmount,
          customer,
          tx_ref,
          `event donation: your "${event.eventName}" received ${currency}${depositAmount}`,
          `event donation`,
          'inapp_event',
          null,
          {
            senderId: user?._id,
            senderName: `${user?.firstName} ${user?.lastName}`,
          },
        );
      }
      //
      return res.status(200).json({ msg: 'success', payload: event });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //recurrent wallet payment
  async createWalletRecurrentPaymentToCharity({
    userId,
    actualName,
    eventId,
    amount,
    note,
    frequencyDateValue,
    frequencyDateUnit,
    renewalEndDateMs,
    res,
  }: {
    userId: string;
    actualName: string;
    amount: number;
    eventId: string;
    note: string;
    frequencyDateValue: number;
    frequencyDateUnit: 'hours' | 'days' | 'weeks' | 'months';
    renewalEndDateMs: number;
    res: Response;
  }) {
    //check that client passed the right date units
    if (
      frequencyDateUnit !== 'hours' &&
      frequencyDateUnit !== 'days' &&
      frequencyDateUnit !== 'weeks' &&
      frequencyDateUnit !== 'months'
    ) {
      return res
        .status(400)
        .json({ msg: 'Renewal date unit can only be days, weeks or months' });
    }
    //use frequency factor to detemine next withdrawal date, then reduce frq factor by 1.
    //if frq factor is ZERO, do nothing else

    let frequencyDateMilliseconds: number;
    if (frequencyDateUnit === 'hours') {
      frequencyDateMilliseconds = Number(frequencyDateValue) * 60 * 60 * 1000;
    }

    if (frequencyDateUnit === 'days') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 24 * 60 * 60 * 1000;
    }

    if (frequencyDateUnit === 'weeks') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 7 * 24 * 60 * 60 * 1000;
    }

    if (frequencyDateUnit === 'months') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 30 * 24 * 60 * 60 * 1000;
    }

    //calculate frequency factor
    let frequencyfactor =
      (new Date(renewalEndDateMs).valueOf() - Date.now()) /
      frequencyDateMilliseconds;

    frequencyfactor = Number(frequencyfactor.toFixed(0));
    console.log(frequencyfactor);
    try {
      //first execute the transfer from user wallet to event deposit
      //check if user has a wallet. if not, autocreate one.
      //pull out event and event details object
      let event = await this.event.findOne({ _id: eventId });
      const user = await this.user.findOne({ _id: userId });

      const eventCreator = await this.user.findOne({ _id: event?.creatorId });

      await this.Wallet.validateUserWallet(userId);

      // confirm if wallet has enough funds in wallet currency
      const wallet = await this.wallet.findOne({ userId });

      //first declare a function for finding actual currency within wallet
      let particularCurrency = await wallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === event?.currency;
      });
      //then check if wallet currency is enough
      const walletBalance = Number(particularCurrency?.balance);
      if (walletBalance < Number(amount)) {
        return res
          .status(400)
          .json(
            `Insufficient funds. Kindly fund your wallet with this event's currency ${event?.currency} or reduce deposit amount`,
          );
      }
      if (!amount) {
        return res.status(400).json({
          msg: 'Provide deposit amount',
        });
      }
      event = await this.event.findOneAndUpdate(
        { _id: eventId },
        {
          $push: {
            contributors: {
              userId,
              name: `${user?.firstName} ${user?.lastName}`,
              actualName,
              note,
              amount: amount,
              date: Date.now(),
            },
          },
          $inc: {
            totalEventAmount: amount,
          },
        },
        { new: true },
      );
      await this.Wallet.decreaseWallet(userId, amount, event?.currency);
      const status = 'successful';
      const description = 'Wallet Withdraw';
      const narration = 'In-app Transaction: Charity funding';
      const tx_ref = `charityapp${Date.now()}${Math.random()}`;
      const customer = {
        email: user?.email,
        phone_number: user?.phoneNumber,
        name: `${user?.firstName} ${user?.lastName}`,
      };
      const id = `${Math.random() * 1000}${Date.now()}`;
      const { currency } = event;
      await this.Wallet.createWalletTransactions(
        user._id,
        false,
        status,
        currency,
        amount,
        description,
        narration,
      );

      await this.Wallet.createTransaction(
        user._id,
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

      //get creator wallet for creating event increase record
      const creatorWallet = await this.wallet.findOne({
        userId: eventCreator._id,
      });

      //create event donation increase percentage on user's wallet
      const particularcurrency = creatorWallet?.currencies?.find(
        (cur: any) => cur?.currency_type === event?.currency,
      );

      let total_income_from_events_percent_inc =
        ((Number(particularcurrency?.total_income_from_events) -
          Number(amount)) *
          100) /
        Number(particularcurrency?.total_income_from_events);

      await this.wallet.findOneAndUpdate(
        {
          userId: eventCreator?._id,
          'currencies.currency_type': event?.currency,
        },
        {
          $inc: {
            'currencies.$.total_income_from_events': amount,
          },
          $set: {
            'currencies.$.total_income_from_events_percent_inc':
              total_income_from_events_percent_inc,
          },
        },
      );
      //reduce frequencyfactor by 1, then pass info to recurrenpayment
      //create recurrent payment object

      await this.recurrentPayment.create({
        senderId: userId,
        senderName: actualName || 'Anonymous',
        eventId,
        amount,
        currency: event?.currency,
        frequencyfactor: renewalEndDateMs
          ? Number(frequencyfactor) - 1
          : Infinity,
        frequencyDateMilliseconds,
        renewalDateMicroSec: Date.now() + frequencyDateMilliseconds,
        type: 'charity',
        payment_medium: 'wallet', //enum: card, wallet
      });

      return res.status(200).json({
        msg: 'success. Donation successful. Recurrent payment successfully added',
        payload: event,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  //card/transfer one-time charity payment response
  async payStackCharityPaymentResponse(reference: string, res: Response) {
    //for both card and bank payments. All that is required is the uniquely generated transaction reference
    try {
      const url = `https://api.paystack.co/transaction/verify/${reference}`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }

        const result = response.body;
        // console.log(result);
        if (result?.status === 'error') {
          return res.status(400).json({
            msg:
              result?.message ||
              'There was an error from paystack. Please try again.',
          });
        }
        if (result?.data?.status === 'success') {
          const {
            id,
            status,
            amount,
            reference: ref,
            currency,
            metadata,
          } = result.data;

          const {
            eventId,
            userId,
            userName,
            actualName,
            note,
            email,
            phone_number,
          } = metadata?.customer;
          const transactionExists = await this.transaction.findOne({
            transactionId: id,
          });

          if (transactionExists) {
            return res.status(400).json({
              msg: 'Transaction already handled',
            });
          }

          // await this.validateUserWallet(user._id);
          const event = await this.event.findOneAndUpdate(
            { _id: eventId },
            {
              $push: {
                contributors: {
                  userId,
                  name: userName,
                  actualName,
                  note,
                  amount: Number(amount) / 100,
                  date: Date.now(),
                },
              },
              $inc: {
                totalEventAmount: Number(amount) / 100,
              },
            },
            { new: true },
          );

          // const realamount = amount - Number(chargeAmount);
          if (userId) {
            // await this.Wallet.createWalletTransactions(
            //   userId,
            //   false,
            //   status,
            //   currency,
            //   Number(amount) / 100,
            //   'Bank Withdraw: Charity Funding',
            //   `Charity funding with ${currency} ${amount / 100}`,
            //   'paystack',
            // );

            await this.Wallet.createTransaction(
              userId,
              false,
              id,
              status,
              currency,
              Number(amount) / 100,
              {
                name: actualName,
                email: email,
                phone_number,
              },
              ref,
              'Bank Withdraw: Charity Funding',
              `Charity funding with ${currency} ${amount / 100}`,
              'paystack',
              null,
              null,
              {
                recipientId: eventId,
                recipientName: `charity&${event?.eventName}`,
              },
            );
          }

          // return { msg: 'Wallet funded successfully', balance: result };
          return res.status(200).json({
            msg: 'successful',
            payload: event,
          });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //card recurrent charity payment response
  async payStackRecurrentCharityPaymentResponse({
    cardPaymentRef,
    userId,
    email,
    actualName,
    eventId,
    amount,
    note,
    frequencyDateValue,
    frequencyDateUnit,
    renewalEndDateMs,
    res,
  }: {
    cardPaymentRef: string;
    userId: string;
    email: string;
    actualName: string;
    amount: number;
    eventId: string;
    note: string;
    frequencyDateValue: number;
    frequencyDateUnit: 'hours' | 'days' | 'weeks' | 'months';
    renewalEndDateMs: number;
    res: Response;
  }) {
    //check that client passed the right date units
    if (
      frequencyDateUnit !== 'hours' &&
      frequencyDateUnit !== 'days' &&
      frequencyDateUnit !== 'weeks' &&
      frequencyDateUnit !== 'months'
    ) {
      return res.status(400).json({
        msg: "Renewal date unit should be 'days', 'weeks' or 'months'",
      });
    }
    //use frequency factor to detemine next withdrawal date, then reduce frq factor by 1.
    //if frq factor is ZERO, do nothing else

    let frequencyDateMilliseconds: number;
    if (frequencyDateUnit === 'hours') {
      frequencyDateMilliseconds = Number(frequencyDateValue) * 60 * 60 * 1000;
    }
    if (frequencyDateUnit === 'days') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 24 * 60 * 60 * 1000;
    }
    if (frequencyDateUnit === 'weeks') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 7 * 24 * 60 * 60 * 1000;
    }
    if (frequencyDateUnit === 'months') {
      frequencyDateMilliseconds =
        Number(frequencyDateValue) * 30 * 24 * 60 * 60 * 1000;
    }
    //calculate frequency factor
    let frequencyfactor = //NaN, if renewalEndDate isn't set
      (new Date(renewalEndDateMs).valueOf() - Date.now()) /
      frequencyDateMilliseconds;

    frequencyfactor = Number(frequencyfactor.toFixed(0));

    // console.log('frequencyfactor', frequencyfactor);

    try {
      if (!amount) {
        return res.status(400).json({
          msg: 'Provide donation amount',
        });
      }

      const url = `https://api.paystack.co/transaction/verify/${cardPaymentRef}`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }

        const result = response?.body;
        if (result?.status === 'error') {
          return res.status(400).json({
            msg: 'No bank is found for this particular country code',
          });
        }
        // console.log(result);
        if (result?.data?.status === 'success') {
          const {
            id,
            status,
            amount: paystackamount,
            currency,
            metadata,
            customer,
            authorization,
          } = result.data;
          // console.log(paystackamount);
          try {
            const transactionExists = await this.transaction.findOne({
              transactionId: id,
            });
            if (transactionExists) {
              throw new ForbiddenException({
                msg: 'Transaction already exists',
              });
            }
            const idForVisitor = new mongoose.Types.ObjectId();

            const event = await this.event.findOneAndUpdate(
              { _id: eventId },
              {
                $push: {
                  contributors: {
                    userId: userId ? userId : idForVisitor,
                    name: actualName,
                    actualName,
                    note,
                    amount: Number(paystackamount) / 100,
                    date: Date.now(),
                  },
                },
                $inc: {
                  totalEventAmount: Number(paystackamount) / 100,
                },
              },
              { new: true },
            );

            // const realamount = amount - Number(chargeAmount);

            //create transaction for sender
            await this.Wallet.createTransaction(
              userId ? userId : idForVisitor,
              false,
              id,
              status,
              currency,
              Number(amount) / 100,
              {
                name: actualName,
                email: email,
                phone_number: metadata?.customer?.phone_number,
              },
              cardPaymentRef,
              'Charity recurrent payment',
              'Bank withdrawal proccessed',
              'paystack',
              null,
              null,
              {
                recipientId: eventId,
                recipientName: `charity&${event?.eventName}`,
              },
            );

            // create credit transaction for recipient
            await this.Wallet.createTransaction(
              event?.creatorId,
              true,
              id,
              status,
              currency,
              Number(amount) / 100,
              {
                name: actualName,
                email: email,
                phone_number: metadata?.customer?.phone_number,
              },
              cardPaymentRef,
              'Charity recurrent payment',
              'Bank withdrawal proccessed',
              'paystack',
              null,
              { senderId: userId, senderName: `${actualName}` },
            );

            //reduce frequencyfactor by 1, then pass info to recurrenpayment
            //create recurrent payment object
            await this.recurrentPayment.create({
              senderId: userId ? userId : idForVisitor,
              senderName: actualName || 'Anonymous',
              eventId,
              amount: Number(paystackamount) / 100,
              currency: event?.currency,
              frequencyfactor: renewalEndDateMs
                ? Number(frequencyfactor) - 1
                : Infinity,
              frequencyDateMilliseconds,
              renewalDateMicroSec: Date.now() + frequencyDateMilliseconds,
              type: 'charity',
              payment_medium: 'card', //enum: card, wallet
              card_authorization: { ...authorization, email },
            });

            return res.status(200).json({
              msg: 'success. Donation successful. Recurrent payment successfully added',
              payload: event,
            });
          } catch (err) {
            return res.status(500).json({ msg: err?.message });
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async createOneTimePledge(
    userId: string,
    userName: string,
    eventId: string,
    pledge_description: string,
    redemption_date: Date,
    pledger_email: string,
    res: Response,
  ) {
    try {
      //check credentials
      if (!userId || !userName) {
        return res.status(400).json({ msg: 'Provide complete credentials' });
      }
      //pull out event and event details object
      let event = await this.event.findOne({ _id: eventId });
      const user = await this.user.findOne({ _id: userId });
      if (!event) {
        return res.status(400).json({
          msg: 'Event detail or event does not seem to exist. Contact customer support',
        });
      }
      //add contributor and increase overall event contribution by amount
      if (!pledge_description || !redemption_date) {
        return res.status(400).json({
          msg: 'Provide pledge description and redemption date',
        });
      }
      event = await this.event.findOneAndUpdate(
        {
          _id: eventId,
        },
        {
          $push: {
            pledgers: {
              userId,
              name: userName,
              pledge_description,
              redemption_date,
              pledger_email,
            },
          },
        },
        { new: true },
      );

      return res.status(200).json({ msg: 'success', payload: event });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async createEscrow({
    amount,
    currency,
    eventId,
    userId,
    res,
  }: {
    amount: number;
    eventId: string;
    currency: string;
    userId: string;
    res: Response;
  }) {
    try {
      if (Number(amount) === 0) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: 'Amount cannot be zero. Enter a higher figure',
        });
      }
      const event = await this.event.findOne({ _id: eventId });

      if (!event) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'No charity with this id exists. Contact customer support with this error message',
        });
      }

      //check if escrow creator is also event creator, which shouldn't be.
      if (event?.creatorId?.toString() === userId) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: 'You cannot create an escrow on your own event',
        });
      }

      //check if the user has an ongoing escrow.
      const unresolvedEscrowExists = await this.event.findOne({
        _id: eventId,
        'escrow.appointer.userId': userId,
        'escrow.appointer.has_paid': false,
      });

      if (unresolvedEscrowExists) {
        let existingEscrowId: string;
        for (let x = 0; x < unresolvedEscrowExists?.escrow?.length; x++) {
          if (
            unresolvedEscrowExists?.escrow[x]?.appointer?.userId?.toString() ===
              userId &&
            unresolvedEscrowExists?.escrow[x]?.appointer?.has_paid === false
          ) {
            existingEscrowId = unresolvedEscrowExists?.escrow[x]?._id;
            break;
          }
        }
        return res.status(400).json({
          msg: 'Unsuccessful. You already have an active escrow',
          payload: existingEscrowId,
        });
      }
      //if all is good, create a new escrow on the charity event,
      //then push event creator Id and escrow creator Id into allPaticipants array

      const newescrow = await this.event.findByIdAndUpdate(
        { _id: eventId },
        {
          $push: {
            escrow: {
              appointee: {},
              appointer: {
                userId,
                accepted: false,
                money_value_willing_to_raise: amount,
                money_currency_willing_to_raise: currency,
                has_paid: false,
              },
              allParticipants: [userId, event?.creatorId],
              eventName: event?.eventName,
            },
          },
        },
        { new: true },
      );
      if (!newescrow) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Escrow could not be created. Try again or contact customer support',
        });
      }
      let newEscrowId: string =
        newescrow?.escrow[newescrow?.escrow?.length - 1]?._id?.toString();

      //send notif to event creator
      await this.notifservice.logSingleNotification(
        `A user has created an escrow on your event: ${newescrow?.eventName}.`,
        newescrow.creatorId,
        userId,
        `/${eventId}/${newescrow?.currency}/amount/${newEscrowId}`,
        `escrow_creation/${newescrow?.eventName || 'Event Name'}`,
      );

      return res.status(200).json({ msg: 'successful', payload: newEscrowId });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //stop here for documentation
  async fetchAllEscrow({
    eventId,
    userId,
    res,
  }: {
    eventId: string;
    userId: string;
    res: Response;
  }) {
    try {
      const event = await this.event.findOne({ _id: eventId });
      if (!event) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Charity could not be found or does not exist. Contact customer support for assistance',
        });
      }
      const escrow = event.escrow.filter((eachEscrow: any) => {
        return eachEscrow?.appointer.userId.toString() === userId;
      });
      if (escrow.length === 0) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'You have not created any escrow on this charity yet. Contact customer support for assistance',
        });
      }
      return res.status(200).json({ msg: 'successful', payload: escrow });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchSingleEscrow({
    eventId,
    escrowId,
    res,
  }: {
    eventId: string;
    escrowId: string;
    res: Response;
  }) {
    try {
      const event = await this.event.findOne({ _id: eventId });
      if (!event) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Event could not be found or does not exist. Contact customer support for assistance',
        });
      }

      async function totalPtAndAmountDonated(event: any) {
        // const event = await this.event.findOne({ _id: eventId });
        let amountDonated = event?.escrow.find(
          (eachEscrow: any) => eachEscrow._id.toString() === escrowId,
        )?.appointer?.money_value_willing_to_raise;

        let totalPayout: number = 0;
        event?.escrow
          .find((eachEscrow: any) => eachEscrow._id.toString() === escrowId)
          ?.paymentForm?.map((eachUser: any) => {
            totalPayout = totalPayout + Number(eachUser?.amount_received) || 0;
          });
        return { amountDonated, totalPayout };
      }

      const { totalPayout, amountDonated } = await totalPtAndAmountDonated(
        event,
      );
      // console.log(totalPayout, amountDonated);
      if (totalPayout >= Number(amountDonated)) {
        //in case it has been donw, set escrow paidOut to true
        await this.event.findOneAndUpdate(
          { _id: eventId, 'escrow._id': escrowId },
          {
            $set: {
              'escrow.$.escrowDetails.paidOut': true,
              'escrow.$.appointee.has_disbursed_payment': true,
            },
          },
          { new: true },
        );
      }
      const escrow = event?.escrow.find((eachEscrow: any) => {
        return eachEscrow?._id.toString() === escrowId;
      });
      if (!escrow) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Could not fetch this escrow on this charity yet. Go back and refresh the page. If issue persists, Contact customer support',
        });
      }
      return res.status(200).json({ msg: 'successful', payload: escrow });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async fetchEscrowParticipantsList({
    escrowId,
    eventId,
    res,
  }: {
    escrowId: string;
    eventId: string;
    res: Response;
  }) {
    try {
      const event = await this.event.findOne({ _id: eventId });
      if (!event) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Event could not be found or does not exist. Contact customer support for assistance',
        });
      }
      const escrow = event?.escrow.find((eachEscrow: any) => {
        return eachEscrow?._id.toString() === escrowId;
      });
      if (!escrow) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Could not fetch this escrow on this charity yet. Go back and refresh the page. If issue persists, Contact customer support',
        });
      }
      // console.log(escrow?.allParticipants)
      const user = await this.user
        .find({ _id: { $in: escrow?.allParticipants } })
        .select('_id firstName lastName');
      return res.status(200).json({ msg: 'success', payload: user });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async inviteEscrowAppointee({
    eventId,
    escrowId,
    appointeeId,
    appointerId,
    appointerName,
    res,
  }: {
    eventId: string;
    escrowId: string;
    appointeeId: string;
    appointerId: string;
    appointerName: string;
    res: Response;
  }) {
    try {
      //first check if appointerId exists
      const appointerExists = await this.event.findOne({
        _id: eventId,
        'escrow.appointer.userId': appointerId,
      });
      if (!appointerExists) {
        return res.status(404).json({
          msg: 'unsuccessful',
          payload: 'You are not permitted to perform this action',
        });
      }
      //then check if appointer has paid (and is eligible to invite)
      const appointerHasPaid = await this.event.findOne({
        _id: eventId,
        'escrow.appointer.has_paid': true,
      });
      if (!appointerHasPaid) {
        return res.status(404).json({
          msg: 'unsuccessful',
          payload:
            'You are yet to donate to this escrow. Donation should happen before invitation',
        });
      }

      //make sure event creator is not the same person about to be appointed as third party observer on their own charity
      //I am using the appointerHasPaid object above, since it returns the full event/charity itself
      if (appointerHasPaid?.creatorId.toString() === appointeeId) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'This user owns this charity. You can not appoint charity creators as deciders of escrows on their charities',
        });
      }

      //invite user
      const userIsInvited = await this.event.findOneAndUpdate(
        { _id: eventId, 'escrow._id': escrowId },
        {
          $set: {
            'escrow.$.appointee': {
              userId: appointeeId,
              accepted: false,
              has_disbursed_payment: false,
            },
          },
        },
        { new: true },
      );

      if (!userIsInvited) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'user could not be invited. Please try again, or contact customer support with this error message',
        });
      }

      //send notif to appointee
      await this.notifservice.logSingleNotification(
        `You have been invited by ${appointerName} to decide payment for an event's escrow.`,
        appointeeId,
        appointerId,
        `/${eventId}/${userIsInvited?.currency}/amount/${escrowId}`,
        `escrow_invitation/${userIsInvited?.eventName || 'Event Name'}`,
      );
      return res
        .status(200)
        .json({ msg: 'success', payload: 'Invitation sent' });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async acceptEscrowInvitation({
    eventId,
    escrowId,
    appointeeId,
    appointerId,
    appointeeName,
    eventName,
    res,
  }: {
    eventId: string;
    escrowId: string;
    appointeeId: string;
    appointerId: string;
    appointeeName: string;
    eventName: string;
    res: Response;
  }) {
    try {
      //first check if appointee exists
      const appointeeExists = await this.event.findOne({
        _id: eventId,
        'escrow.appointee.userId': appointeeId,
      });

      if (!appointeeExists) {
        return res.status(404).json({
          msg: 'unsuccessful',
          payload:
            'Something went wrong. Please ask your inviter to resend their invitation',
        });
      }

      //accept invitation
      const userAcceptsInvitation = await this.event.findOneAndUpdate(
        { _id: eventId, 'escrow._id': escrowId },
        {
          $set: {
            'escrow.$.appointee': {
              userId: appointeeId,
              accepted: true,
              has_disbursed_payment: false,
            },
          },
          $push: { 'escrow.$.allParticipants': appointeeId },
        },
        { new: true },
      );

      if (!userAcceptsInvitation) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Invitation could not be accepted. Please try again, or contact customer support with this error message',
        });
      }

      //send notif to appointer
      await this.notifservice.logSingleNotification(
        `${appointeeName} has accepted your invitation to be the decider of your event's escrow. (event name:${eventName}) Click here to view`,
        appointerId,
        appointeeId,
        `/${eventId}/${userAcceptsInvitation?.currency}/amount/${escrowId}`,
        `escrow_acceptance/${userAcceptsInvitation?.eventName || 'Event Name'}`,
      );

      return res
        .status(200)
        .json({ msg: 'success', payload: 'Invitation accepted' });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async declineEscrowInvitation({
    eventId,
    escrowId,
    appointeeId,
    appointerId,
    appointeeName,
    eventName,
    res,
  }: {
    eventId: string;
    escrowId: string;
    appointeeId: string;
    appointerId: string;
    appointeeName: string;
    eventName: string;
    res: Response;
  }) {
    try {
      //first check if appointee exists
      const appointeeExists = await this.event.findOne({
        _id: eventId,
        'escrow.appointee.userId': appointeeId,
      });

      if (!appointeeExists) {
        return res.status(404).json({
          msg: 'unsuccessful',
          payload:
            'Something went wrong. Please ask your inviter to resend their invitation',
        });
      }

      //decline invitation
      const userDeclinesInvitation = await this.event.findOneAndUpdate(
        { _id: eventId, 'escrow._id': escrowId },
        {
          $set: {
            'escrow.$.appointee': {
              // userId: appointeeId,
              accepted: false,
              has_disbursed_payment: false,
            },
          },
        },
        { new: true },
      );

      if (!userDeclinesInvitation) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Invitation could not be accepted. Please try again, or contact customer support with this error message',
        });
      }

      //send notif to appointer
      await this.notifservice.logSingleNotification(
        `${appointeeName} has declined your invitation to be the decider of your event's escrow. (event name:${eventName}) Click here to view`,
        appointerId,
        appointeeId,
        `/${eventId}/${userDeclinesInvitation?.currency}/amount/${escrowId}`,
        `escrow_deletion/${userDeclinesInvitation?.eventName || 'Event Name'}`,
      );

      return res
        .status(200)
        .json({ msg: 'success', payload: 'Invitation declined' });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //pay an into an escrow account
  //it is this amount an ecrow appointee will disburse leter to concerned escrow members
  async payEscrow({
    eventId,
    userId,
    escrowId,
    amount,
    currency,
    res,
  }: {
    eventId: string;
    userId: string;
    amount: number;
    currency: string;
    escrowId: string;
    res: Response;
  }) {
    try {
      //find user
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'forbidden request. Your infomation does not exist on our database. Contact customer support',
        );
      }
      //check if user has paid. If yes, prevent further payment.
      //CHECK IT HERE

      //withdraw money from user wallet and create wallet transactions
      await this.Wallet.validateUserWallet(userId);
      await this.Wallet.decreaseWallet(userId, amount, currency);

      //indicate that the user has paid. Change has_paid prop to true
      const userShouldpay = await this.event.findOneAndUpdate(
        {
          _id: eventId,
          'escrow._id': escrowId,
        },
        { $set: { 'escrow.$.appointer.has_paid': true } },
        { new: true },
      );

      if (!userShouldpay) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'has_paid property could not be updated. customer support for assistance',
        });
      }

      //increase the escrow's amount
      const escrowAmountIncreases = await this.event.findOneAndUpdate(
        {
          _id: eventId,
          'escrow._id': escrowId,
        },
        { $set: { 'escrow.$.escrowDetails.amount': Number(amount) } },
        { new: true },
      );
      if (!escrowAmountIncreases) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'could not increase escrow amount. customer support for assistance',
        });
      }

      await this.Wallet.createWalletTransactions(
        userId,
        false,
        'successful',
        currency,
        amount,
        'In-app Transfer: Escrow payment',
        'In-app Transaction: Escrow payment',
      );
      await this.Wallet.createTransaction(
        userId,
        false,
        `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
        'successful',
        currency,
        amount,
        {
          email: user?.email,
          phone_number: user?.phoneNumber,
          name: `${user?.firstName} ${user?.lastName}`,
        },
        `charityapp${Date?.now()}${Math?.random()}`,
        'In-app Transfer: Escrow payment',
        'In-app Transaction: Escrow payment',
        'paystack',
        null,
        null,
        {
          recipientId: `${eventId}&${escrowId}`,
          recipientName: `event&escrow&${escrowAmountIncreases?.eventName}`,
        },
      );
      // const escrow = escrowAmountIncreases?.escrow?.find((eachEscrow: any) => {
      //   return eachEscrow?.appointer?.userId?.toString() === userId;
      // });
      const escrow = escrowAmountIncreases?.escrow.find((eachEscrow: any) => {
        return eachEscrow?._id.toString() === escrowId;
      });
      if (!escrow) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'This escrow could not be found or does not exist. Contact customer support for assistance',
        });
      }
      return res.status(200).json({ msg: 'successful', payload: escrow });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async disburseEscrowFund({
    eventId,
    appointeeId,
    escrowId,
    payroll,
    res,
  }: {
    eventId: string;
    appointeeId: string;
    escrowId: string;
    payroll: {
      userName: string;
      _id: string;
      amount: number;
      type: 'individual' | 'charity';
    }[];
    res: Response;
  }) {
    try {
      //check if appointeeId belongs to actual appointee. Only this user can disburse funds
      const isAppointee = await this.event.findOne({
        _id: eventId,
        //i think escrowId should be validated here too, alongside escrow.appointee.userId
        'escrow.appointee.userId': appointeeId,
        // 'escrow.appointee.userId': { $elemMatch: { userId: appointeeId } },
      });

      if (!isAppointee) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Unauthorized access. You are not appointed to carry out this role.',
        });
      }

      //find event/charity
      const event = await this.event.findOne({ _id: eventId });
      if (!event) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Charity Id sent seem to be wrong. Please contact admin withis error message',
        });
      }
      //check if event payment has reached threshold, Reject further payroll addition
      async function totalPtAndAmountDonated(event: any) {
        //find amount donated by donor to escrow
        let amountDonated = event?.escrow.find(
          (eachEscrow: any) => eachEscrow._id.toString() === escrowId,
        )?.appointer?.money_value_willing_to_raise;

        //check existing payment form (which could be an empty array) for total amount already paid out to participants
        let totalPayout: number = 0;
        let paymentform = event?.escrow.find(
          (eachEscrow: any) => eachEscrow._id.toString() === escrowId,
        )?.paymentForm;
        paymentform?.map((eachUser: any) => {
          totalPayout = totalPayout + Number(eachUser?.amount_received) || 0;
        });
        return {
          amountDonated,
          totalPayout,
          paymentformlength: paymentform?.length,
        };
      }

      const { totalPayout, amountDonated, paymentformlength } =
        await totalPtAndAmountDonated(event);

      if (paymentformlength > 0 && totalPayout === 0) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: 'Total payout cannot be zero.',
        });
      }
      if (totalPayout >= Number(amountDonated)) {
        //in case it has been donw, set escrow paidOut to true
        await this.event.findOneAndUpdate(
          { _id: eventId, 'escrow._id': escrowId },
          {
            $set: {
              'escrow.$.escrowDetails.paidOut': true,
              'escrow.$.appointee.has_disbursed_payment': true,
            },
          },
          { new: true },
        );
        //then return error message indicating total amount given to escrow has been out
        return res.status(400).json({
          msg: 'unsuccessful',
          payload: `Threshold for the payout ${event?.currency} ${amountDonated} has been reached. You cannot disburse funds to any other participant`,
        });
      }

      //Get the existing escrow payment form, if any.
      //Necessary for detecting which user has been paid, if past payment to the payment list has been partial for whatever reasons
      const existingEscrowPaymentForm =
        event?.escrow?.find(
          (eachescrow) => eachescrow._id.toString() === escrowId,
        )?.paymentForm || [];
      // console.log('existingEscrowPaymentForm', existingEscrowPaymentForm)
      //filter out the payroll array from request object into normal participants and the charity/event itself, if any
      const normalparticipants = payroll.filter(
        (eachParti) => eachParti?.type === 'individual',
      );
      const charity = payroll.filter(
        (eachParti) => eachParti?.type === 'charity',
      );

      let promises;
      if (normalparticipants?.length > 0) {
        promises = normalparticipants?.map(async (participant) => {
          const { _id: userId, amount } = participant;

          // find each user using participantId
          const userhasbeenpaid = existingEscrowPaymentForm.find((eachuser) => {
            return (
              eachuser.userId.toString() === userId && eachuser?.paid === true
            );
          });

          // console.log('this works');
          //only proceed if user has not been paid. Else, do nothing.
          if (!userhasbeenpaid) {
            const user = await this.user.findOne({ _id: userId });
            if (!user) {
              return res.status(400).json({
                msg: 'unsuccessful',
                payload: 'This user does not exist',
              });
            }
            const currency = event?.currency;
            await this.Wallet.validateUserWallet(userId);
            await this.Wallet.increaseWallet(userId, amount, currency, null);
            await this.Wallet.createWalletTransactions(
              userId,
              true,
              'successful',
              currency,
              amount,
              'Wallet Top-up: Escrow payment',
              'In-app Transaction: Escrow payment',
            );

            await this.Wallet.createTransaction(
              userId,
              true,
              `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
              'successful',
              currency,
              amount,
              {
                email: user?.email,
                phone_number: user?.phoneNumber,
                name: `${user?.firstName} ${user?.lastName}`,
              },
              `charityapp${Date?.now()}${Math?.random()}`,
              'Wallet Top-up: Escrow payment',
              'In-app Transaction: Escrow payment',
              'escrow',
              null,
              {
                senderId: `${eventId}&${escrowId}`,
                senderName: `event&escrow&${event?.eventName}`,
              },
            );

            //push successful user payment record into payment form
            await this.event.findOneAndUpdate(
              { _id: eventId, 'escrow._id': escrowId },
              {
                $push: {
                  'escrow.$.paymentForm': {
                    userId,
                    amount_received: amount,
                    paid: true,
                  },
                },
              },
              { new: true },
            );
          }
        });
      }

      if (charity?.length > 0) {
        const { amount } = charity[0];
        //check if charity has been paid. To avoid double payment
        const charityhasbeenpaid = existingEscrowPaymentForm.find((charity) => {
          return (
            charity.userId.toString() === eventId && charity?.paid === true
          );
        });
        //if charity has not been paid, proceed. Else, do nothing.
        if (!charityhasbeenpaid) {
          const updatedEvent = await this.event.findOneAndUpdate(
            { _id: eventId },
            {
              $inc: {
                totalEventAmount: amount,
                totalEventAmountFromEscrow: amount,
              },
            },
            { new: true },
          );
          if (!updatedEvent) {
            return res.status(400).json({
              msg: 'unsuccessful',
              payload:
                'Something went wrong paying charity. Try again or contact support',
            });
          }
          //push charity info into payment form
          await this.event.findOneAndUpdate(
            { _id: eventId, 'escrow._id': escrowId },
            {
              $push: {
                'escrow.$.paymentForm': {
                  userId: eventId,
                  amount_received: amount,
                  paid: true,
                },
              },
            },
            { new: true },
          );
        }
      }

      if (normalparticipants?.length > 0) await Promise.all(promises);

      //following the above success, check if total payment is equal to amount available on escrow

      let appointeeHasDisbursedPayment = await this.event.findOne({
        _id: eventId,
      });
      const { totalPayout: totalPayout2, amountDonated: amountDonated2 } =
        await totalPtAndAmountDonated(appointeeHasDisbursedPayment);

      // console.log(totalPayout2, amountDonated2);
      if (totalPayout2 >= Number(amountDonated2)) {
        //if the above statement is true, set escrow paidOut and appointeeHasDisbursedPayment to true
        appointeeHasDisbursedPayment = await this.event.findOneAndUpdate(
          { _id: eventId, 'escrow._id': escrowId },
          {
            $set: {
              'escrow.$.escrowDetails.paidOut': true,
              'escrow.$.appointee.has_disbursed_payment': true,
            },
          },
          { new: true },
        );

        if (!appointeeHasDisbursedPayment) {
          return res.status(400).json({
            msg: 'unsuccessful',
            payload:
              'This escrow could not be found or does not exist. Contact customer support for assistance',
          });
        }
      }

      const escrow = appointeeHasDisbursedPayment?.escrow?.find(
        (eachEscrow: any) => {
          return eachEscrow?._id.toString() === escrowId;
        },
      );

      return res.status(200).json({ msg: 'successful', payload: escrow });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async editEscrow() {}
  async deleteEscrow() {}

  //
  //
  //
  //
  async getUserTimezone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone;
  }

  async getUserCountryCurrency(req: any, res: Response) {
    let ip = req.headers['x-forwarded-for'];
    console.log(req.headers);
    // ||
    // req.socket.remoteAddress ||
    // ''
    ip?.split(',')[0].trim();

    return res.status(200).json({ msg: 'successful', ip });
    // const url = 'https://api.ipify.org?format=jsonp&callback=?';
    // const options = {
    //   method: 'GET',
    //   url,
    //   // headers: {
    //   //   Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    //   //   'content-type': 'application/json',
    //   //   'cache-control': 'no-cache',
    //   // },
    //   json: true,
    // };

    // request(options, async (error: any, response: any) => {
    //   if (error) {
    //     return res
    //       .status(400)
    //       .json({ msg: `Something went wrong with Paystack's API` });
    //   }

    //   const result = response.body;
    //   if (result.status === 'error') {
    //     return res.status(400).json({
    //       msg: 'No bank is found for this particular country code',
    //     });
    //   }
    //   return res.status(200).json({ response: result });
    // });
    // console.log(req.socket.localAddress);
    // console.log(req.socket.remoteAddress);
  }

  async fetchAllEvents(eventName: string, res: Response) {
    try {
      const eventDetails = await this.eventDetails
        .find()
        .select('eventId totalEventAmount');

      const eventdetails = fork('./src/eventdetailsmapping.js');

      let promise = new Promise<any>((resolve, reject) => {
        eventdetails.on('message', (data) => {
          resolve(data);
        });
        eventdetails.on('exit', (code, signal) => {
          return res.status(400).json({
            msg: 'something went wrong receing message from child process',
            code,
            signal,
          });
        });
        eventdetails.send(eventDetails);
      });

      let amountraisedObj = await promise;
      let allEvents = [];
      if (eventName) {
        allEvents = await this.event.find({
          eventName: { $regex: eventName, $options: 'i' },
        });
        if (!allEvents) {
          return res.status(400).json({ msg: 'Something went wrong' });
        }
      } else {
        allEvents = await this.event.find({});
        if (!allEvents) {
          return res.status(400).json({ msg: 'Something went wrong' });
        }
      }

      const result = allEvents.map((eachEvent) => {
        if (String(eachEvent._id.toString()) in amountraisedObj) {
          let newObj = {
            ...eachEvent._doc,
            amountRaised: `${eachEvent.currency} ${
              amountraisedObj[eachEvent._id.toString()]
            }`,
          };

          return newObj;
        }
        return eachEvent;
      });
      return res.status(200).json({ msg: 'Success', allEvents: result });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getMyEvents(creatorId: string, res: Response) {
    try {
      const myEvents = await this.event.find({ creatorId });
      // .select('eventId totalEventAmount');
      if (!myEvents) {
        return res
          .status(400)
          .json({ msg: 'Could not find any charities belonging to you' });
      }
      return res.status(200).json({ msg: 'success', payload: myEvents });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async fetchSingleEvent(eventId: string) {
    try {
      const event = await this.event.find({ _id: eventId });
      if (!event) {
        throw new NotFoundException({ msg: 'Something went wrong' });
      }
      return { msg: 'Success', event };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async fetchEventCreatorDetails(creatorId: string) {
    try {
      const creator = await this.user.findOne({
        _id: new mongoose.Types.ObjectId(creatorId),
      });

      if (!creator) {
        throw new NotAcceptableException({ msg: 'creator not found' });
      }
      const { _id, firstName, lastName, phoneNumber } = creator;
      return {
        msg: 'success',
        creator: { _id, firstName, lastName, phoneNumber },
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err?.message });
    }
  }

  async logDisputeForm(
    disputeLogger: string,
    description: string,
    disputedRequests: any[],
    appointedJudge: any,
    eventId: string,
  ) {
    if (
      !description ||
      disputedRequests?.length == 0 ||
      !appointedJudge.userId ||
      !disputeLogger
    ) {
      throw new BadRequestException({
        msg: 'Dispute decription, dispute requests and appointed judge must be present',
      });
    }
    const makeObject = () => {
      let result = {};
      let alphabeth = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
      ];
      disputedRequests.map((_, i) => {
        return (result[
          `memberRequests.$[${alphabeth[i]}${alphabeth[i]}].disputeFormDescription`
        ] = { userId: disputeLogger, description });
      });
      return result;
    };

    const makeArray = () => {
      let arr = [];

      let alphabeth = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
      ];
      disputedRequests.map((item, i) => {
        let obj = {};
        obj[`${alphabeth[i]}${alphabeth[i]}.userId`] = `${item.userId}`;
        return arr.push(obj);
      });
      return arr;
    };
    // console.log(makeArray());
    try {
      const eventDetail = await this.eventDetails.findOne({ eventId });
      if (!eventDetail) {
        throw new BadRequestException({
          msg: 'Something went wrong. Could not get events',
        });
      }
      const lodgerExists = await this.eventDetails.findOne({
        eventId,
        disputeForms: { $elemMatch: { disputeLogger } },
      });
      if (lodgerExists) {
        throw new BadRequestException({
          msg: 'You already submitted a dispute form to this event. Scroll below to see your form for necessary edits',
        });
      }
      const eventJudgeExists = await this.event.findOne({
        _id: eventId,
        observers: { $elemMatch: { userId: appointedJudge.userId } },
      });
      if (!eventJudgeExists) {
        throw new ForbiddenException({
          msg: 'Something went wrong. Could not get event Judge',
        });
      }

      const updateJudgeNomination = await this.event.findOneAndUpdate(
        {
          _id: eventId,
          'observers.userId': appointedJudge.userId,
        },
        {
          $inc: {
            'observers.$.nominations': 1,
          },
        },
        { new: true },
      );

      const updateJudgeNominationforEventDet =
        await this.eventDetails.findOneAndUpdate(
          {
            eventId,
            'observers.userId': appointedJudge.userId,
          },
          {
            $inc: {
              'observers.$.nominations': 1,
            },
          },
          { new: true },
        );
      if (!updateJudgeNomination || !updateJudgeNominationforEventDet) {
        throw new BadRequestException({
          msg: "Something went wrong. Could not update Judge's nominations",
        });
      }

      //move dispute description into disputeFormDescription(userId, description) of member requests
      const updateConcernedRequestDisputeDescription =
        await this.eventDetails.updateOne(
          { eventId },
          { $push: makeObject() },
          { arrayFilters: makeArray(), new: true },
        );
      if (!updateConcernedRequestDisputeDescription) {
        throw new BadRequestException({
          msg: 'Could not update requests with dispute description field. Please contact customer support',
        });
      }

      const data = {
        disputeLogger,
        description,
        disputedRequests,
        appointedJudge, //{ userId: mongoose.Schema.Types.ObjectId, name: String },
        createdAt: Date.now(),
      };
      eventDetail?.disputeForms?.push(data);
      await eventDetail.save();

      return { msg: 'successful', disputeForms: eventDetail.disputeForms };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async setEventTimeLimits(
    requestTimeLimit: string | Date,
    disputeTimeLimit: string | Date,
    eventId: string,
    userId: string,
  ) {
    try {
      const isUserAdmin = await this.user.findOne({ _id: userId });
      if (!isUserAdmin) {
        throw new BadRequestException({ msg: 'Unavailable user' });
      }
      if (!isUserAdmin.isAdmin) {
        throw new ForbiddenException({ msg: 'Unathorized access' });
      }
      const event = await this.eventDetails.findOne({ eventId });
      event.requestTimeLimit = new Date(requestTimeLimit);
      event.disputeTimeLimit = new Date(disputeTimeLimit);
      await event.save();
      return { msg: 'Time limit succesfully set' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async setDepositAndCompletionDeadlines(
    depositDeadline: string | Date,
    completionDeadline: string | Date,
    eventId: string,
    userId: string,
  ) {
    try {
      const result = await this.authservice.confirmFeatureEligibility(
        'extend_dep_comp_deadlines',
        userId,
      );
      if (result === false) {
        throw new ForbiddenException(
          'This feature is not part of your subscription plan. Please upgrade your plan or purchase a bundle with the item',
        );
      }
      const eventproper = await this.event.findOne({ _id: eventId });
      if (!eventproper) {
        throw new BadRequestException({ msg: 'Event does not exist' });
      }
      eventproper.completionDeadline = new Date(completionDeadline);
      eventproper.depositDeadline = new Date(depositDeadline);
      await eventproper.save();
      return {
        msg: 'Success',
        depositDeadline: eventproper.depositAmount,
        completionDeadline: eventproper.completionDeadline,
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async eventFormFeatureEligibility(userId: string, feature: string) {
    try {
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'Invalid credentials. User does not exist',
        );
      }
      const isEligible = await this.authservice.confirmFeatureEligibility(
        feature,
        userId,
      );
      return isEligible;
      // if (isEligible === false) {
      //   throw new ForbiddenException(
      //     'Currency conversion is not part of your subscription plan. Please upgrade your plan or purchase a bundle that contains the feature',
      //   );
      // }
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
}

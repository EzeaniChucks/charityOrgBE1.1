import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request, Response } from "express";
import { Model } from "mongoose";
import { PaymentService } from "src/paymentModule/payment.service";

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel('subscriptions') private readonly subscriptions: Model<any>,
    private readonly walletservice: PaymentService
  ) {}

  //create subscription
  async createSubscription({
    sub_name,
    sub_duration_MS,
    sub_currency,
    sub_amount,
    req,
    res,
  }: {
    sub_name: string;
    sub_duration_MS: number;
    sub_currency: string;
    sub_amount: number;
    req: Request;
    res: Response;
  }) {
    try {
      const sub = await this.subscriptions.create({
        sub_name,
        sub_currency,
        sub_amount,
        sub_duration_MS,
      });
      if (!sub) {
        return res
          .status(400)
          .json({
            msg: 'Something went wrong. Could not create subscription. Please try again or contact developer',
          });
      }
      return res.status(200).json({ msg: 'success', payload: sub });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
  //edit subscription
  async editSubscription({
    sub_name,
    sub_duration_MS,
    sub_currency,
    sub_amount,
    req,
    res,
  }: {
    sub_name: string;
    sub_duration_MS: number;
    sub_currency: string;
    sub_amount: number;
    req:Request,
    res: Response;
  }) {
    try {
      const updatedsub = await this.subscriptions.findOneAndUpdate(
        { sub_name },
        { $set: { sub_name, sub_currency, sub_amount, sub_duration_MS } },
        { new: true },
      );
      if (!updatedsub) {
        return res
          .status(400)
          .json({
            msg: 'Something went wrong. Could not edit subscription. Please try again or contact developer',
          });
      }
      return res.status(200).json({ msg: 'success', payload: updatedsub });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
  //delete subscription. Don't allow deletion if sub has active users
  //restrict subscription. Stop users from joining sub, until all current subscriptions are expired to allow for deletion
  async deleteSubscription({
    sub_name,
    req,
    res,
  }: {
    sub_name: string;
    req:Request,
    res: Response;
  }) {
    try {
      //before deletion, make sure to check that no user has active sub
      //above comment feature isn't yet implemented
      const subAfterDeletion = await this.subscriptions.findOneAndDelete(
        { sub_name },
        { new: true },
      );
      if (!subAfterDeletion) {
        return res
          .status(400)
          .json({
            msg: 'Something went wrong. Could not delete subscription. Please try again or contact developer',
          });
      }
      return res
        .status(200)
        .json({ msg: 'success', payload: subAfterDeletion });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
  //is user subscribed?
  async isUserSubscribed({
    sub_name,
    userId,
    req,
    res,
  }: {
    sub_name: string;
    userId: string;
    req:Request;
    res: Response;
  }) {
    let newString = ''
    if(sub_name) newString  = sub_name.replace(/_+/g, ' ');
    try {
      const isUserSubscribed = await this.subscriptions.findOne({
        sub_name:newString,
        subscribers: { $elemMatch:{userId, expiration: { $gte: new Date() } }},
      });
      if (!isUserSubscribed) {
        return res.status(400).json({ msg: 'unsuccessful. Subscription does not exist or you are not subscribed to it', payload: false });
      }
      return res.status(200).json({ msg: 'success', payload: true });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  } 
  //subscribe to service?
  async subscribeToService({
    sub_name,
    userId,
    userName,
    req,
    res,
  }: {
    sub_name: string;
    userId: string;
    userName:string;
    req:Request;
    res: Response;
  }) {
    try {
      //find subscription
      const subscription = await this.subscriptions.findOne({sub_name});
      if(!subscription){
        return res.status(400).json({ msg: 'There is no subscription with this name. Please contact customer care or project developer' });
      }
      //check if user is already part of the subscription
       const isUserSubscribed = await this.subscriptions.findOne({
         sub_name,
         subscribers: { userId },
       });
       if(isUserSubscribed){
        const newExpirationDate = Date.now() + Number(subscription?.expiration);
         const joinSubscription = await this.subscriptions.findOneAndUpdate(
           { sub_name, "subscribers.userId":userId },
           {
             $set: {
               "subscribers.$.expiration": newExpirationDate
            },
            $push:{
              "subscribers.$.subscriptionHistory": newExpirationDate

             }
           },
           { new: true },
         );
          if (!joinSubscription) {
            return res.status(400).json({ msg: 'unsuccessful', payload: 'Could not subscibe to this service. Please contact customer service' });
          }
       }else{
      const joinSubscription = await this.subscriptions.findOneAndUpdate(
        { sub_name },
        {
          $push: {
            subscribers: {
              userId,
              userName,
              expiration: Date,
              subscriptionHistory: [Date],
            },
          },
        },
        { new: true },
      );
      
      if (!joinSubscription) {
        return res
          .status(400)
          .json({
            msg: 'unsuccessful',
            payload:
              'Could not subscibe to this service. Please contact customer service',
          });
      }
    }
    await this.walletservice.validateUserWallet(userId);
    await this.walletservice.decreaseWallet(userId, subscription?.sub_amount, subscription?.sub_currency)
    
    return res.status(200).json({ msg: 'success', payload: true });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
}
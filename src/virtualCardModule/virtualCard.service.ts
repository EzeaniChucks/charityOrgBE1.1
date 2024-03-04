import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import { Model } from 'mongoose';
import * as request from 'request';
import { PaymentService } from 'src/paymentModule/payment.service';

@Injectable()
export class VirtualCardServices {
  constructor(
    @InjectModel('virtualcard') private readonly virtualcard: Model<any>,
    @InjectModel('CharityAppUsers') private readonly user: Model<any>,
    @InjectModel('wallet') private readonly wallet: Model<any>,
    private readonly payment: PaymentService,
  ) {}

  async createVirtualCard({
    userId,
    amount,
    currency,
    data,
    res,
  }: {
    userId: string;
    amount: number;
    currency: string;
    data: {
      title: 'Mr' | 'Mrs' | 'Miss';
      phone: string;
      gender: 'M' | 'F';
      billing_address: string;
      billing_city: string;
      billing_state: string;
      billing_country: string;
      billing_postal_code: string;
    };
    res: Response;
  }) {
    try {
      //amount to prefund virtual card with must not be lower than N100.
      if (currency === 'NGN' && Number(amount) < 100) {
        return res.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Amount to prefund new virtual card with cannot be lower than NGN 100',
        });
      }
      //fetch user with Id
      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'Unauthorized request' });
      }
      const userName = `${user?.firstName} ${user?.lastName}`;

      //check if user has requested amount in their wallet, if not reject.
      // first validate user wallet
      const oldwallet = await this.payment.validateUserWallet(userId);
      // check if user has up to that amount in their wallet
      let particularCurrency = oldwallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      if (particularCurrency?.balance < Number(amount)) {
        return res.status(400).json(
          `You do not have up to ${amount} ${particularCurrency.currency_type} in your ${particularCurrency.currency_type} wallet`,
        );
      }

      //prepare data to send to flutterwave API
      const testData = {
        currency,
        amount: Number(amount),
        first_name: user?.firstName,
        // first_name: 'Ezeani',
        last_name: user?.lastName,
        // last_name: 'Chucks',
        // date_of_birth: user?.date_of_birth,
        date_of_birth: '1991/01/06',
        email: user?.email,
        // email: 'concord_chucks2@yahoo.com',
        billing_name: userName,
        // billing_name: 'Ezeani Chucks',
        title: data?.title,
        phone: data?.phone,
        gender: data?.gender,
        billing_address: data?.billing_address,
        billing_city: data?.billing_city,
        billing_state: data?.billing_state,
        billing_postal_code: data?.billing_postal_code,
        billing_country: data?.billing_country,
        callback_url: '',
      };
      
      const url = `https://api.flutterwave.com/v3/virtual-cards`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        body: testData,
        json: true,
      };

      const virtual = this.virtualcard;
      
      await request(options, async (error: any, response: any) => {
        try {
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }

          if (response?.body?.status === 'error') {
            return res
              .status(400)
              .json({ msg: 'unsuccessful', payload: response?.body?.message });
          }
          
          const cardData = response?.body?.data;
          
          //create virtual card with cardData
          await virtual.create({
            userId,
            userName,
            cardData,
          });
          //get all virtual cards created by this user
          const virtualcards = await virtual.find({ userId });

           //decrease wallet
           await this.payment.decreaseWallet(userId, Number(amount), currency);
           
           // create trx records
           await this.payment.createWalletTransactions(
             userId,
             'successful',
             currency,
             amount,
             'In-app Transfer: Virtual card funding',
             'In-app Transaction: Virtual card funding',
           );

           await this.payment.createTransaction(
             userId,
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
             'In-app Transfer: Virtual Card Funding',
             'In-app Transaction: Virtual Card Funding',
           );
          
          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });
          // return res.status(200).json({
          //   msg: 'successful',
          //   payload: {
          //     name: cardData?.name_on_card,
          //     cvv: cardData?.cvv,
          //     cardnumber: cardData?.card_pan,
          //     cardtype: cardData?.card_type,
          //     status: cardData?.status,
          //     cardBalance: `${cardData?.currency} ${cardData?.balance}`,
          //   },
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async getAllUserCards({ userId, res }: { userId: string; res: Response }) {
    try {
      // const user = await this.user.findOne({ _id: userId });
      //make sure it is the right user perfoming this action
      //validate incoming userId against the one present in parsed cookie token
      
      const virtualcards = await this.virtualcard
        .find({ userId, terminated: false })
        .select(
          'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
        );
      return res.status(200).json({ msg: 'successful', payload: virtualcards });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async getSingleUserCard({
    userId,
    cardId,
    res,
  }: {
    userId: string;
    cardId: string;
    res: Response;
  }) {
    try {
      //   const user = await this.user.findOne({ _id: userId });
      //   const userName = `${user?.firstName} ${user?.lastName}`;
      // const cardId; //pass it from request if you want to fetch card from flutterwave

      const url = `https://api.flutterwave.com/v3/virtual-cards/c9c1398f-eabd-4898-a1cb-4786f9a46a47`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        json: true,
      };

      //below commented out code fetches single card from flutterwave.
      //Not necessary here as usercard info in is now in database.
      // await request(options, async (error: any, response: any) => {
      //   try {
      //     // console.log('error',error);
      //     if (error) {
      //       return res
      //         .status(400)
      //         .json({ msg: 'Something went wrong creating virtual cards' });
      //     }
      //     // result = response?.body;
      //     // console.log(response?.body);
      //     if (response?.body?.status === 'error') {
      //       return res
      //         .status(400)
      //         .json({ msg: response?.body?.message });
      //     }
      //     const cardData = response?.body?.data; //response data from flutterwave;

      //     return res.status(200).json({ response: cardData});
      //   } catch (err) {
      //     return res.status(500).json({ msg: err?.message });
      //   }
      // });

      //below code fetches a single card belonging to a particular user
      const virtualcard = await this.virtualcard.findOne({
        userId,
        'cardData.id': cardId,
      });

      return res.status(200).json({ response: virtualcard });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //This service increases money on the virtual card and removes funds your flutterwave account.
  //on the app side, increase the virtual card amount in database and remove money from the inapp wallet
  async fundACard({
    userId,
    cardId, //not the flutterwave one. The database one.
    amount,
    currency,
    res,
  }: {
    userId: string;
    cardId: string;
    amount: number;
    currency: string;
    res: Response;
  }) {
    try {
      const card = await this.virtualcard.findOne({userId, _id:cardId});
      if (!card) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Could not fetch card. Card might not exist or the incorrect parameters are being passed',
        });
      }
      const fl_cardId = card?.cardData?.id.toString()
      
      //first fetch card to make sure they are not blocked  or/and terminated
      const cardIsBlocked = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        status: 'blocked',
      });
      if (cardIsBlocked) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Unable to perform this action: Card is blocked',
        });
      }
      const cardIsTerminated = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        terminated: true,
      });
      if (cardIsTerminated) {
        return res.status(400).json({
          msg: 'successful',
          payload:
            'Unable to perform this action: Card has been terminated. Kindly create a new one.',
        });
      }

      const url = `https://api.flutterwave.com/v3/virtual-cards/${fl_cardId}/fund`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        body: { debit_currency:currency, amount: Number(amount) },
        json: true,
      };

      const virtual = this.virtualcard;
      const userobj = this.user;
      const paymentobj = this.payment;
      await request(options, async (error: any, response: any) => {
        try {
          // console.log('error',error);
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }
          if (response?.body?.status === 'error') {
            return res.status(400).json({ msg: response?.body?.message });
          }
          // console.log(response?.body);
          const user = await userobj.findOne({ _id: userId });
          // validate user wallet
          await paymentobj.validateUserWallet(userId);
          // check if user has up to that amount in their wallet
          await paymentobj.decreaseWallet(userId, Number(amount), currency);
          // allow funding if yes
          await paymentobj.createWalletTransactions(
            userId,
            'successful',
            currency,
            amount,
            'In-app Transfer: Virtual card funding',
            'In-app Transaction: Virtual card funding',
          );
          await paymentobj.createTransaction(
            userId,
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
            'In-app Transfer: Virtual Card Funding',
            'In-app Transaction: Virtual Card Funding',
          );

          //update virtual card in database
          const cardData = await virtual.findOneAndUpdate(
            {
              userId,
              'cardData.id': fl_cardId,
            },
            {
              $inc: { 'cardData.amount': Number(amount) },
            },
            { new: true },
          );

          //return virtual card details in response
          //PLEASE RETURN ENTIRE CARD ARRAY INSTEAD
          const virtualcards = await this.virtualcard
            .find({ userId, terminated: false })
            .select(
              'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
            );
          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });

          // return res.status(200).json({
          //   msg: 'successful',
          //   payload: {
          //     name: cardData?.name_on_card,
          //     cvv: cardData?.cvv,
          //     cardnumber: cardData?.card_pan,
          //     cardtype: cardData?.card_type,
          //     status: cardData?.status,
          //     cardBalance: `${cardData?.currency} ${cardData?.balance}`,
          //   },
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //This service reduces money on the virtual card and funds your flutterwave account.
  //on the app side,reduce the virtual card amount in database and return money back to the inapp wallet
  async debitACard({
    userId,
    cardId,
    amount,
    currency,
    res,
  }: {
    userId: string;
    cardId: string;
    amount: number;
    currency: string;
    res: Response;
  }) {
    try {
       const card = await this.virtualcard.findOne({ userId, _id: cardId });
       if (!card) {
         return res.status(400).json({
           msg: 'successful',
           payload:
             'Could not fetch card. Card might not exist or the incorrect parameters are being passed',
         });
       }
       const fl_cardId = card?.cardData?.id.toString();
      
       //first fetch card to make sure they are not blocked or/and terminated
      const cardIsBlocked = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        status: 'blocked',
      });
      if (cardIsBlocked) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Unable to perform this action: Card is blocked',
        });
      }
      const cardIsTerminated = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        terminated: true,
      });
      if (cardIsTerminated) {
        return res.status(400).json({
          msg: 'successful',
          payload:
            'Unable to perform this action: Card has been terminated. Kindly create a new one.',
        });
      }

      const user = await this.user.findOne({ _id: userId });
      if (!user) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Unauthorized access. Wrong userId.',
        });
      }

      const testData = {
        amount: Number(amount),
        debit_currency: currency,
      };

      const url = `https://api.flutterwave.com/v3/virtual-cards/${fl_cardId}/withdraw`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        body: testData,
        json: true,
      };

      const virtual = this.virtualcard;
      const payment = this.payment;

      await request(options, async (error: any, response: any) => {
        try {
          // console.log('error',error);
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }
          if (response?.body?.status === 'error') {
            return res.status(400).json({ msg: response?.body?.message });
          }
          // validate user wallet
          await payment.validateUserWallet(userId);
          // fund user in-app wallet
          await payment.increaseWallet(userId, Number(amount), currency, null);
          await this.payment.createWalletTransactions(
            userId,
            'successful',
            currency,
            amount,
            'In-app Top-up: Virtual card funding',
            'In-app Transaction: Virtual card funding',
          );
          await this.payment.createTransaction(
            userId,
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
            'In-app Top-up: Virtual Card Funding',
            'In-app Transaction: Virtual Card Funding',
          );

          //Decrease amount in database virtaul card
          const cardData = await virtual.findOneAndUpdate(
            {
              userId,
              'cardData.id': fl_cardId,
            },
            {
              $inc: { 'cardData.amount': -Number(amount) },
            },
            { new: true },
          );
          const virtualcards = await this.virtualcard
            .find({ userId, terminated: false })
            .select(
              'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
            );

          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });
          // return res.status(200).json({
          //   msg: 'successful',
          //   payload: {
          //     name: cardData?.name_on_card,
          //     cvv: cardData?.cvv,
          //     cardnumber: cardData?.card_pan,
          //     cardtype: cardData?.card_type,
          //     status: cardData?.status,
          //     cardBalance: `${cardData?.currency} ${cardData?.balance}`,
          //   },
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async blockACard({
    userId,
    cardId,
    res,
  }: {
    userId: string;
    cardId: string;
    res: Response;
  }) {
    try {
       const card = await this.virtualcard.findOne({ userId, _id: cardId });
       if (!card) {
         return res.status(400).json({
           msg: 'successful',
           payload:
             'Could not fetch card. Card might not exist or the incorrect parameters are being passed',
         });
       }
       const fl_cardId = card?.cardData?.id.toString();

      //first fetch card to make sure they are not blocked or/and terminated
      const cardIsBlocked = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        status: 'blocked',
      });
      if (cardIsBlocked) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Unable to perform this action: Card is already blocked',
        });
      }
      const cardIsTerminated = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        terminated: true,
      });
      if (cardIsTerminated) {
        return res.status(400).json({
          msg: 'successful',
          payload:
            'Unable to perform this action: Card has been terminated. Kindly create a new one.',
        });
      }

      // const user = await this.user.findOne({ _id: userId });
      //validate that is it the right user performing this action
      //check userId against the one coming from the middleware cookie

      //next block the card from flutterwave
      const url = `https://api.flutterwave.com/v3/virtual-cards/${fl_cardId}/status/block`;
      const options = {
        method: 'PUT',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        json: true,
      };

      const virtual = this.virtualcard;

      await request(options, async (error: any, response: any) => {
        try {
          // console.log('error',error);
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }
          if (response?.body?.status === 'error') {
            return res.status(400).json({ msg: response?.body?.message });
          }
          console.log(response?.body);
          //Decrease amount in database virtaul card
          const cardData = await virtual.findOneAndUpdate(
            {
              userId,
              'cardData.id': fl_cardId,
            },
            {
              $set: { status: 'blocked' },
            },
            { new: true },
          );
          //Fetch all cards array
          const virtualcards = await virtual
            .find({ userId, terminated: false })
            .select(
              'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
            );
          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });

          // return res.status(200).json({
          //   msg: 'successful',
          //   payload: {
          //     name: cardData?.name_on_card,
          //     cvv: cardData?.cvv,
          //     cardnumber: cardData?.card_pan,
          //     cardtype: cardData?.card_type,
          //     status: cardData?.status,
          //     cardBalance: `${cardData?.currency} ${cardData?.balance}`,
          //   },
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async unblockACard({
    userId,
    cardId,
    res,
  }: {
    userId: string;
    cardId: string;
    res: Response;
  }) {
    try {
       const card = await this.virtualcard.findOne({ userId, _id: cardId });
       if (!card) {
         return res.status(400).json({
           msg: 'successful',
           payload:
             'Could not fetch card. Card might not exist or the incorrect parameters are being passed',
         });
       }
       const fl_cardId = card?.cardData?.id.toString();

      //first fetch card to make sure they are first blocked, but not terminated.
      const cardIsBlocked = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        status: 'blocked',
      });
      if (!cardIsBlocked) {
        return res.status(400).json({
          msg: 'successful',
          payload: 'Unable to perform this action: Card is unblocked',
        });
      }
      const cardIsTerminated = await this.virtualcard.findOne({
        userId,
        'cardData.id': fl_cardId,
        terminated: true,
      });
      if (cardIsTerminated) {
        return res.status(400).json({
          msg: 'successful',
          payload:
            'Unable to perform this action: Card has been terminated. Kindly create a new one.',
        });
      }

      // const user = await this.user.findOne({ _id: userId });
      //validate that is it the right user performing this action
      //check userId against the one coming from the middleware cookie

      //next block the card from flutterwave
      const url = `https://api.flutterwave.com/v3/virtual-cards/${fl_cardId}/status/unblock`;
      const options = {
        method: 'PUT',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        json: true,
      };

      const virtual = this.virtualcard;

      await request(options, async (error: any, response: any) => {
        try {
          // console.log('error',error);
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }
          if (response?.body?.status === 'error') {
            return res.status(400).json({ msg: response?.body?.message });
          }

          console.log(response?.body);
          
          //Decrease amount in database virtaul card
          const cardData = await virtual.findOneAndUpdate(
            {
              userId,
              'cardData.id': fl_cardId,
            },
            {
              $set: { status: 'unblocked' },
            },
            { new: true },
          );

          const virtualcards = await this.virtualcard
            .find({ userId, terminated: false })
            .select(
              'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
            );
          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });

          // return res.status(200).json({
          //   msg: 'successful',
          //   payload: {
          //     name: cardData?.name_on_card,
          //     cvv: cardData?.cvv,
          //     cardnumber: cardData?.card_pan,
          //     cardtype: cardData?.card_type,
          //     status: cardData?.status,
          //     cardBalance: `${cardData?.currency} ${cardData?.balance}`,
          //   },
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  async destroyACard({
    userId,
    cardId,
    res,
  }: {
    userId: string;
    cardId: string;
    res: Response;
  }) {
    try {
       const card = await this.virtualcard.findOne({ userId, _id: cardId });
       if (!card) {
         return res.status(400).json({
           msg: 'successful',
           payload:
             'Could not fetch card. Card might not exist or the incorrect parameters are being passed',
         });
       }
       const fl_cardId = card?.cardData?.id.toString();

      //first fetch card to make sure they are not already destroyed
     const cardIsDestroyed = await this.virtualcard.findOne({
       userId,
       'cardData.id': fl_cardId,
       terminated: true,
     });
     if (cardIsDestroyed) {
       return res.status(400).json({
         msg: 'successful',
         payload:
           'Unable to perform this action: Card is already terminated and requires no further action.',
       });
     }

      // const user = await this.user.findOne({ _id: userId });
      //validate that is it the right user performing this action
      //check userId against the one coming from the middleware cookie

      //next block the card from flutterwave
      const url = `https://api.flutterwave.com/v3/virtual-cards/${fl_cardId}/terminate`;
      const options = {
        method: 'PUT',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        json: true,
      };

      const virtual = this.virtualcard;

      await request(options, async (error: any, response: any) => {
        try {
          // console.log('error',error);
          if (error) {
            return res.status(400).json({
              msg:
                error.message || 'Something went wrong creating virtual cards',
            });
          }
          if (response?.body?.status === 'error') {
            return res.status(400).json({ msg: response?.body?.message });
          }

          console.log(response?.body);
          
          //Change card termination to true;
          await virtual.findOneAndUpdate(
            {
              userId,
              'cardData.id': fl_cardId,
            },
            {
              $set: { terminated: true },
            },
            { new: true },
          );
          
          //fetch all cards array
          const virtualcards = await this.virtualcard
            .find({ userId, terminated: false })
            .select(
              'status _id cardData.amount cardData.currency cardData.card_pan cardData.cvv cardData.expiration cardData.card_type cardData.name_on_card cardData.created_at',
            );
          return res
            .status(200)
            .json({ msg: 'successful', payload: virtualcards });

          //   return res.status(200).json({
          //   msg: 'successful',
          //   payload: 'card termination successful',
          // });
        } catch (err) {
          return res.status(500).json({ msg: err?.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }
}
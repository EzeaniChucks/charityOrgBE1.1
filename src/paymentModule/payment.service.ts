import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Res,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import * as request from 'request';
import * as Flutterwave from 'flutterwave-node-v3';
import * as coinbase from 'coinbase-commerce-node';
import * as coinbase2 from 'coinbase';
import { currency_array } from '../util';
import { Response, response } from 'express';
import { AuthService } from 'src/authModule/auth.service';
import { ModuleRef } from '@nestjs/core';
import { NotifService } from 'src/notificationModule/notifService';
import axios from 'axios';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel('walletTransaction') private wallettransaction: Model<any>,
    @InjectModel('transaction') private transaction: Model<any>,
    @InjectModel('wallet') private wallet: Model<any>,
    @InjectModel('CharityAppUsers') private User: Model<any>,
    @InjectModel('recurrentPayment') private recurrentPayment: Model<any>,
    @InjectModel('event') public event: Model<any>,
    @InjectModel('eventDetails') private eventDetails: Model<any>,
    @InjectModel('withdrawalIntent') private withdrawalIntent: Model<any>,
    @Inject(forwardRef(() => AuthService))
    private authservice: AuthService, // private Wallet: PaymentService,
    private readonly notificationservice: NotifService,
  ) {}
  //HELPER FUNCTIONS
  async validateUserWallet(userId: string) {
    const user = await this.User.findOne({ _id: userId });
    if (!user) {
      //attach expired cookie to response, so frontend logs out user
      throw new BadRequestException(
        'No user with this credential exists. Enter right credential or create a new account',
      );
    }
    let mongoCurrencyList = [];
    currency_array.map((eachCur: string) => {
      mongoCurrencyList.push({
        currency_type: eachCur,
        balance: 0,
        total_income_from_events: 0,
        total_income_from_events_percent_inc: 0,
        total_topup: 0,
        total_topup_percent_inc: 0,
        total_outflow: 0,
        total_outflow_percent_dec: 0,
      });
      return;
    });
    const userWallet = await this.wallet.findOne({ userId });
    if (!userWallet) {
      const newWallet = await this.wallet.create({
        userId,
        currencies: mongoCurrencyList,
      });
      return newWallet;
    }
    return userWallet;
  }
  async createWalletTransactions(
    userId: string,
    isInflow: boolean,
    status: string,
    currency: string | number,
    amount: string | number,
    description: string,
    narration: string,
    paymentMethod?: string,
    link?: string,
  ) {
    const walletTransaction = await this.wallettransaction.create({
      amount,
      userId,
      isInflow,
      status,
      currency,
      description,
      narration,
      paymentMethod: paymentMethod ? paymentMethod : 'flutterwave',
      link: link ? link : '',
    });
    return walletTransaction;
  }

  async createTransaction(
    userId: string | mongoose.Types.ObjectId,
    isInflow: boolean,
    id: string,
    status: string,
    currency: string | number,
    amount: string | number,
    customer: { name: string; email: string; phone_number: string },
    tx_ref: string,
    description: string,
    narration: string,
    paymentGateway?: string,
    link?: string | null,
    senderDetails?: { senderId: string; senderName: string } | null,
    recipientDetails?: { recipientId: string; recipientName: string } | null,
  ) {
    const transaction = this.transaction.create({
      userId,
      isInflow,
      transactionId: id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone_number,
      amount,
      currency,
      tx_ref,
      paymentStatus: status,
      paymentGateway: paymentGateway ? paymentGateway : 'inapp',
      description,
      narration,
      link: link ? link : '',
      senderDetails: senderDetails ? senderDetails : null,
      recipientDetails: recipientDetails ? recipientDetails : null,
    });
    return transaction;
  }
  async updateWallet(
    userId: string,
    amount: string | number,
    currency: string,
  ) {
    try {
      const oldwallet = await this.wallet.findOne({ userId });
      if (!oldwallet) {
        throw new ForbiddenException(
          'Wallet does not exist. Please contact customer care',
        );
      }
      let percent_inc = 0;
      let particularCurrency = oldwallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      if (particularCurrency.total_topup === 0) {
        percent_inc = 100;
      } else {
        percent_inc =
          (Number(amount) / Number(particularCurrency.total_topup)) * 100;
      }

      const wallet = await this.wallet.findOneAndUpdate(
        { userId, 'currencies.currency_type': currency },
        {
          $inc: {
            'currencies.$.balance': amount,
            'currencies.$.total_topup': amount,
          },
          $set: {
            'currencies.$.total_topup_percent_inc': percent_inc.toFixed(4),
          },
        },
        { new: true },
      );
      // console.log(particularCurrency, currency, wallet);
      return wallet;
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Something went wrong updating wallet. Contact customer care',
        log: err.message,
      });
    }
  }
  async updateWalletTransactionStatus(
    walletTransactionId: string,
    status: string,
    narration: string,
    link?: string,
  ) {
    return await this.wallettransaction.findOneAndUpdate(
      { _id: walletTransactionId },
      { $set: { status, narration, link: link ? link : '' } },
      { new: true },
    );
  }
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    narration: string,
    link?: string,
  ) {
    return await this.transaction.findOneAndUpdate(
      { transactionId },
      { $set: { paymentStatus: status, narration, link: link ? link : '' } },
      { new: true },
    );
  }
  async deleteWalletTransaction(walletTransactionId: string) {
    return await this.wallettransaction.findOneAndDelete({
      _id: walletTransactionId,
    });
  }
  async deleteTransaction(transactionId: string) {
    return await this.transaction.findOneAndDelete({ transactionId });
  }
  async fetchWalletTransaction(walletTransactionId: string) {
    return await this.wallettransaction.findOne({ _id: walletTransactionId });
  }
  async fetchTransaction(transactionId: string) {
    return await this.transaction.findOne({ transactionId });
  }
  async increaseWallet(
    userId: string,
    amount: string | number,
    currency: string,
    transactionType: string | null,
  ) {
    try {
      const oldwallet = await this.wallet.findOne({ userId });
      if (!oldwallet) {
        throw new ForbiddenException(
          'Wallet does not exist. Please contact customer care',
        );
      }
      let percent_inc: number = 0;
      let particularCurrency = oldwallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      if (particularCurrency.total_topup === 0) {
        percent_inc = 100;
      } else {
        percent_inc =
          (Number(amount) / Number(particularCurrency.total_topup)) * 100;
      }

      let wallet = undefined;
      if (transactionType) {
        wallet = await this.wallet.findOneAndUpdate(
          { userId, 'currencies.currency_type': currency },
          {
            $inc: {
              'currencies.$.balance': Number(amount).toFixed(2),
              'currencies.$.total_topup': amount,
            },
            $set: {
              'currencies.$.total_topup_percent_inc': percent_inc.toFixed(3),
            },
          },
          { new: true },
        );
      } else {
        wallet = await this.wallet.findOneAndUpdate(
          { userId, 'currencies.currency_type': currency },
          {
            $inc: {
              'currencies.$.balance': Number(amount).toFixed(2),
            },
          },
          { new: true },
        );
      }
      return wallet;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
  async decreaseWallet(
    userId: string,
    amount: string | number,
    currency: string,
  ) {
    const oldwallet = await this.wallet.findOne({ userId });
    if (!oldwallet) {
      throw new ForbiddenException(
        'Wallet or user does not exist. Please contact customer care',
      );
    }
    let particularCurrency = oldwallet.currencies.find((eachCur: any) => {
      return eachCur?.currency_type === currency;
    });
    if (particularCurrency?.balance < amount) {
      throw new ForbiddenException(
        `You do not have up to ${amount} ${particularCurrency.currency_type} in your ${particularCurrency.currency_type} wallet`,
      );
    }

    let total_outflow_percent_dec = 0;
    if (particularCurrency.total_outflow_percent_dec === 0) {
      total_outflow_percent_dec = 100;
    } else {
      total_outflow_percent_dec =
        ((Number(particularCurrency.total_outflow) - Number(amount)) /
          Number(particularCurrency.total_outflow)) *
        100;
    }

    const wallet = await this.wallet.findOneAndUpdate(
      { userId, 'currencies.currency_type': currency },
      {
        $inc: {
          'currencies.$.balance': -Number(amount).toFixed(2),
          'currencies.$.total_outflow': Number(amount).toFixed(2),
        },
        $set: {
          'currencies.$.total_outflow_percent_dec': Number(amount).toFixed(2),
        },
      },
      { new: true },
    );
    return wallet;
  }

  //Coinbase
  //commerce charge
  async acceptCrypto(
    userId: string,
    amount: number | string,
    currency: string,
  ) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        //attach expired cookie to response, so frontend logs out user
        throw new BadRequestException('You are not on our database');
      }
      await this.validateUserWallet(userId);
      let walletTrans = await this.createWalletTransactions(
        userId,
        true,
        'new',
        currency,
        amount,
        'crypto funding',
        `temporary charge created`,
      );
      await this.createTransaction(
        userId,
        true,
        walletTrans._id.toString(),
        'new',
        currency,
        amount,
        {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone_number: user.phoneNumber,
        },
        `${Date.now() + Math.random() * 10000}`,
        'crypto funding',
        `temporary charge created`,
        'Coinbase',
      );

      let Client = coinbase.Client;
      let resources = coinbase.resources;
      Client.init(process.env.COINBASE_API_KEY);

      const charge = await resources.Charge.create({
        name: `${user.firstName} ${user.lastName}`,
        description:
          'Please choose which crypto type to debit your wallet with',
        local_price: {
          amount,
          currency,
        },
        pricing_type: 'fixed_price',
        metadata: {
          userId: user._id,
          transactionId: walletTrans._id.toString(),
        },
        redirect_url: 'https://charityorg.vercel.app/dashboard',
        cancel_url: 'https://charityorg.vercel.app/dashboard',
      });
      return { charge };
    } catch (err) {
      return new InternalServerErrorException({ msg: err.message });
    }
  }
  //commerce webhook
  async cryptoWebhook(rawData: any, hookHeader: any, res: any) {
    const CoinbaseWebhook = coinbase.Webhook;
    try {
      const event = CoinbaseWebhook.verifyEventBody(
        rawData,
        hookHeader,
        process.env.COINBASE_WEBHOOK_SECRET,
      );
      //event.type variations
      //"charge:created",
      //"charge:confirmed",
      //"charge:failed",
      //"charge:delayed",
      //"charge:pending",
      //"charge:resolved"
      if (event.type === 'charge:created') {
        //get user id
        //get tranx Id from meta data in webhook
        //fetch, edit status and add charge link to transaction history
        let id = event.data.code;
        let userId = event.data.metadata.userId;
        let transactionId = event.data.metadata.transactionId;

        //SET UP A JOB TO CLEAN UP TRANSACTION HISTORY AFTER ONE HOUR OF CREATION, IF THEY REMAIN PENDING.
        //In retrospect, not sure the job is still needed. Webhooks send a request after an hour to the 'charge:failed' handler
        await this.validateUserWallet(userId);
        await this.updateTransactionStatus(
          transactionId,
          'new',
          `temporary charge created`,
          `https://commerce.coinbase.com/charges/${id}`,
        );
        await this.updateWalletTransactionStatus(
          transactionId,
          'new',
          `temporary charge created`,
          `https://commerce.coinbase.com/charges/${id}`,
        );
      }
      if (event.type === 'charge:pending') {
        //create user transaction with status pending
        let amount = event.data.pricing.local.amount;
        let currency = event.data.pricing.local.currency;
        let userId = event.data.metadata.userId;
        let transactionId = event.data.metadata.transactionId;
        // console.log('pending', amount, currency, userId);
        await this.validateUserWallet(userId);
        await this.updateTransactionStatus(
          transactionId,
          'pending',
          `${amount} ${currency} fund pending`,
        );
        await this.updateWalletTransactionStatus(
          transactionId,
          'pending',
          `${amount} ${currency} fund pending`,
        );
      }
      if (event.type === 'charge:failed') {
        //create user transaction with status pending
        let userId = event.data.metadata.userId;
        let transactionId = event.data.metadata.transactionId;
        // console.log('pending', amount, currency, userId);
        await this.deleteTransaction(transactionId);
        await this.deleteWalletTransaction(transactionId);
      }
      if (event.type === 'charge:confirmed') {
        //get created user transaction
        //change staus to fulfiled
        //fund the concerned crypto wallet
        let amount = event.data.pricing.local.amount;
        let currency = event.data.pricing.local.currency;
        let userId = event.data.metadata.userId;
        let transactionId = event.data.metadata.transactionId;
        let eventStatus = event.data.payments[0].status.toLowerCase();
        let paidValue = event.data.payments[0].local.amount;
        let paidCurrency = event.data.payments[0].local.currency;
        let cryptovalue = event.data.payments[0].crypto.amount;
        let cryptotype = event.data.payments[0].crypto.currency;
        console.log(eventStatus, amount, paidValue, currency, paidCurrency);
        if (
          eventStatus === 'confirmed' &&
          amount === paidValue &&
          currency === paidCurrency
        ) {
          await this.validateUserWallet(userId);
          await this.increaseWallet(
            userId,
            cryptovalue,
            cryptotype,
            'wallet increment',
          );
          await this.updateTransactionStatus(
            transactionId,
            'success',
            `success: ${amount} ${currency} funded`,
          );
          await this.updateWalletTransactionStatus(
            transactionId,
            'success',
            `success: ${amount} ${currency} funded`,
          );
          //lastly TRADE SAME AMOUNT IN YOUR COINBASE ACCOUNT TO CRYPTO TO AVOID INFLATION/DEFLATION
        }
      }
      return res.sendStatus(200);
    } catch (err) {
      return res.status(500).json({ error: err });
    }
  }
  //(coinbase main site withdrawal)
  async sendCryptoToExternalWallet(
    amount: number,
    cryptoCurrencySymbol: string,
    externalWalletAddress: string,
    userId: string,
    response: Response,
  ) {
    try {
      const user = this.User.findOne({ userId });
      if (!user) {
        throw new ForbiddenException(
          'You cannot make this request. Contact customer service',
        );
      }
      await this.decreaseWallet(userId, amount, cryptoCurrencySymbol);
      const Coinbase2 = coinbase2.Client;
      const workingobj = new Coinbase2({
        apiKey: process.env.CoinbaseNotCommerceAPIKey,
        apiSecret: process.env.CoinbaseNotCommerceSecretKey,
      });

      workingobj.getAccounts({}, async (err: any, accounts: any) => {
        if (err) {
          console.log(err);
          await this.increaseWallet(
            userId,
            amount,
            cryptoCurrencySymbol,
            'wallet increment',
          );
        } else {
          console.log(accounts);
          //assuming you want to send to someone from the first account
          const wallet = accounts[0];
          wallet.sendMoney(
            {
              to: externalWalletAddress,
              amount,
              currency: cryptoCurrencySymbol,
              description: `Pay out ${amount} ${cryptoCurrencySymbol} to wallet address ${externalWalletAddress}`,
            },
            async (err: any, transaction: any) => {
              if (err) {
                console.error(err);
                await this.increaseWallet(
                  userId,
                  amount,
                  cryptoCurrencySymbol,
                  'wallet increment',
                );
                return;
              }
              console.log(`Transaction: ${transaction} and ${transaction.id}`);
            },
          );
        }
      });
    } catch (err) {}
  }

  //FLUTTERWAVE
  //country Banks
  async getCountryBanks(country: string, @Res() respon: any) {
    const url = `https://api.flutterwave.com/v3/banks/${country}`;
    try {
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return respon
            .status(400)
            .json({ msg: 'Something went wrong with fetching banks' });
        }

        const resp = response?.body;
        if (resp.status === 'error') {
          return respon
            .status(400)
            .json({ msg: 'No bank is found for this particular country code' });
        }
        return respon.status(200).json({ response: resp });
      });
    } catch (err) {
      throw new InternalServerErrorException({
        msg: err.message,
      });
    }
  }

  //FL payment response
  async paymentresponse(
    transaction_id: string | number,
    description: string,
    chargeAmount: string | number,
  ) {
    try {
      const flw = new Flutterwave(
        // 'FLWPUBK_TEST-31f261f02a971b32bd56cf4deff5e74a-X',
        `${process.env.FLUTTERWAVE_V3_PUBLIC_KEY}`,
        `${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
      );
      const response = await flw.Transaction.verify({
        id: `${transaction_id}`,
      });
      const { status, currency, id, amount, customer, tx_ref, narration } =
        response.data;

      // console.log('flutter response status', status);

      const transactionExists = await this.transaction.findOne({
        transactionId: id,
      });
      if (transactionExists) {
        throw new ForbiddenException({ msg: 'Transaction already exists' });
      }
      const user = await this.User.findOne({ email: customer.email });
      if (!user) {
        throw new UnauthorizedException({
          msg: 'Unathorized Access. Something went wrong. Please contact customer care.',
        });
      }

      const realamount = amount - Number(chargeAmount);
      await this.validateUserWallet(user._id);

      const wallet = await this.increaseWallet(
        user._id,
        realamount,
        currency,
        'wallet increment',
      );

      await this.createWalletTransactions(
        user._id,
        true,
        status,
        currency,
        realamount,
        description,
        narration,
      );

      await this.createTransaction(
        user._id,
        true,
        id,
        status,
        currency,
        realamount,
        customer,
        tx_ref,
        description,
        narration,
        'flutterwave',
      );

      const result = wallet.currencies.find((eachCur: any) => {
        return eachCur.currency_type === currency;
      });
      return { msg: 'Wallet funded successfully', balance: result };
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Something went wrong',
        log: err.message,
      });
    }
  }

  //FL bank payment
  async flSendMoneyToBank(
    userId: string,
    withdrawalIntentId: string,
    response: Response,
  ) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        return response
          .status(400)
          .json('forbidden request. This user doen not exist');
      }

      const withdrawalIntent = await this.withdrawalIntent.findOne({
        _id: withdrawalIntentId,
      });
      if (withdrawalIntent?.intentStatus === 'cancelled') {
        return response
          .status(400)
          .json(
            'This payment intent has been cancelled by user and should no longer be processed',
          );
      }

      if (withdrawalIntent?.intentStatus !== 'unattended') {
        return response
          .status(400)
          .json(
            `This payment intent already has a status of ${withdrawalIntent?.intentStatus}.`,
          );
      }

      const currency = withdrawalIntent?.currency;
      const amount = withdrawalIntent?.amount;
      const account_bank = withdrawalIntent?.accountBank;
      const account_number = withdrawalIntent?.accountNumber;

      //amount below 100 cannot be sent
      // console.log(userId, amount, currency, account_bank, account_number);
      // await this.validateUserWallet(userId);
      // await this.decreaseWallet(userId, amount, currency); //It is necessary to call this here because a code within this method checks if user has requested amount in their wallet
      // // await this.createWalletTransactions(userId)
      const walletTrans = await this.createWalletTransactions(
        userId,
        false,
        'pending',
        currency,
        amount,
        'Wallet Withdraw',
        'Bank Transfer',
      );

      // const { account_bank, account_number } = user.bankDetails;
      const callback_url = `https://${process.env.BACK_END_CONNECTION}/respond_to_fl_bank_payment`;

      const reference = `${user.firstName}_${user.lastName}_${Date.now()}`;

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
        return response
          .status(400)
          .json({ msg: 'failed', payload: result?.message });
      }
      //  const fl_queued_result =     {
      //   status: 'success',
      //   message: 'Transfer Queued Successfully',
      //   data: {
      //     id: 56963627,
      //     account_number: '0037497074',
      //     bank_code: '058',
      //     full_name: 'EZEANI CHUKWUDI CHUCKS',
      //     created_at: '2023-08-07T06:30:37.000Z',
      //     currency: 'NGN',
      //     debit_currency: 'NGN',
      //     amount: 150,
      //     fee: 10.75,
      //     status: 'NEW',
      //     reference: 'Ezeani_Chucks_1691389837757',
      //     meta: {
      //       first_name: 'Ezeani',
      //       last_name: 'Chucks',
      //       mobile_number: 234,
      //       email: 'concordchucks2@gmail.com',
      //       beneficiary_country: 'NG',
      //       beneficiary_occupation: 'merchant',
      //       recipient_address: 'N0 9, Alafia crescent, Elero junction Ashi-bodija, Ibadan Nigeria',
      //       sender: 'Ezeani Chukwudi Chucks',
      //       sender_country: 'NG',
      //       sender_id_number: '22177327049',
      //       sender_id_type: 'ID CARD',
      //       sender_id_expiry: 'N/A',
      //       sender_mobile_number: '2348067268692',
      //       sender_address: 'No 9, Alafia crescent, Elero junction Ashi-bodija, Ibadan Nigeria',
      //       sender_occupation: 'software developer',
      //       sender_beneficiary_relationship: 'Customer',
      //       transfer_purpose: 'Wallet withdrawal'
      //     },
      //     narration: 'Transfer from Ezeani Chucks @CharityApp',
      //     complete_message: '',
      //     requires_approval: 0,
      //     is_approved: 1,
      //     bank_name: 'GTBANK PLC'
      //   }
      // }
      await this.createTransaction(
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
        'Wallet Withdraw: Bank transfer',
        'Bank Transaction: Flutterwave bank transfer',
      );
      return response
        .status(200)
        .json({ msg: 'success', payload: result?.data });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //FL bank payment listener
  async respondToFLBankPayment(body: any) {
    // console.log('call back received');
    const { id, currency, amount, meta, narration, status } = body.data;
    if (status === 'SUCCESSFUL') {
      await this.updateTransactionStatus(
        id,
        'successful',
        'amount deposited to bank',
      );
      await this.updateWalletTransactionStatus(
        meta?.wallettransaction_id,
        'successful',
        'amount deposited to bank',
      );
      return response
        .status(200)
        .json({ msg: 'Succesful: Money has been sent to your bank account' });
    } else if (status === 'FAILED') {
      await this.increaseWallet(
        meta?.beneficiary_id,
        amount,
        currency,
        'send to bank',
      );
      await this.updateTransactionStatus(
        id,
        'failed',
        'amount not deposited to bank',
      );
      await this.updateWalletTransactionStatus(
        meta?.wallettransaction_id,
        'failed',
        'amount not deposited to bank',
      );
      //i decided against deleting transaction history for failed transfer
      // await this.deleteTransaction(id)
      // await this.deleteWalletTransaction(meta?.wallettransaction_id)
      return response.status(400).json({
        msg: body.data.complete_message.includes(
          'Insufficient funds in customer wallet',
        )
          ? 'Not Successful. Contact support with this particular error message:Disburse Failed'
          : 'Something went wrong',
      });
      // const request_headers_from_fl = {
      //   accept: 'application/json, text/plain, */*',
      //   'content-length': '1183',
      //   'content-type': 'application/json;charset=utf-8',
      //   host: 'charityapp.cyclic.app',
      //   'user-agent': 'axios/0.19.2',
      //   'x-forwarded-for': '3.249.153.32',
      //   'x-forwarded-port': '443',
      //   'x-forwarded-proto': 'https',
      // };
      // const result_for_failure = {
      //   "event": "transfer.completed",
      //   "event.type": "Transfer",
      //   "data": {
      //     "id": 56963627,
      //     "account_number": "0037497074",
      //     "bank_name": "GTBANK PLC",
      //     "bank_code": "058",
      //     "fullname": "EZEANI CHUKWUDI CHUCKS",
      //     "created_at": "2023-08-07T06:30:37.000Z",
      //     "currency": "NGN",
      //     "debit_currency": "NGN",
      //     "amount": 150,
      //     "fee": 10.75,
      //     "status": "FAILED",
      //     "reference": "Ezeani_Chucks_1691389837757",
      //     "meta": {
      //       "first_name": "Ezeani",
      //       "last_name": "Chucks",
      //       "mobile_number": 234,
      //       "email": "concordchucks2@gmail.com",
      //       "beneficiary_country": "NG",
      //       "beneficiary_occupation": "merchant",
      //       "recipient_address": "N0 9, Alafia crescent, Elero junction Ashi-bodija, Ibadan Nigeria",
      //       "sender": "Ezeani Chukwudi Chucks",
      //       "sender_country": "NG",
      //       "sender_id_number": "22177327049",
      //       "sender_id_type": "ID CARD",
      //       "sender_id_expiry": "N/A",
      //       "sender_mobile_number": "2348067268692",
      //       "sender_address": "No 9, Alafia crescent, Elero junction Ashi-bodija, Ibadan Nigeria",
      //       "sender_occupation": "software developer",
      //       "sender_beneficiary_relationship": "Customer",
      //       "transfer_purpose": "Wallet withdrawal"
      //     },
      //     "narration": "Transfer from Ezeani Chucks @CharityApp",
      //     "approver": null,
      //     "complete_message": "DISBURSE FAILED: Insufficient funds in customer wallet",
      //     "requires_approval": 0,
      //     "is_approved": 1
      //   }
      // }
    } else {
      return response.status(400).json({
        msg: 'Something went wrong with payment. Contact customer support',
      });
    }
  }

  //FL get wallet balance
  async flGetWalletBalance(currency: string, response: Response) {
    try {
      // console.log(currency);
      const url = `https://api.flutterwave.com/v3/balances`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        json: true,
      };

      request(options, async (error: any, resp: any) => {
        if (error) {
          return response
            .status(400)
            .json({ msg: 'Something went wrong with fetching banks' });
        }
        const result = resp?.body;
        if (result.status === 'error') {
          return response
            .status(400)
            .json({ msg: 'an error occured with fetching balance' });
        }
        return response.status(200).json({ result });
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //Fl check tranfer fee
  async flChecktransferFee(amount: number, currency: string, res: Response) {
    try {
      const url = `https://api.flutterwave.com/v3/transfers/fee?type=account&&amunt=${amount}&&currency=${currency}`;
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      return res.status(200).json({ msg: 'successful', payload: data?.data });
    } catch (err: any) {
      return res
        .status(500)
        .json({ msg: err?.response?.data?.message || err?.message });
    }
  }

  //FL verify account number
  async verifyAccount(
    account_number: string | number,
    account_bank: string,
    country: string,
    res: any,
  ) {
    try {
      const url = `https://api.flutterwave.com/v3/accounts/resolve`;

      const { data } = await axios.post(
        url,
        { account_bank, account_number, country },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return res.status(200).json({ msg: 'successful', payload: data });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  //Not working. Needs a PCIS (or so) certification, accroding to flutterwave
  //Alternative method is from one of Paystack's group of endpoints below
  async flVerifyBVNDetails({
    bvn,
    firstname,
    lastname,
    res,
  }: {
    bvn: string;
    firstname: string;
    lastname: string;
    res: Response;
  }) {
    try {
      const url = `https://api.flutterwave.com/v3/bvn/verifications`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        body: {
          bvn,
          firstname,
          lastname,
          redirect_url: `${process.env.FRONT_END_CONNECTION}/dashboard`,
        },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res.status(400).json({ msg: 'unsuccesful', payload: error });
        }
        // console.log(response.body);
        const result = response.body;
        if (result.status === 'error') {
          return res
            .status(400)
            .json({ msg: 'unsuccesful', payload: result?.message });
        }
        console.log(result);
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      return res.status(500).json({ payload: 'unsucessful', msg: err.message });
    }
  }

  //PAYSTACK
  async payStackCreateCharge(
    email: string,
    amount: number,
    last_name: string,
    first_name: string,
    phone: string,
    currency: string,
    callback_url: string,
    ref: string,
    res: Response,
  ) {
    try {
      const url = `https://api.paystack.co/transaction/initialize`;
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
          amount: Number(amount),
          currency,
          ref,
          callback_url,
          metadata: {
            first_name,
            last_name,
            phone,
          },
        },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }
        // console.log(response.body);
        const result = response.body;
        if (result.status === 'error') {
          return res
            .status(400)
            .json({ msg: 'No bank is found for this particular country code' });
        }
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //payment response for in-app wallet funding (e.g., on client's dashboard for v1)
  async payStackPaymentResponse(reference: string, res: Response) {
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
        if (result.status === 'error') {
          return res.status(400).json({
            msg: 'No bank is found for this particular country code',
          });
        }
        if (result.data.status === 'success') {
          const { id, status, amount, currency, metadata, customer } =
            result.data;
          const transactionExists = await this.transaction.findOne({
            transactionId: id,
          });
          if (transactionExists) {
            throw new ForbiddenException({ msg: 'Transaction already exists' });
          }
          const user = await this.User.findOne({ email: customer.email });
          if (!user) {
            throw new UnauthorizedException({
              msg: 'Unathorized Access. Something went wrong. Please contact customer care.',
            });
          }

          await this.validateUserWallet(user._id);

          // const realamount = amount - Number(chargeAmount);
          await this.createWalletTransactions(
            user._id,
            true,
            status,
            currency,
            amount,
            'Wallet Top-up',
            'Paystack Top-up Received',
          );

          await this.createTransaction(
            user._id,
            true,
            id,
            status,
            currency,
            amount,
            {
              name: `${customer?.first_name} ${customer?.last_name}`,
              email: customer?.email,
              phone_number: customer?.phone,
            },
            reference,
            'Wallet Top-up',
            'Paystack Top-up Received',
          );

          const wallet = await this.updateWallet(user._id, amount, currency);
          const walletresult = wallet.currencies.find((eachCur: any) => {
            return eachCur.currency_type === currency;
          });
          // return { msg: 'Wallet funded successfully', balance: result };
          return res.status(200).json({ response: result });
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async payStackGetBanks(country: string, res: Response) {
    try {
      const url = `https://api.paystack.co/bank?country=${country}`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        // body: { email, amount: Number(amount), currency, ref, callback_url },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }
        // console.log(response.body);
        const result = response.body;
        if (result.status === 'error') {
          return res
            .status(400)
            .json({ msg: 'No bank is found for this particular country code' });
        }
        return res.status(200).json({ msg: 'successful', payload: result });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async payStackUpdateCustomer({
    customer_code,
    body,
    res,
  }: {
    customer_code: string;
    body: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    };
    res: Response;
  }) {
    try {
      const url = `https://api.paystack.co/customer/${customer_code}`;
      const options = {
        method: 'PUT',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        body,
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }
        console.log(response.body);
        const result = response.body;
        if (result.status === false) {
          return res.status(400).json({ msg: result?.message });
        }
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async getPayStackCustomerList({ res }: { res: Response }) {
    try {
      // const user = await this.User.findOne({ _id: '65c681387a7de5645968486f' });
      // if (!user) {
      //   return res
      //     .status(400)
      //     .json({ msg: 'unauthorized access', payload: 'User dos not exist' });
      // }

      // if (!user?.paystack_customer_code) {
      //   return res
      //     .status(400)
      //     .json({
      //       msg: 'unsuccesful',
      //       payload: 'No paystack customer code created yet',
      //     });
      // }
      // console.log(user.paystack_customer_code);
      const url = `https://api.paystack.co/customer`;
      const options = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        // body: {
        //   country: 'NG',
        //   type: 'bank_account',
        //   account_number: '0037497074',
        //   bnv: '22177327049',
        //   bank_code: '058',
        //   first_name: 'Ezeani',
        //   last_name: 'Chukwudi',
        // },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }
        console.log(response.body);
        const result = response.body;
        if (result.status === false) {
          return res.status(400).json({ msg: result?.message });
        }
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async createTestCustomer(res: Response) {
    try {
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
          email: 'concord_chucks2@yahoo.com',
          first_name: 'Uchenna',
          last_name: 'Okoro',
          phone: '+2348067268692',
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
          return res.status(200).json({
            msg: 'successful',
            payload: result,
          });
        } catch (err) {
          return res
            .status(500)
            .json({ payload: 'server error', msg: err.message });
        }
      });
    } catch (err) {}
  }

  async payStackBVNIdentityValidation({
    userId,
    // country,
    account_number,
    account_bank,
    legal_first_name,
    legal_last_name,
    bvn,
    bank_code,
    res,
  }: {
    userId: string;
    // country:string,
    account_number: string;
    account_bank: string;
    legal_first_name: string;
    legal_last_name: string;
    bvn: string;
    bank_code: string;
    res: Response;
  }) {
    try {
      // const user = await this.User.findOne({ _id: '65c681387a7de5645968486f' });
      const user = await this.User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            accountTempInfo: {
              account_number,
              bvn,
              account_bank,
              legal_first_name,
              legal_last_name,
            },
          },
        },
      );
      if (!user) {
        return res.status(400).json({
          msg: 'unauthorized access',
          payload: 'You do not have access to this route',
        });
      }

      if (!user?.paystack_customer_code) {
        return res.status(400).json({
          msg: 'unsuccesful',
          payload: 'No paystack customer code created yet',
        });
      }
      // console.log(user.paystack_customer_code);
      const url = `https://api.paystack.co/customer/${user?.paystack_customer_code}/identification`;
      // const url = `https://api.paystack.co/customer/${'CUS_ewxp4jeonx7lnfb'}/identification`;
      const body = {
        country: 'NG',
        type: 'bank_account',
        account_number,
        bvn,
        bank_code,
        // first_name: 'Uchenna',
        first_name: legal_first_name,
        // last_name: 'Okoro',
        last_name: legal_last_name,
      };

      // console.log(body);
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'content-type': 'application/json',
          'cache-control': 'no-cache',
        },
        body,
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: `Something went wrong with Paystack's API` });
        }
        // console.log(response.body);
        const result = response.body;
        if (result.status === false) {
          return res
            .status(400)
            .json({
              msg: result?.message,
              payload: `${result?.message} ${result?.meta?.nextStep}`,
            });
        }
        return res.status(200).json({
          msg: 'successful',
          payload:
            'Your bank validation is underway. Check your in-app notification for the status in few minutes',
        });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async paystackBVNValidationWebhookResponse(body: any, res: Response) {
    // console.log('paystack webook response', body);
    try {
      const { event, data } = body;

      if (event === 'customeridentification.success') {
        const { email, identification } = data;
        const user = await this.User.findOne({ email });
        const updateduser = await this.User.findOneAndUpdate(
          { email },
          {
            $inc: { accountBankVerificationAttempts: 1 },
            $set: {
              firstName: user?.accountTempInfo?.legal_first_name,
              lastName: user?.accountTempInfo?.legal_last_name,
              accountBankCode: identification?.bank_code,
              accountNumber: user?.accountTempInfo?.account_number,
              accountBank: user?.accountTempInfo?.account_bank,
              bvn: user?.accountTempInfo?.bvn,
              accountBankVerified: true,
            },
          },
          { new: true },
        );

        await this.notificationservice.logSingleNotification(
          'Your bank account information is verified. Click to view verification status on your profile page',
          updateduser._id,
          '65c681387a7de5645968486f',
          `${process.env.FRONT_END_CONNECTION}/user/${updateduser._id}`,
          'account_verification',
        );
        return res.sendStatus(200);
      }

      if (event === 'customeridentification.failed') {
        const { email } = data;
        const updateduser = await this.User.findOneAndUpdate(
          { email },
          {
            $inc: { accountBankVerificationAttempts: 1 },
            $set: {
              accountBankCode: '',
              accountNumber: '',
              bvn: '',
              accountBankVerified: false,
            },
          },
          { new: true },
        );

        await this.notificationservice.logSingleNotification(
          `Your bank account verification failed: ${data?.reason}`,
          updateduser?._id,
          '65c681387a7de5645968486f',
          `${process.env.FRONT_END_CONNECTION}/user/${updateduser?._id}`,
          'account_verification',
        );
        return res.sendStatus(200);
      }
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }

  async payStackAccountBankValidation(
    account_number: string,
    bank_code: string | number,
    res: Response,
  ) {
    try {
      const url = `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`;
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
        console.log(result);
        if (result.status === 'error' || result.status === false) {
          return res.status(400).json({
            msg: 'Incorrect bank details. Please recheck that details supplied are right. Or contact customer support',
          });
        }
        return res.status(200).json({ msg: 'success', payload: result });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async payStackGetSupportedCountries(res: Response) {
    try {
      const url = `https://api.paystack.co/country`;
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
        if (result.status === 'error') {
          return res.status(400).json({
            msg: 'No bank is found for this particular country code',
          });
        }
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  //IN APP
  async getUserBalance(userId: string | number, currency: string) {
    try {
      const wallet = await this.wallet.findOne({
        userId,
      });
      if (!wallet) {
        throw new NotFoundException({
          msg: 'wallet with this user does not exist',
        });
      }
      const result = wallet.currencies.find((eachCur: any) => {
        return eachCur.currency_type === currency;
      });
      return { msg: 'succesful', balance: result };
      // return {
      //   msg: 'succesful',
      //   balance: wallet.balance,
      //   total_topup: wallet.total_topup,
      //   total_topup_percent_inc: wallet.total_topup_percent_inc,
      //   total_income_from_events: wallet.total_income_from_events,
      //   total_income_from_events_percent_inc:
      //     wallet.total_income_from_events_percent_inc,
      //   total_outflow: wallet.total_outflow,
      //   total_outflow_percent_dec: wallet.total_outflow_percent_dec,
      // };
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Something went wrong',
        log: err.message,
      });
    }
  }

  //IN APP
  async latestTransactions(userId: string | number, res: Response) {
    try {
      let lastTen = await this.transaction
        .find({ userId })
        .limit(10)
        .sort('-createdAt');
      if (lastTen?.length === 0 || !lastTen)
        return res.status(200).json({ msg: 'success', latestTransactions: [] });
      else
        return res
          .status(200)
          .json({ msg: 'success', latestTransactions: lastTen });
    } catch (err) {
      return res.status(500).json({
        msg: 'Something went wrong',
        log: err.message,
      });
    }
  }

  //IN APP
  //wallet one-time user transfer
  async transferMoneyToUser(
    userId: string,
    recipientId: string,
    currency: string,
    amount: number | string,
    response: Response,
    chargeAmount?: string,
  ) {
    try {
      if (Number(amount) <= 0) {
        return response
          .status(400)
          .json({ msg: 'amount must be greater than zero' });
      }
      //length
      //check if user and recipient are valid
      const user = await this.User.findOne({ _id: userId });
      const recipient = await this.User.findOne({ _id: recipientId });
      if (!user || !recipient) {
        throw new ForbiddenException(
          'forbidden request. Check recipient Id to confirm it is correct',
        );
      }
      // const isEligible = await this.authservice.confirmFeatureEligibility(
      //   'can_transfer_money_inapp',
      //   userId,
      //   );
      //   if (isEligible === false) {
      //     throw new ForbiddenException(
      //       'Transfering money in-app is not part of your subscription plan. Please upgrade your plan or purchase a bundle that contains the feature',
      //       );
      //   }
      // console.log('received', amount, recipientId, currency)
      await this.validateUserWallet(recipientId);
      const senderwallet = await this.decreaseWallet(userId, amount, currency);
      await this.createWalletTransactions(
        userId,
        false,
        'successful',
        currency,
        amount,
        'In-app Transfer',
        'In-app Transaction',
      );
      await this.createTransaction(
        userId,
        false,
        `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
        'successful',
        currency,
        amount,
        {
          email: user.email,
          phone_number: user.phoneNumber,
          name: `${user.firstName} ${user.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        'In-app Transfer',
        'In-app Transaction',
        'inapp',
        null,
        null,
        {
          recipientId: recipient?._id,
          recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
        },
      );

      const realamount = Number(amount) - Number(chargeAmount || 0);
      //Increase user wallet
      await this.increaseWallet(
        recipientId,
        realamount,
        currency,
        'wallet increment',
      );

      await this.createWalletTransactions(
        recipientId,
        true,
        'successful',
        currency,
        realamount,
        `Wallet Top-up: In-app credit from ${user?.firstName} ${user?.lastName}`,
        'In-app Transaction',
      );

      await this.createTransaction(
        recipientId,
        true,
        `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
        'successful',
        currency,
        realamount,
        {
          email: user?.email,
          phone_number: user?.phoneNumber,
          name: `${user?.firstName} ${user?.lastName}`,
        },
        `charityapp${Date.now()}${Math?.random()}`,
        `Wallet Top-up: In-app credit from ${user?.firstName} ${user?.lastName}`,
        'In-app Transaction',
        'inapp',
        null,
        {
          senderId: user?._id,
          senderName: `${user?.firstName} ${user?.lastName}`,
        },
      );
      const result = senderwallet?.currencies?.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      return response.status(200).json({ msg: 'succesful', payload: result });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //wallet recurrent user transfer
  async sendMoneyToUserRecurrent(
    userId: string,
    recipientId: string,
    currency: string,
    amount: number | string,
    inappRecurrentFreqUnit,
    inappRecurrentFreqValue,
    inappRecurrentEndDateMs,
    inappRecurrentUserName,
    inappRecurrentNote,
    response: Response,
    chargeAmount?: string,
  ) {
    try {
      //check that client passed the right date units
      if (
        inappRecurrentFreqUnit !== 'hours' &&
        inappRecurrentFreqUnit !== 'days' &&
        inappRecurrentFreqUnit !== 'weeks' &&
        inappRecurrentFreqUnit !== 'months'
      ) {
        return response
          .status(400)
          .json({ msg: 'Renewal date unit can only be days, weeks or months' });
      }
      //use frequency factor to detemine next withdrawal date, then reduce frq factor by 1.
      //if frq factor is ZERO, do nothing else

      let frequencyDateMilliseconds: number;
      if (inappRecurrentFreqUnit === 'hours') {
        frequencyDateMilliseconds =
          Number(inappRecurrentFreqValue) * 60 * 60 * 1000;
      }

      if (inappRecurrentFreqUnit === 'days') {
        frequencyDateMilliseconds =
          Number(inappRecurrentFreqValue) * 24 * 60 * 60 * 1000;
      }

      if (inappRecurrentFreqUnit === 'weeks') {
        frequencyDateMilliseconds =
          Number(inappRecurrentFreqValue) * 7 * 24 * 60 * 60 * 1000;
      }

      if (inappRecurrentFreqUnit === 'months') {
        frequencyDateMilliseconds =
          Number(inappRecurrentFreqValue) * 30 * 24 * 60 * 60 * 1000;
      }
      //calculate frequency factor
      let frequencyfactor =
        (inappRecurrentEndDateMs - Date.now()) / frequencyDateMilliseconds;

      frequencyfactor = Number(frequencyfactor.toFixed(0));

      //check if user and recipient are valid
      const user = await this.User.findOne({ _id: userId });
      const recipient = await this.User.findOne({ _id: recipientId });
      if (!user || !recipient) {
        throw new ForbiddenException(
          'forbidden request. Contact customer support',
        );
      }

      await this.validateUserWallet(recipientId);
      await this.validateUserWallet(userId);
      //check if user amount to be transefered to recipient
      // but before then, confirm if wallet has enough funds in currency specified
      const wallet = await this.wallet.findOne({ userId });

      //first declare a function for finding actual currency within wallet
      let particularCurrency = await wallet.currencies.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      //then check currency sufficiency
      const walletBalance = Number(particularCurrency?.balance);
      if (walletBalance < Number(amount)) {
        return response.status(400).json({
          msg: `Insufficient funds. Kindly fund your wallet with this event's currency ${currency} or reduce deposit amount`,
        });
      }

      //if wallet has sufficent funds, proceed to deduct the amount from said wallet
      const senderwallet = await this.decreaseWallet(userId, amount, currency);
      await this.createWalletTransactions(
        userId,
        false,
        'successful',
        currency,
        amount,
        'In-app Transfer',
        'In-app Transaction',
      );
      await this.createTransaction(
        userId,
        false,
        `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
        'successful',
        currency,
        amount,
        {
          email: user.email,
          phone_number: user.phoneNumber,
          name: `${user.firstName} ${user.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        'In-app Transfer',
        'In-app Transaction',
        'inapp',
        null,
        null,
        {
          recipientId: recipient?._id,
          recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
        },
      );

      const realamount = Number(amount) - Number(chargeAmount || 0);
      //Then fund the recipient wallet
      await this.increaseWallet(
        recipientId,
        realamount,
        currency,
        'wallet increment',
      );
      await this.createWalletTransactions(
        recipientId,
        true,
        'successful',
        currency,
        realamount,
        `Wallet Top-up: In-app credit from ${user?.firstName} ${user?.lastName}`,
        `In-app Transaction from ${
          inappRecurrentUserName || 'anonymous'
        } : ${inappRecurrentNote}`,
      );

      await this.createTransaction(
        recipientId,
        true,
        `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
        'successful',
        currency,
        realamount,
        {
          email: user.email,
          phone_number: user.phoneNumber,
          name: `${user.firstName} ${user.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        `Wallet Top-up: In-app credit from ${user?.firstName} ${user?.lastName}`,
        `In-app Transaction from ${
          inappRecurrentUserName || 'anonymous'
        } : ${inappRecurrentNote}`,
        'inapp',
        null,
        {
          senderId: user?._id,
          senderName: `${user?.firstName} ${user?.lastName}`,
        },
      );

      //NOW create RECURRENT PAYMENT REGISTER
      await this.recurrentPayment.create({
        senderId: userId,
        senderName: `${user?.firstName} ${user?.lastName}`,
        recipientId,
        recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
        amount,
        currency,
        frequencyfactor: inappRecurrentEndDateMs
          ? frequencyfactor - 1
          : Infinity,
        frequencyDateMilliseconds,
        renewalDateMicroSec: Date.now() + frequencyDateMilliseconds,
        type: 'individual',
        payment_medium: 'wallet',
      });

      const result = senderwallet?.currencies?.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      return response.status(200).json({ msg: 'successful', payload: result });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //card/bank one-time user transfer (response)
  async payStackOneTimeFundTransferResponse(reference: string, res: Response) {
    //for both card and bank payments.
    //All that is required is paystack's uniquely generated transaction reference

    //Sender's card account has been deducted. Confirm it via the paystack verify endpoint
    //Pull out the sender's ID and name, as well as other necessary parameters from the metadata.
    //reward recipient's wallet with the cash
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

        const result = response?.body;
        // console.log(result.data.metadata);

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
            senderId,
            senderName,
            senderEmail,
            senderPhone,
            recipientId,
            chargeAmount,
          } = metadata?.customer;
          try {
            const user = await this.User.findOne({ _id: senderId });
            const recipient = await this.User.findOne({ _id: recipientId });

            const transactionExists = await this.transaction.findOne({
              transactionId: id,
            });

            if (transactionExists) {
              return res.status(400).json({
                msg: 'Transaction already handled',
              });
            }

            const realamount = Number(amount / 100) - Number(chargeAmount || 0);
            // console.log(
            //   'realamount:',
            //   realamount,
            //   'chargeAmount:',
            //   chargeAmount,
            // );

            const senderWallet = await this.validateUserWallet(senderId);

            await this.validateUserWallet(recipientId);

            await this.increaseWallet(
              recipientId,
              realamount,
              currency,
              'one-time fund transfer',
            ); //transaction type can be any string | null

            //create wallet trx for recipient
            await this.createWalletTransactions(
              recipientId,
              true,
              status,
              currency,
              realamount,
              'Wallet Top-up',
              `Wallet funding of ${currency} ${realamount} from ${senderName}`,
            );

            //create trx for recipient
            await this.createTransaction(
              recipientId,
              true,
              id,
              status,
              currency,
              realamount,
              {
                name: `${recipient?.firstName} ${recipient?.lastName}`,
                email: recipient?.email,
                phone_number: recipient?.phoneNumber,
              },
              ref,
              'Wallet Top-up',
              `Wallet funding of ${currency} ${realamount} from ${senderName}`,
              'inapp',
              null,
              {
                senderId: user?._id,
                senderName: `${user?.firstName} ${user?.lastName}`,
              },
            );

            //create trx for sender
            await this.createTransaction(
              senderId,
              false,
              id,
              status,
              currency,
              realamount,
              {
                name: senderName,
                email: senderEmail,
                phone_number: senderPhone,
              },
              ref,
              'Card Bank Transfer',
              `Wallet funding of ${currency} ${realamount} to ${recipient.firstName} ${recipient.lastName}`,
              'inapp',
              null,
              null,
              {
                recipientId: recipient?._id,
                recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
              },
            );

            const specificCurrency = senderWallet?.currencies?.find(
              (eachCur: any) => {
                return eachCur?.currency_type === currency;
              },
            );
            return res
              .status(200)
              .json({ msg: 'successful', payload: specificCurrency });
          } catch (err) {
            return res.status(500).json({ msg: err?.message });
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ msg: err?.message });
    }
  }

  //card recurrent user transfer (response)
  async payStackRecurrentFundTransferResponse({
    cardPaymentRef,
    res,
  }: {
    cardPaymentRef: string;
    res: Response;
  }) {
    try {
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
        // console.log(result?.data?.metadata?.customer);
        if (result?.data?.status === 'success') {
          const {
            id,
            status,
            amount,
            currency,
            metadata,
            customer,
            authorization,
          } = result.data;
          // console.log(paystackamount);

          const {
            senderId,
            senderName,
            senderEmail,
            senderPhone,
            recipientId,
            aliasName,
            note,
            chargeAmount,
            frequencyDateValue,
            frequencyDateUnit,
            renewalEndDateMs,
          } = metadata?.customer;
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
            frequencyDateMilliseconds =
              Number(frequencyDateValue) * 60 * 60 * 1000;
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

          console.log('frequencyfactor', frequencyfactor);

          try {
            const transactionExists = await this.transaction.findOne({
              transactionId: id,
            });

            if (transactionExists) {
              throw new ForbiddenException({
                msg: `Transaction already exists. Contact customer support with this id: ${transactionExists}`,
              });
            }

            //PLUG TRANSFER CODE IN HERE
            const realamount = Number(amount) - Number(chargeAmount || 0);

            //recipient use document
            const user = await this.User.findOne({
              _id: senderId.trim(),
            });
            const recipient = await this.User.findOne({
              _id: recipientId.trim(),
            });

            await this.validateUserWallet(recipient?._id);

            //increase recipient's wallet
            await this.increaseWallet(
              recipient?._id,
              realamount,
              currency,
              'wallet increment',
            );

            //reciever's wallet trx
            await this.createWalletTransactions(
              recipient?._id,
              true,
              status,
              currency,
              realamount,
              'Wallet Top-up',
              `Paystack Top-up Received from ${senderName}`,
            );

            //reciever trx record
            await this.createTransaction(
              recipient._id,
              true,
              id,
              status,
              currency,
              realamount,
              {
                name: aliasName,
                email: recipient?.email,
                phone_number: recipient?.phoneNumber,
              },
              cardPaymentRef,
              'Wallet Top-up',
              `Paystack Top-up Received from ${senderName}`,
              'inapp',
              null,
              {
                senderId: user?._id,
                senderName: `${user?.firstName} ${user?.lastName}`,
              },
            );

            //sender transaction record
            await this.createTransaction(
              senderId,
              false,
              id,
              status,
              currency,
              Number(amount / 100),
              {
                name: aliasName,
                email: senderEmail,
                phone_number: senderPhone,
              },
              cardPaymentRef,
              'Card Bank Transfer',
              `${amount} sent to Received from ${recipient?.firstName} ${recipient?.lastName}`,
              'inapp',
              null,
              null,
              {
                recipientId: recipient?._id,
                recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
              },
            );

            //reduce frequencyfactor by 1, then pass info to recurrenpayment
            //create recurrent payment object
            await this.recurrentPayment.create({
              senderId,
              senderName: aliasName || senderName || 'Anonymous',
              recipientId,
              recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
              amount: Number(amount) / 100,
              currency: currency,
              note,
              frequencyfactor: renewalEndDateMs
                ? Number(frequencyfactor) - 1
                : Infinity,
              frequencyDateMilliseconds,
              renewalDateMicroSec: Date.now() + frequencyDateMilliseconds,
              type: 'individual',
              payment_medium: 'card', //enum: card, wallet
              card_authorization: { ...authorization, email: senderEmail },
            });
            // const specificCurrency = senderWallet?.currencies?.find(
            //   (eachCur: any) => {
            //     return eachCur?.currency_type === currency;
            //   },
            // );
            return res.status(200).json({
              msg: 'success',
              payload:
                'Donation successful. Recurrent payment successfully added',
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

  //CRON JOB
  //(individual wallet) recurring funding from payer card
  async recurrentPaymentWithCardForIndividualCron(res: Response) {
    try {
      //first find recurrent payment with all the right parameters
      const card_recurrence = await this.recurrentPayment.find({
        type: 'individual',
        payment_medium: 'card',
        frequencyfactor: {
          $gt: 0, //$gt: greater than
        },
        renewalDateMicroSec: {
          $lte: new Date().valueOf(), //$lte: lesser than or equal to
        },
      });

      console.log('start');
      console.log(card_recurrence);
      //WORKFLOW
      //loop through the above collected repayment array
      //make paystack call that charges each user's authorization code for previous card payments
      //reward concerned individual wallet with value
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
                senderId: userId,
                senderName,
                recipientId,
                recipientName,
                amount,
                currency,
              } = eachrecurrence;

              const user = await this.User.findOne({ _id: userId });
              const recipient = await this.User.findOne({ _id: recipientId });

              const userName = user
                ? `${user?.firstName} ${user?.lastName}`
                : 'Anonymous';
              const recieverName = recipient
                ? `${recipient?.firstName} ${recipient?.lastName}`
                : 'Anonymous';

              if (!user || !recipient) {
                console.log(
                  `senderID or RecipientId is wrong for this recurrent payment with id: ${eachrecurrence?._id}`,
                );
              }

              await this.validateUserWallet(recipientId);

              //create debit transaction for sender
              await this.createTransaction(
                userId,
                true,
                `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
                'successful',
                currency,
                amount,
                {
                  email: user.email,
                  phone_number: user.phoneNumber,
                  name: `${user.firstName} ${user.lastName}`,
                },
                `charityapp${Date.now()}${Math.random()}`,
                'In-app Transfer',
                'In-app Transaction',
                'inapp',
                null,
                null,
                {
                  recipientId: recipient?._id,
                  recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
                },
              );

              //Then fund the recipient's wallet
              await this.increaseWallet(
                recipientId,
                amount,
                currency,
                'wallet increment',
              );

              await this.createWalletTransactions(
                recipientId,
                true,
                'successful',
                currency,
                amount,
                'Wallet Top-up',
                `In-app Transaction from ${
                  senderName || userName
                } : ${'recurrent tranfer'}`,
              );

              await this.createTransaction(
                recipientId,
                true,
                `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
                'successful',
                currency,
                amount,
                {
                  email: recipient?.email,
                  phone_number: recipient?.phoneNumber,
                  name: recipientName || recieverName,
                },
                `charityapp${Date.now()}${Math.random()}`,
                'Wallet Top-up',
                `In-app Transaction from ${
                  userName || senderName
                } : ${'recurrent tranfer'}`,
                'inapp',
                null,
                {
                  senderId: user?._id,
                  senderName: `${user?.firstName} ${user?.lastName}`,
                },
              );

              eachrecurrence.frequencyfactor--;

              eachrecurrence.renewalDateMicroSec +=
                eachrecurrence.frequencyDateMilliseconds;
              if (!eachrecurrence.senderName) {
                eachrecurrence.senderName = userName;
              }
              if (!eachrecurrence.recipientName) {
                eachrecurrence.recipientName = recieverName;
              }
              await eachrecurrence.save();
              // console.log(eachrecurrence)
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
  //(individual wallet) recurring payment from payer's wallet
  async recurrentPaymentWithWalletForIndividualCron(res: Response) {
    try {
      let charity_wallet_recurrence = await this.recurrentPayment.find({
        type: 'individual',
        payment_medium: 'wallet',
        frequencyfactor: {
          $gt: 0, //right code is $gt
        },
        renewalDateMicroSec: {
          $lte: new Date().valueOf(), //right code is $lte
        },
      });

      // console.log(charity_wallet_recurrence);

      // console.log('res sent');

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
      // console.log('start');
      for (let eachrecurrence of charity_wallet_recurrence) {
        try {
          const {
            eventId,
            senderId: userId,
            senderName,
            recipientId,
            recipientName,
            amount,
            currency,
          } = eachrecurrence;

          const user = await this.User.findOne({ _id: userId });
          const recipient = await this.User.findOne({ _id: recipientId });
          const userName = user
            ? `${user?.firstName} ${user?.lastName}`
            : 'Anonymous';
          const recieverName = recipient
            ? `${recipient?.firstName} ${recipient?.lastName}`
            : 'Anonymous';

          //  Inplace of below event code, charge user instead
          if (!user || !recipient) {
            throw new ForbiddenException(
              'forbidden request. Contact customer support',
            );
          }

          await this.validateUserWallet(recipientId);
          await this.validateUserWallet(userId);
          //check if user amount to be transefered to recipient
          // but before then, confirm if wallet has enough funds in currency specified
          const wallet = await this.wallet.findOne({ userId });

          //first declare a function for finding actual currency within wallet
          let particularCurrency = await wallet.currencies.find(
            (eachCur: any) => {
              return eachCur?.currency_type === currency;
            },
          );

          //then check currency sufficiency
          const walletBalance = Number(particularCurrency?.balance);
          if (walletBalance < Number(amount)) {
            console.log({
              msg: `Insufficient funds. ${userName} with userId: ${userId} does not have up to ${currency} ${amount} in their wallet`,
            });
          }

          //if sender wallet has sufficent funds, deduct wallet
          await this.decreaseWallet(userId, Number(amount), currency);
          await this.createWalletTransactions(
            userId,
            true,
            'successful',
            currency,
            amount,
            'In-app Transfer',
            'In-app Transaction',
          );
          await this.createTransaction(
            userId,
            true,
            `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
            'successful',
            currency,
            amount,
            {
              email: user.email,
              phone_number: user.phoneNumber,
              name: `${user.firstName} ${user.lastName}`,
            },
            `charityapp${Date.now()}${Math.random()}`,
            'In-app Transfer',
            'In-app Transaction',
            'inapp',
            null,
            null,
            {
              recipientId: recipient?._id,
              recipientName: `${recipient?.firstName} ${recipient?.lastName}`,
            },
          );

          //Then fund the recipient's wallet
          await this.increaseWallet(
            recipientId,
            amount,
            currency,
            'wallet increment',
          );

          await this.createWalletTransactions(
            recipientId,
            true,
            'successful',
            currency,
            amount,
            'Wallet Top-up',
            `In-app Transaction from ${
              userName || 'anonymous'
            } : ${'recurrent tranfer'}`,
          );

          await this.createTransaction(
            recipientId,
            true,
            `${(Math.random() * 10000).toFixed(0)}${Date.now()}`,
            'successful',
            currency,
            amount,
            {
              email: recipient?.email,
              phone_number: recipient?.phoneNumber,
              name: `${recipient?.firstName} ${recipient?.lastName}`,
            },
            `charityapp${Date.now()}${Math.random()}`,
            'Wallet Top-up',
            `In-app Transaction from ${
              userName || 'anonymous'
            } : ${'recurrent tranfer'}`,
            'inapp',
            null,
            {
              senderId: user?._id,
              senderName: `${user?.firstName} ${user?.lastName}`,
            },
          );

          eachrecurrence.frequencyfactor--;

          eachrecurrence.renewalDateMicroSec +=
            eachrecurrence.frequencyDateMilliseconds;
          if (!eachrecurrence.senderName) {
            eachrecurrence.senderName = userName;
          }
          if (!eachrecurrence.recipientName) {
            eachrecurrence.recipientName = recieverName;
          }
          await eachrecurrence.save();
          // console.log(eachrecurrence)
        } catch (err) {
          console.log({
            msg: `error from charity wallet recur payment: ${err.message}`,
          });
        }
      }

      // console.log('finish');
    } catch (err) {
      console.log({
        msg: `error from charity wallet recur payment: ${err.message}`,
      });
    }
  }

  async chargeUserAsPenalty(
    userId: string,
    chargeClientId: string,
    chargeHeading: string,
    chargeDescription: string,
    chargeCurrency: string,
    chargeAmount: number | string,
    response: Response,
  ) {
    try {
      //check if user and recipient are valid
      const admin = await this.User.findOne({ _id: userId });
      const client = await this.User.findOne({ _id: chargeClientId });
      if (!admin || !admin?.isAdmin) {
        throw new ForbiddenException(
          'forbidden request. Contact customer support',
        );
      }
      if (!client) {
        throw new ForbiddenException(
          'Client does not exist. Id may be wrong or client account has been deleted.',
        );
      }
      if (client?.isAdmin) {
        throw new ForbiddenException(
          'You cannot charge or penalize a fellow admin',
        );
      }
      let repeatCharging = client.penalty.find((eachPen: any) => {
        return (
          // eachPen._id.toString() === chargeClientId &&
          Number(eachPen.chargeAmount) === Number(chargeAmount) &&
          eachPen.chargeCurrency === chargeCurrency &&
          eachPen.chargeDescription === chargeDescription &&
          eachPen.chargeHeading === chargeHeading
        );
      });
      if (repeatCharging) {
        throw new BadRequestException(
          'You may be sending the same charge twice. Please enter a new description or heading to show difference',
        );
      }
      await this.User.findOneAndUpdate(
        { _id: chargeClientId },
        {
          $push: {
            penalty: {
              adminId: admin?._id,
              adminName: `${admin?.firstName} ${admin?.lastName}`,
              chargeCurrency,
              chargeAmount: Number(chargeAmount),
              chargeHeading,
              chargeDescription,
            },
          },
        },
        { new: true },
      );
      return response.status(200).json({ msg: 'succesful' });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //IN APP
  async settleCharge(
    userId: string,
    chargeId: string,
    chargeAmount: number,
    chargeCurrency: string,
    response: Response,
  ) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException('This user doen not exist');
      }
      const singlePenalty = user?.penalty?.find((eachPen: any) => {
        return eachPen._id.toString() === chargeId;
      });
      // console.log(singlePenalty);
      if (
        Number(singlePenalty?.chargeAmount) !== Number(chargeAmount) ||
        singlePenalty?.chargeCurrency !== chargeCurrency
      ) {
        throw new BadRequestException(
          'currency or charge amount may have been tampered with. Send the right data or contact customer care',
        );
      }
      const updatePenalty = await this.User.findOneAndUpdate(
        { _id: userId },
        {
          $pull: {
            penalty: {
              _id: chargeId,
            },
          },
        },
        { new: true },
      );
      if (!updatePenalty) {
        return response.status(400).json({
          msg: 'unsuccessful',
          payload:
            'Could not settle charge. Contact support support with this error message',
        });
      }
      await this.validateUserWallet(userId);
      await this.decreaseWallet(userId, chargeAmount, chargeCurrency);
      await this.createWalletTransactions(
        userId,
        false,
        'success',
        chargeCurrency,
        Number(chargeAmount),
        'Wallet Withdraw',
        `charge/penalty settlement`,
        undefined,
        undefined,
      );
      await this.createTransaction(
        userId,
        false,
        `${(Math.random() * 10000).toFixed(0)}`,
        'success',
        chargeCurrency,
        Number(chargeAmount),
        {
          email: user.email,
          phone_number: user.phoneNumber,
          name: `${user.firstName} ${user.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        'Wallet Withdraw',
        `charge/penalty settlement`,
      );
      // console.log(updatePenalty);
      const {
        email,
        firstName,
        lastName,
        phoneNumber,
        _id,
        isVerified,
        isAdmin,
        subscription,
        bundle,
        penalty,
      } = user;

      return response.status(200).json({
        msg: 'success',
        user: {
          _id,
          email: email,
          firstName,
          lastName,
          phoneNumber,
          accountBank: user.accountBank,
          accountNumber: user.accountNumber,
          accountName: user.accountName,
          accountBankCode: user.accountBankCode,
          accountCurrency: user.accountCurrency,
          isVerified,
          isAdmin,
          subscription,
          bundle,
          penalty: penalty?.length > 0 ? updatePenalty?.penalty : [],
        },
      });
      // response.status(200).json({ msg: 'success', penalty: updatePenalty });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err?.message });
    }
  }

  //get Fiat exchange rate (EXCHANGE RATEs API)
  async getFiatExchangeRates(
    userId: string,
    from: string,
    to: string,
    amount: string | number,
    @Res() respon?: any,
  ) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'You are not permitted to perform this action',
        );
      }
      let url =
        'http://api.exchangeratesapi.io/v1/latest?access_key=440ba96caa3491b47c82c3ad055d8e52';
      const options = {
        method: 'GET',
        url,
      };
      request(options, async (error: any, response: any) => {
        if (error) {
          return error;
        }
        const resp = await JSON.parse(response.body);
        let to_value = undefined;
        if (resp.rates[from] && resp.rates[to]) {
          // console.log((Number(amount) / resp.rates[from]) * resp.rates[to]);
          to_value = (Number(amount) / resp.rates[from]) * resp.rates[to];
          return respon.status(200).json(to_value);
        } else {
          return respon.status(400).json({
            msg: `This currency pair is not available. Please contact customer support`,
          });
        }
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  //IN APP
  async convertWalletCurrency(
    userId: string,
    from: string,
    to: string,
    amount: string | number,
    @Res() respon?: any,
  ) {
    try {
      let user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'You are not allowed to perform this action',
        );
      }
      const isEligible = await this.authservice.confirmFeatureEligibility(
        'can_use_currency_conversion',
        userId,
      );
      if (isEligible === false) {
        throw new ForbiddenException(
          'Currency conversion is not part of your subscription plan. Please upgrade your plan or purchase a bundle that contains the feature',
        );
      }

      let url =
        'http://api.exchangeratesapi.io/v1/latest?access_key=440ba96caa3491b47c82c3ad055d8e52';
      const options = {
        method: 'GET',
        url,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return error;
        }
        try {
          const resp = await JSON.parse(response.body);
          let to_value = undefined;
          if (resp.rates[from] && resp.rates[to]) {
            to_value = (Number(amount) / resp.rates[from]) * resp.rates[to];
            const test = await this.decreaseWallet(
              userId,
              Number(amount).toFixed(2),
              from,
            );
            if (!(test.statusCode > 399)) {
              await this.createWalletTransactions(
                userId,
                false,
                'success',
                from,
                Number(amount),
                'Wallet Withdraw',
                `${from} in-app conversion`,
                undefined,
                undefined,
              );
              await this.createTransaction(
                userId,
                false,
                `${(Math.random() * 10000).toFixed(0)}`,
                'success',
                from,
                Number(amount),
                {
                  email: user.email,
                  phone_number: user.phoneNumber,
                  name: `${user.firstName} ${user.lastName}`,
                },
                `charityapp${Date.now()}${Math.random()}`,
                'Wallet Withdraw',
                `${from} in-app conversion`,
              );

              const newWallet = await this.increaseWallet(
                userId,
                to_value.toFixed(2),
                to,
                `wallet increment`,
              );
              await this.createWalletTransactions(
                userId,
                true,
                'success',
                to,
                Number(to_value.toFixed(2)),
                'Wallet Top-up',
                `${to} in-app conversion funding`,
                undefined,
                undefined,
              );
              await this.createTransaction(
                userId,
                true,
                `${(Math.random() * 10000).toFixed(0)}`,
                'success',
                `${to}`,
                Number(to_value.toFixed(2)),
                {
                  email: user.email,
                  phone_number: user.phoneNumber,
                  name: `${user.firstName} ${user.lastName}`,
                },
                `charityapp${Date.now()}${Math.random()}`,
                'Wallet Top-up',
                `${to} in-app conversion funding`,
              );
              return respon.status(200).json(newWallet);
            } else {
              //Do nothing, else you set double headers and break server
            }
          } else {
            return respon.status(400).json({
              msg: 'This currency pair is not available. Please contact customer support',
            });
          }
        } catch (err) {
          return respon.status(400).json({
            msg: err.message,
          });
          // throw new InternalServerErrorException({ msg: err.message });
        }
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
}

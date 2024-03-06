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
import { Model } from 'mongoose';
import * as request from 'request';
import * as Flutterwave from 'flutterwave-node-v3';
import * as coinbase from 'coinbase-commerce-node';
import * as coinbase2 from 'coinbase';
import { currency_array } from '../util';
import { Response, response } from 'express';
import { AuthService } from 'src/authModule/auth.service';
import { ModuleRef } from '@nestjs/core';
import { NotifService } from 'src/notificationModule/notifService';

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
      isInflow: true,
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
    userId: string,
    id: string,
    status: string,
    currency: string | number,
    amount: string | number,
    customer: { name: string; email: string; phone_number: string },
    tx_ref: string,
    description: string,
    narration: string,
    paymentGateway?: string,
    link?: string,
  ) {
    const transaction = this.transaction.create({
      userId,
      transactionId: id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone_number,
      amount,
      currency,
      tx_ref,
      paymentStatus: status,
      paymentGateway: paymentGateway ? paymentGateway : 'flutterwave',
      description,
      narration,
      link: link ? link : '',
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
    let percent_inc = 0;
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
          'currencies.$.balance': -Number(amount).toFixed(2),
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
        'new',
        currency,
        amount,
        'crypto funding',
        `temporary charge created`,
      );
      await this.createTransaction(
        userId,
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
  //FL verify account not working properly. Return "incorrect bank" error
  async verifyAccount(
    account_number: string | number,
    account_bank: string,
    country: string,
    res: any,
  ) {
    try {
      // const flw = new Flutterwave(
      //   process.env.FLUTTERWAVE_V3_PUBLIC_KEY,
      //   process.env.FLUTTERWAVE_V3_SECRET_KEY,
      // );
      // console.log({ account_bank, account_number, country });
      // const details = {
      //   account_number,
      //   account_bank,
      //   country,
      // };
      // const accDetails = await flw.Misc.verify_Account(details);
      // return { accDetails };
      const url = `https://api.flutterwave.com/v3/accounts/resolve`;
      const options = {
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
        },
        body: { account_bank, account_number, country },
        json: true,
      };

      request(options, async (error: any, response: any) => {
        if (error) {
          return res
            .status(400)
            .json({ msg: 'Something went wrong with fetching banks' });
        }
        // console.log(response.body);
        const result = response?.body;
        if (result.status === 'error') {
          return res
            .status(400)
            .json({ msg: 'No bank is found for this particular bank details' });
        }
        return res.status(200).json({ response: result });
      });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
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
        // 'FLWPUBK-24b4db4ba5c49a5e48daac3eabcd563b-X',
        `${process.env.FLUTTERWAVE_V3_PUBLIC_KEY}`,
        `${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
      );
      const response = await flw.Transaction.verify({
        id: `${transaction_id}`,
      });
      const { status, currency, id, amount, customer, tx_ref, narration } =
        response.data;

      console.log('flutter response status', status);

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

      const realamount = amount - Number(chargeAmount);
      await this.createWalletTransactions(
        user._id,
        status,
        currency,
        realamount,
        description,
        narration,
      );

      await this.createTransaction(
        user._id,
        id,
        status,
        currency,
        realamount,
        customer,
        tx_ref,
        description,
        narration,
      );

      const wallet = await this.updateWallet(user._id, realamount, currency);
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
    amount: number | string,
    currency: string,
    account_bank: string,
    account_number: number | string,
    response: Response,
  ) {
    try {
      const user = await this.User.findOne({ _id: userId });
      if (!user) {
        throw new ForbiddenException(
          'forbidden request. This user doen not exist',
        );
      }
      //amount below 100 cannot be sent
      // console.log(userId, amount, currency, account_bank, account_number);
      await this.validateUserWallet(userId);
      await this.decreaseWallet(userId, amount, currency); //It is necessary to call this here because a code within this method checks if user has requested amount in their wallet
      // await this.createWalletTransactions(userId)
      const walletTrans = await this.createWalletTransactions(
        userId,
        'pending',
        currency,
        amount,
        'Wallet Withdraw',
        'Bank Transfer',
      );
      // const { account_bank, account_number } = user.bankDetails;
      const callback_url =
        'https://charityapp.cyclic.app/respond_to_fl_bank_payment';
      const reference = `${user.firstName}_${user.lastName}_${Date.now()}`;
      const data = {
        account_bank,
        account_number: account_number,
        amount: Number(amount),
        narration: `Transfer from ${user.firstName} ${user.lastName} @CharityApp`,
        currency,
        reference,
        callback_url,
        debit_currency: 'NGN',
        meta: {
          first_name: user.firstName,
          last_name: user.lastName,
          mobile_number: user.phoneNumber,
          email: user.email,
          beneficiary_country: user.country || 'NG',
          beneficiary_occupation: 'merchant',
          beneficiary_id: userId,
          wallettransaction_id: walletTrans._id,
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
      console.log(result);
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
        result?.data?.id,
        'pending',
        currency,
        amount,
        {
          email: user.email,
          phone_number: user.phoneNumber,
          name: `${user.firstName} ${user.lastName}`,
        },
        `charityapp${Date.now()}${Math.random()}`,
        'Wallet Withdraw',
        'Bank Transaction: Flutterwave bank transfer',
      );
      response.status(200).json({ msg: 'success', result });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  //FL bank payment listener
  async respondToFLBankPayment(body: any) {
    const { id, currency, amount, meta, narration, status } = body.data;
    if (status === 'SUCCESSFUL') {
      await this.updateTransactionStatus(
        id,
        'succesful',
        'amount deposited to bank',
      );
      await this.updateWalletTransactionStatus(
        meta?.wallettransaction_id,
        'succesful',
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
      console.log(currency);
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
        console.log(response.body);
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
            status,
            currency,
            amount,
            'Wallet Top-up',
            'Paystack Top-up Received',
          );

          await this.createTransaction(
            user._id,
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
    bvn,
    bank_code,
    res,
  }: {
    userId: string;
    // country:string,
    account_number: string;
    bvn: string;
    bank_code: string;
    res: Response;
  }) {
    try {
      // const user = await this.User.findOne({ _id: '65c681387a7de5645968486f' });
      const user = await this.User.findOneAndUpdate(
        { _id: userId },
        { $set: { accountTempInfo: { account_number, bvn } } },
      );
      if (!user) {
        return res
          .status(400)
          .json({ msg: 'unauthorized access', payload: 'User dos not exist' });
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
        first_name: user?.firstName,
        // last_name: 'Okoro',
        last_name: user?.lastName,
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
          return res.status(400).json({ msg: result?.message });
        }
        return res.status(200).json({
          msg: 'successful',
          payload:
            'Your bank validation is underway. Check your in-app notification for the status',
        });
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }

  async paystackBVNValidationWebhookResponse(body: any, res: Response) {
    // console.log(body);
    try {
      const { event, data } = body;
      const { email, identification } = data;
      const user = await this.User.findOne({email})
      
      if (event === 'customeridentification.success') {
        const updateduser = await this.User.findOneAndUpdate(
          { email },
          {
            $inc: { accountBankVerificationAttempts: 1 },
            $set: {
              accountBankCode: identification?.bank_code,
              accountNumber: user?.accountTempInfo?.account_number,
              bvn: user?.accountTempInfo?.bvn,
              accountBankVerified: true,
            },
          },
          { new: true },
        );

        await this.notificationservice.logSingleNotification(
          'Your bank account information is now verified',
          updateduser._id,
          '65c681387a7de5645968486f',
          `${process.env.FRONT_END_CONNECTION}/user/${updateduser._id}`,
          'account_verification',
        );
        return res.sendStatus(200);
      }

      if (event === 'customeridentification.failure') {
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
        console.log(result)
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
  async latestTransactions(userId: string | number) {
    try {
      const lastTen = await this.wallettransaction
        .find({ userId })
        .limit(10)
        .sort('-createdAt');
      if (lastTen.length === 0)
        throw new NotFoundException({ msg: 'No Transactions present' });
      else return { msg: 'success', latestTransactions: lastTen };
    } catch (err) {
      throw new InternalServerErrorException({
        msg: 'Something went wrong',
        log: err.message,
      });
    }
  }

  //IN APP
  async transferMoneyToUser(
    userId: string,
    recipientId: string,
    currency: string,
    amount: number | string,
    response: Response,
    chargeAmount?: string,
  ) {
    try {
      //length
      //check if user and recipient are valid
      const user = await this.User.findOne({ _id: userId });
      const recipient = await this.User.findOne({ _id: recipientId });
      if (!user || !recipient) {
        throw new ForbiddenException(
          'forbidden request. Contact customer support',
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
      const senderwallet = await this.decreaseWallet(
        userId,
        Number(amount),
        currency,
      );
      await this.createWalletTransactions(
        userId,
        'successful',
        currency,
        amount,
        'In-app Transfer',
        'In-app Transaction',
      );
      await this.createTransaction(
        userId,
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
      );

      //Increase user wallet
      await this.increaseWallet(
        recipientId,
        amount,
        currency,
        'wallet increment',
      );
      await this.createWalletTransactions(
        recipientId,
        'successful',
        currency,
        amount,
        'Wallet Top-up',
        'In-app Transaction',
      );
      await this.createTransaction(
        recipientId,
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
        'Wallet Top-up',
        'In-app Transaction',
      );
      const result = senderwallet?.currencies?.find((eachCur: any) => {
        return eachCur.currency_type === currency;
      });
      return response.status(200).json({ msg: 'succesful', balance: result });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async transferMoneyToUserRecurrent(
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
      //length
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
      const senderwallet = await this.decreaseWallet(
        userId,
        Number(amount),
        currency,
      );
      await this.createWalletTransactions(
        userId,
        'successful',
        currency,
        amount,
        'In-app Transfer',
        'In-app Transaction',
      );
      await this.createTransaction(
        userId,
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
      );

      //The fund the recipient wallet
      await this.increaseWallet(
        recipientId,
        amount,
        currency,
        'wallet increment',
      );
      await this.createWalletTransactions(
        recipientId,
        'successful',
        currency,
        amount,
        'Wallet Top-up',
        `In-app Transaction from ${
          inappRecurrentUserName || 'anonymous'
        } : ${inappRecurrentNote}`,
      );

      await this.createTransaction(
        recipientId,
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
        'Wallet Top-up',
        `In-app Transaction from ${
          inappRecurrentUserName || 'anonymous'
        } : ${inappRecurrentNote}`,
      );

      //NOW
      //ADD
      //RECURRENT PAYMENT REGISTER
      //HERE

      await this.recurrentPayment.create({
        senderId: userId,
        recipientId,
        amount,
        currency,
        frequencyfactor: frequencyfactor - 1,
        frequencyDateMilliseconds,
        renewalDateMicroSec: Date.now() + frequencyDateMilliseconds,
        type: 'individual',
      });

      const result = senderwallet?.currencies?.find((eachCur: any) => {
        return eachCur?.currency_type === currency;
      });
      return response.status(200).json({ msg: 'successful', balance: result });
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
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

  //
}

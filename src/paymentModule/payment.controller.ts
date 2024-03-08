import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Res,
  Req,
  RawBodyRequest,
  Put,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response, query, response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  AcceptCoinbaseCryptoDTO,
  ChargeUserAsPenaltyINAPPDTO,
  ConvertWalletCurrencyINAPPDTO,
  FiatExchangeRateINAPPDTO,
  FlListenToBankTranferDTO,
  PayStackBVNIdentityValidationDTO,
  PayStackBVNValidationResponseDTO,
  PayStackCreateChargeDTO,
  PayStackUpdateCustomerDTO,
  PaystackValidateBankAccountDTO,
  SendMoneyToUserBankDTO,
  SendMoneyToUserINAPPDTO,
  SettleUserChargeINAPPDTO,
  TransferMoneyToUserRecurrentlyINAPPDTO,
  WalletBalanceDTO,
  fetchCountryBankDTO,
  flVerifyBVNDetailsDTO,
  sendCryptoToExternalWalletDTO,
} from './payment.dto';
@Controller()
export class PaymentController {
  constructor(private readonly paymentservice: PaymentService) {}
  public validateUserWallet(userId: string) {
    return this.paymentservice.validateUserWallet(userId);
  }
  public createWalletTransaction(
    userId: string,
    status: string,
    currency: string | number,
    amount: string | number,
    description: string,
    narration: string,
  ) {
    return this.paymentservice.createWalletTransactions(
      userId,
      status,
      currency,
      amount,
      description,
      narration,
    );
  }
  public createTransaction(
    userId: string,
    id: string,
    status: string,
    currency: string | number,
    amount: string | number,
    customer: any,
    tx_ref: string,
    description: string,
    narration: string,
  ) {
    return this.paymentservice.createTransaction(
      userId,
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
  public updateWallet(
    userId: string,
    amount: string | number,
    currency: string,
  ) {
    return this.paymentservice.updateWallet(userId, amount, currency);
  }

  // @Post('test-address')
  // @ApiTags('Payment')
  // testAdd(@Body('test') test: any) {
  //   return { msg: 'endpoint hit', test };
  // }

  //coinbase
  @Post('send_crypto_to_external_wallet')
  @ApiTags('Payment')
  sendCryptoExternalWallet(
    @Body() body: sendCryptoToExternalWalletDTO,
    @Res() response: Response,
  ) {
    const { amount, cryptoCurrencySymbol, externalWalletAddress, userId } =
      body;
    return this.paymentservice.sendCryptoToExternalWallet(
      amount,
      cryptoCurrencySymbol,
      externalWalletAddress,
      userId,
      response,
    );
  }

  //coinbase
  @Post('crypto_webhooks')
  @ApiTags('Payment')
  cryptoWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const rawData = req.rawBody;
    const hookHeader = req.headers['x-cc-webhook-signature'];
    return this.paymentservice.cryptoWebhook(rawData, hookHeader, res);
  }

  //coinbase
  @Post('accept_cb_crypto')
  @ApiTags('Payment')
  acceptCrypto(@Body() body: AcceptCoinbaseCryptoDTO) {
    const { amount, currency, userId } = body;
    return this.paymentservice.acceptCrypto(userId, amount, currency);
  }

  //flutterwave
  @Get('response')
  @ApiTags('Payment')
  paymentresponse(
    @Query('transaction_id') transaction_id: string,
    @Query('description') description: string,
    @Query('chargeAmount') chargeAmount: string,
  ) {
    return this.paymentservice.paymentresponse(
      transaction_id,
      description,
      chargeAmount,
    );
  }

  //flutterwave
  @Get('verify_account_details')
  @ApiTags('Payment')
  verifyAcount(
    @Query('account_number') account_number: string,
    @Query('account_bank') account_bank: string,
    @Query('country') country: string,
    @Res() response: any,
  ) {
    return this.paymentservice.verifyAccount(
      account_number,
      account_bank,
      country,
      response,
    );
  }

  //flutterwave
  @Post('fl_verify_bvn_details')
  @ApiTags('Payment')
  async flVerifyBVNDetails(
    @Body() body: flVerifyBVNDetailsDTO,
    @Res() res: any,
  ) {
    const { firstname, lastname, bvn } = body;
    return this.paymentservice.flVerifyBVNDetails({
      firstname,
      lastname,
      bvn,
      res,
    });
  }

  //flutterwave
  @Get('fetch_country_banks/:country')
  @ApiTags('Payment')
  getCountryBanks(@Param() param: fetchCountryBankDTO, @Res() response: any) {
    const { country } = param;
    return this.paymentservice.getCountryBanks(country, response);
    // return response.status(200).json({ response: result });
  }

  //flutterwave send money to account
  @Post('/send_money_to_user_bank')
  @ApiTags('Payment')
  sendMoneyToFLBankAccount(
    @Body() body: SendMoneyToUserBankDTO,
    @Res() res: Response,
  ) {
    const { amount, userId, currency, account_bank, account_number } = body;
    return this.paymentservice.flSendMoneyToBank(
      userId,
      amount,
      currency,
      account_bank,
      account_number,
      res,
    );
  }

  @Post('/respond_to_fl_bank_payment')
  @ApiTags('Payment')
  flRespondToPayment(@Body() body: FlListenToBankTranferDTO) {
    return this.paymentservice.respondToFLBankPayment(body);
  }

  //flutterwave check balance in dashboard wallet
  @Get('/get_fl_dashboard_wallet_balance_by_currency')
  @ApiTags('Payment')
  flGetWalletBalance(
    @Res() response: Response,
    @Query('currency') currency?: string,
  ) {
    return this.paymentservice.flGetWalletBalance(currency, response);
  }

  //paystack
  @Post('paystack_create_charge')
  @ApiTags('Payment')
  payStackCreateCharge(
    @Body() body: PayStackCreateChargeDTO,
    @Res() response: Response,
  ) {
    const {
      email,
      amount,
      last_name,
      first_name,
      phone,
      callback_url,
      currency,
      ref,
    } = body;
    return this.paymentservice.payStackCreateCharge(
      email,
      amount,
      last_name,
      first_name,
      phone,
      currency,
      callback_url,
      ref,
      response,
    );
  }

  @Get('paystack_payment_response')
  @ApiTags('Payment')
  payStackPaymentResponse(
    @Query('reference') reference: string,
    @Res() response: Response,
  ) {
    return this.paymentservice.payStackPaymentResponse(reference, response);
  }

  @Get('paystack_charity_fund_response')
  @ApiTags('Payment')
  payStackCharityFundingResponse(
    @Query('reference') reference: string,
    @Res() response: Response,
  ) {
    return this.paymentservice.payStackCharityFundingResponse(
      reference,
      response,
    );
  }

  @Get('paystack_get_banks')
  @ApiTags('Payment')
  payStackGetBanks(
    @Query('country') country: string,
    @Res() response: Response,
  ) {
    return this.paymentservice.payStackGetBanks(country, response);
  }

  @Get('paystack_create_test_customer')
  @ApiTags('Payment')
  async createTestCustomer(@Res() res: Response) {
    // const { userId } = param;
    return this.paymentservice.createTestCustomer(res);
  }

  @Get('get_paystack_customer_list/:userId')
  @ApiTags('Payment')
  async getPayStackCustomerList(
    // @Param() param: PayStackBVNIdentityValidationDTO,
    @Res() res: Response,
  ) {
    // const { userId } = param;
    return this.paymentservice.getPayStackCustomerList({ res });
  }

  @Put('paystack_update_customer_details/:customer_code')
  @ApiTags('Payment')
  async payStackUpdateCustomer(
    @Param('customer_code') customer_code: string,
    @Body() body: PayStackUpdateCustomerDTO,
    @Res() res: Response,
  ) {
    return this.paymentservice.payStackUpdateCustomer({
      customer_code,
      body,
      res,
    });
  }

  @Post('paystack_bvn_identity_validation')
  @ApiTags('Payment')
  async payStackBVNIdentityValidation(
    @Body() body: PayStackBVNIdentityValidationDTO,
    @Res() res: Response,
  ) {
    const { userId, account_number, bvn, bank_code } = body;
    return await this.paymentservice.payStackBVNIdentityValidation({
      userId,
      // country,
      account_number,
      bvn,
      bank_code,
      res,
    });
  }

  @Post('paystack_bvn_validation_webhook_response')
  @ApiTags('Payment')
  async paystackBVNValidationWebhookResponse(
    @Body()
    body: PayStackBVNValidationResponseDTO,
    @Res() res: Response,
  ) {
    // console.log(body);
    return await this.paymentservice.paystackBVNValidationWebhookResponse(
      body,
      res,
    );
  }

  @Get('paystack_validate_bank_account')
  @ApiTags('Payment')
  payStackAccountBankValidation(
    @Query() query: PaystackValidateBankAccountDTO,
    @Res() response: Response,
  ) {
    const { account_number, account_bank: bank_code } = query;
    return this.paymentservice.payStackAccountBankValidation(
      account_number,
      bank_code,
      response,
    );
  }

  @Get('paystack_get_supported_countries')
  @ApiTags('Payment')
  payStackGetSupportedCountries(@Res() response: Response) {
    return this.paymentservice.payStackGetSupportedCountries(response);
  }

  //in app endpoints
  @Get('/:userId/:currency/get_wallet_balance')
  @ApiTags('Payment')
  getUserBalance(@Param() allParams: WalletBalanceDTO) {
    const { userId, currency } = allParams;
    return this.paymentservice.getUserBalance(userId, currency);
  }

  @Post('latest_transactions')
  @ApiTags('Payment')
  latestTransactions(@Body('userId') userId: string) {
    return this.paymentservice.latestTransactions(userId);
  }

  @Post('send_money_to_user')
  @ApiTags('Payment')
  sendMoneyToUser(
    @Body() body: SendMoneyToUserINAPPDTO,
    @Res() response: Response,
  ) {
    const { userId, recipientId, currency, amount } = body;
    return this.paymentservice.transferMoneyToUser(
      userId,
      recipientId,
      currency,
      amount,
      response,
    );
  }

  @Post('send_money_to_recurrent_user')
  @ApiTags('Payment')
  transferMoneyToUserRecurrent(
    @Body() body: TransferMoneyToUserRecurrentlyINAPPDTO,
    @Res() response: Response,
  ) {
    const {
      userId,
      recipientId,
      currency,
      amount,
      inappRecurrentFreqUnit,
      inappRecurrentFreqValue,
      inappRecurrentEndDateMs,
      inappRecurrentUserName,
      inappRecurrentNote,
    } = body;
    return this.paymentservice.transferMoneyToUserRecurrent(
      userId,
      recipientId,
      currency,
      amount,
      inappRecurrentFreqUnit,
      inappRecurrentFreqValue,
      inappRecurrentEndDateMs,
      inappRecurrentUserName,
      inappRecurrentNote,
      response,
    );
  }

  @Post('get_fiat_exchange_rates')
  @ApiTags('Payment')
  async getFiatExchangeRates(
    @Body() body: FiatExchangeRateINAPPDTO,
    @Res() response: Response,
  ) {
    const { userId, from, to, amount } = body;
    return this.paymentservice.getFiatExchangeRates(
      userId,
      from,
      to,
      amount,
      response,
    );
  }

  @Post('convert_wallet_currency')
  @ApiTags('Payment')
  async convertWalletCurrency(
    @Body() body: ConvertWalletCurrencyINAPPDTO,
    @Res() response: any,
  ) {
    const { userId, from, to, amount } = body;
    return this.paymentservice.convertWalletCurrency(
      userId,
      from,
      to,
      amount,
      response,
    );
  }

  @Post('charge_user_as_penalty')
  @ApiTags('Payment')
  async chargeUserAsPenalty(
    @Body() body: ChargeUserAsPenaltyINAPPDTO,
    @Res() response: any,
  ) {
    const {
      userId,
      chargeClientId,
      chargeCurrency,
      chargeAmount,
      chargeHeading,
      chargeDescription,
    } = body;
    return this.paymentservice.chargeUserAsPenalty(
      userId,
      chargeClientId,
      chargeHeading,
      chargeDescription,
      chargeCurrency,
      chargeAmount,
      response,
    );
  }

  @Post('settle_user_penalty')
  @ApiTags('Payment')
  async settleUserPenalty(
    @Body() body: SettleUserChargeINAPPDTO,
    @Res() response: Response,
  ) {
    const { userId, chargeId, chargeAmount, chargeCurrency } = body;
    return this.paymentservice.settleCharge(
      userId,
      chargeId,
      chargeAmount,
      chargeCurrency,
      response,
    );
  }
}

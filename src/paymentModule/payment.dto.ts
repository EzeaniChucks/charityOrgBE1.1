import { ApiProperty } from '@nestjs/swagger';

export class sendCryptoToExternalWalletDTO {
  @ApiProperty({ example: 0.003 })
  amount: number;
  @ApiProperty({ example: 'ETH' })
  cryptoCurrencySymbol: string;
  @ApiProperty({ example: 'externalwalletaddressofwherecoinwillbesent' })
  externalWalletAddress: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
}

export class AcceptCoinbaseCryptoDTO {
  @ApiProperty({ example: 0.003 })
  amount: number;
  @ApiProperty({ example: 'ETH' })
  currency: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
}

//flutterwave
export class flVerifyBVNDetailsDTO {
  @ApiProperty({
    example: 'John',
    description: 'user legal first name as registered on bvn',
  })
  firstname: string;
  @ApiProperty({ example: 'Doe' })
  lastname: string;
  @ApiProperty({ example: '297457298042' })
  bvn: string;
}

export class fetchCountryBankDTO {
  @ApiProperty({ example: 'NG or GH' })
  country: string;
}

export class SendMoneyToUserBankDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  withdrawalIntentId: string;
}

//For flutterwave webhook. To do something when transer is successful or fails
export class FlListenToBankTranferDTO {
  @ApiProperty({ example: 'flutterWaveGeneratedTransactionId' })
  id: string;

  @ApiProperty({
    example: {
      beneficiary_id: 'mongooseGeneratedId',
      wallettransaction_id: 'mongooseGeneratedId',
    },
  })
  meta: object;

  @ApiProperty({ example: 'flutterwaveTransactionNarration' })
  narration: string;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'SUCCESSFUL or FAILED' })
  status: string;
}

//payStack

export class PayStackCreateChargeDTO {
  @ApiProperty({ example: 'johndoe@certainsite.com' })
  email: string;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 1000 })
  amount: number;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  last_name: string;

  @ApiProperty({ example: '+23480457298042' })
  phone: string;

  @ApiProperty({ example: 'https://yoursite/respond_to_paystack_payment' })
  callback_url: string;

  @ApiProperty({ example: 'userGeneratedReferenceFromApp' })
  ref: string;
}

export class PayStackBVNIdentityValidationDTO {
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: `User's mongoose id after creation`,
  })
  userId: string;

  @ApiProperty({
    example: 'NG',
    description: `Two-letter country code`,
  })
  country: string;

  @ApiProperty({
    example: '9770097986',
    description: `Ten-digit account number`,
  })
  account_number: string;

  account_bank: string;
  @ApiProperty({
    example: 'Guarantee Trust Bank',
    description: `Name of bank`,
  })
  legal_first_name: string;
  @ApiProperty({
    example: 'John',
  })
  legal_last_name: string;
  @ApiProperty({
    example: 'Doe',
  })
  @ApiProperty({
    example: '97700979869',
    description: `Eleven-digit bank verification number`,
  })
  bvn: string;

  @ApiProperty({
    example: '058',
    description: `Three-digit bank code. E.g. Gtbank has 058 as code`,
  })
  bank_code: string;
}
export class PayStackBVNValidationResponseDTO {
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: `User's mongoose id after creation`,
  })
  userId: string;

  @ApiProperty({
    example: 'customeridentification.success',
    description: `Paystack event description. Enums include customeridentification.success, customeridentification.failure, customeridentification.pending`,
  })
  event: string;

  @ApiProperty({
    example: {
      customer_id: 161058616,
      customer_code: 'CUS_ewxp4jeonx7lnfb',
      email: 'concord_chucks2@yahoo.com',
      identification: {
        country: 'NG',
        type: 'bank_account',
        bvn: '221*****049',
        account_number: '003****074',
        bank_code: '058',
      },
    },
    description: `Paystack webhook response to bvn validation`,
  })
  data: {
    customer_id: number;
    customer_code: string;
    email: string;
    identification: {
      country: string;
      type: string;
      bvn: string;
      account_number: string;
      bank_code: string;
    };
  };
}

export class PayStackUpdateCustomerDTO {
  @ApiProperty({
    example: 'John',
  })
  first_name?: string;
  @ApiProperty({
    example: 'Doe',
  })
  last_name?: string;
  @ApiProperty({
    example: 'example@examplesite.com',
  })
  email?: string;
  @ApiProperty({
    example: '+2348000000000',
  })
  phone?: string;
}

export class PaystackValidateBankAccountDTO {
  @ApiProperty({ example: '0078649836' })
  account_number: string;

  @ApiProperty({ example: '058' })
  account_bank: string;
}

//FOR IN-APP ENPOINTS
export class WalletBalanceDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'NGN' })
  currency;
}
export class SendMoneyToUserINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  recipientId: string;
  @ApiProperty({ example: 'NGN' })
  currency: string;
  @ApiProperty({ example: 30000 })
  amount: number;
}

export class TransferMoneyToUserRecurrentlyINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  recipientId: string;
  @ApiProperty({ example: 'NGN' })
  currency: string;
  @ApiProperty({ example: 30000 })
  amount: number;

  @ApiProperty({ example: 'weeks' })
  inappRecurrentFreqUnit: string;
  @ApiProperty({ example: 300 })
  inappRecurrentFreqValue: number;
  @ApiProperty({ example: Date.now() })
  inappRecurrentEndDateMs: number;
  @ApiProperty({ example: 'John Doe' })
  inappRecurrentUserName: string;
  @ApiProperty({
    example: 'I have set up this recurrent transfer to support you',
  })
  inappRecurrentNote: string;
}

export class FiatExchangeRateINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'NGN' })
  from: string;
  @ApiProperty({ example: 'USD' })
  to: string;
  @ApiProperty({ example: 10000 })
  amount: number;
}

export class ConvertWalletCurrencyINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'NGN' })
  from: string;
  @ApiProperty({ example: 'USD' })
  to: string;
  @ApiProperty({ example: 10000 })
  amount: number;
}

export class ChargeUserAsPenaltyINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  chargeClientId: string;
  @ApiProperty({ example: 'GHS' })
  chargeCurrency: string;
  @ApiProperty({ example: 400 })
  chargeAmount: number;
  @ApiProperty({ example: 'Delayed Payment' })
  chargeHeading: string;
  @ApiProperty({
    example:
      'We are charging you GHS400 for delayed payment into event titled: The TrustFund Raisers',
  })
  chargeDescription: string;
}
export class SettleUserChargeINAPPDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  chargeId: string;
  @ApiProperty({ example: 'GHS' })
  chargeCurrency: string;
  @ApiProperty({ example: 400 })
  chargeAmount: number;
}

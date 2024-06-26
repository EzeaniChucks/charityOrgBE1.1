import * as mongoose from 'mongoose';

export const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    transactionId: {
      type: mongoose.Schema.Types.Mixed,
    },
    tx_ref: {
      type: String,
      required: [true, 'Transaction reference is required'],
      trim: true,
    },
    isInflow: { type: Boolean, default: false },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
    },
    phone: String,
    amount: {
      type: Number,
      required: [true, 'phone number is required'],
    },
    currency: {
      type: String,
      required: [true, 'currency is required'],
      // enum: ['NGN', 'USD', 'EUR', 'GBP'],
    },
    paymentStatus: {
      type: String,
      enum: [
        'successful',
        'success',
        'pending',
        'failed',
        'new',
        'confirmed',
        'CONFIRMED',
        'cancelled',
      ],
      default: 'pending',
    },
    paymentGateway: {
      type: String,
      required: [true, 'payment gateway is required'],
      enum: [
        'flutterwave',
        'Flutterwave',
        'coinbase',
        'Coinbase',
        'paystack',
        'Paystack',
        'Inapp',
        'inapp',
        'inapp_escrow',
        'Inapp_Escrow',
        'inapp_event',
        'Inapp_Event',
        'inapp_Membership',
        'Inapp_membership',
      ],
    },
    description: {
      type: String,
      required: [true, 'Transaction description is required'],
    },
    narration: {
      type: String,
      required: [true, 'Transaction narration is required'],
    },
    link: {
      type: String,
      default: '',
    },
    senderDetails: {
      senderId: { type: mongoose.Schema.Types.ObjectId },
      senderName: { type: String, default: '' },
    },
    recipientDetails: {
      recipientId: { type: mongoose.Schema.Types.ObjectId },
      recipientName: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

export const walletTransactionSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    isInflow: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: [
        'flutterwave',
        'Flutterwave',
        'coinbase',
        'Coinbase',
        'paystack',
        'Paystack',
      ],
      default: 'flutterwave',
    },
    currency: {
      type: String,
      required: [true, 'currency is required'],
      // enum: ['NGN', 'USD', 'EUR', 'GBP'],
    },
    status: {
      type: String,
      required: [true, 'payment status is required'],
      enum: [
        'successful',
        'success',
        'pending',
        'failed',
        'new',
        'confirmed',
        'CONFIRMED',
        'cancelled',
      ],
    },
    description: {
      type: String,
      required: [true, 'Transaction description is required'],
    },
    narration: {
      type: String,
      required: [true, 'Transaction narration is required'],
    },
    link: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

export const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    currencies: [
      {
        currency_type: String,
        balance: { type: Number, default: 0 },
        total_income_from_events: { type: Number, default: 0 },
        total_income_from_events_percent_inc: { type: Number, default: 0 },
        total_topup: { type: Number, default: 0 },
        total_topup_percent_inc: { type: Number, default: 0 },
        total_inapptransfercredit: { type: Number, default: 0 },
        total_inapptransfercredit_percent_inc: { type: Number, default: 0 },
        total_outflow: { type: Number, default: 0 },
        total_outflow_percent_dec: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

export const recurrentPayment = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    eventId: { type: String },
    recipientId: { type: String },
    recipientName: { type: String },
    note: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    frequencyfactor: { type: Number, required: true },
    frequencyDateMilliseconds: { type: Number, required: true },
    renewalDateMicroSec: { type: Number, required: true },
    type: { type: String, enum: ['individual', 'charity', 'membership'] },
    payment_medium: { type: String, enum: ['card', 'wallet'] },
    card_authorization: { type: Object },
  },
  { timestamps: true },
);

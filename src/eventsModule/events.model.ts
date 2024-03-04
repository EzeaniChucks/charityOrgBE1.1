import * as mongoose from 'mongoose';

export const eventSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'creator ID must be provided'],
  },
  eventName: {
    type: String,
    required: [true, 'Event name must be provided'],
    unique: true,
  },
  eventDescription: {
    type: String,
    required: [true, 'Event description must be provided'],
  },
  eventPrivacy: {
    type: String,
    required: [true, 'Event privacy must be provided'],
    default: 'Public',
  },
  timeZone: { type: String, required: [true, 'Time zone must be provided'] },
  hostStatus: {
    type: String,
    required: [true, 'Host status must be provided'],
    enum: ['Self', 'Third-party individual', 'Third-party verified charity'],
  },
  currency: { type: String, required: [true, 'Currency must be specified'] },
  eventAmountExpected: { type: Number, default: 1, required: true },
  depositDeadline: {
    type: Date,
  },
  contributors: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      actualName: String,
      isAnonymous: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      note: { type: String, default: '' },
      contribution_type: { type: String, enum: ['normal', 'escrow'] },
      // has_remitted: { type: Boolean, default: false }, //to avoid chron job double deduction
      date: Date,
    },
  ],
  pledgers: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      actualName: String,
      pledge_description: { type: String, default: '' },
      pledge_status: {
        type: String,
        enum: ['pending', 'redeemed'],
        default: 'pending',
      },
      redemption_date: Date,
      pledger_email: String,
    },
  ],
  commenters: [
    {
      userName: String,
      comment: String,
      createdAt: { type: Date, default: new Date() },
    },
  ],
  escrow: [
    {
      appointee: {
        userId: mongoose.Schema.Types.ObjectId,
        accepted: { type: Boolean, default: false },
        has_disbursed_payment: { type: Boolean, default: false },
      },
      appointer: {
        userId: mongoose.Schema.Types.ObjectId,
        accepted: { type: Boolean, default: false },
        money_value_willing_to_raise: { type: Number, default: 0 },
        money_currency_willing_to_raise: { type: String },
        has_paid: { type: Boolean, default: false },
      },
      escrowDetails: {
        amount: { type: Number, default: 0 },
        currency: String,
        paidOut: { type: Boolean, default: false },
      },
      //deposit
      //then invite decider
      //determine whether to pay third party directly or use payment forms
      paymentForm: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          amount_received: { type: Number, default: 0 },
          paid:{type:Boolean, default:false},
          date: { type: Date, default: Date.now() },
        },
      ],
      allParticipants: [mongoose.Schema.Types.ObjectId],
      eventName:String,
    },
  ],
  totalEventAmount: { type: Number, default: 0 },
  totalEventAmountFromEscrow: { type: Number, default: 0 },
  eventImageName: { type: String },
  invitationEmails: [String],
});
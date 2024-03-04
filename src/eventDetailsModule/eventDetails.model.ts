import * as mongoose from 'mongoose';

export const eventDetailsSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'event ID must be provided'],
  },
  eventName: { type: String },
  memberCategories: [
    {
      description: String,
      contributors: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          name: String,
          amount: { type: Number, default: 0 },
          has_remitted: { type: Boolean, default: false }, //to avoid chron job double deduction
          date: Date,
        },
      ],
      pledgers: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          name: String,
          pledge_description: { type: String, default: '' },
          // has_remitted: { type: Boolean, default: false },
          pledge_status: { type: String, enum: ['pending', 'redeemed'] },
          redemption_date: Date,
        },
      ],
      totalCategoryAmount: { type: Number, default: 0 },
    },
  ],
  pledgeForms: [
    {
      userId: String,
      pledgeDateDeadline: Date,
      amount: Number,
      description: String,
      name: String,
    },
  ],
  totalEventAmount: { type: Number, default: 0 },
  memberRequests: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      description: { type: String, required: true },
      amount: { type: Number, default: 0, required: true },
      disputes: Array,
      disputeFormDescription: [{ userId: String, description: String }],
      date: Date,
    },
  ],
  totalMemberRequestsAmount: { type: Number, default: 0 },
  disputeForms: [
    {
      disputeLogger: mongoose.Schema.Types.ObjectId,
      description: { type: String, required: true },
      disputedRequests: Array,
      appointedJudge: { userId: mongoose.Schema.Types.ObjectId, name: String },
      createdAt: Date,
    },
  ],
  requestTimeLimit: { type: Date, default: new Date() },
  disputeTimeLimit: { type: Date, default: new Date() },
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: String,
      membertype: {
        type: String,
        default: 'depositor',
      },
      isCreator: { type: Boolean, default: false },
      isAdmin: { type: Boolean, default: false },
    },
  ],
  observers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: String,
      membertype: {
        type: String,
        default: 'observer',
      },
      nominations: Number,
      isCreator: { type: Boolean, default: false },
      isAdmin: { type: Boolean, default: false },
    },
  ],
});

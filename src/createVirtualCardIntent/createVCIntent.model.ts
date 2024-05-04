import mongoose from 'mongoose';

export const vCIntentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    //FOR INTENT STATUS
    //attended means admin approves
    //awaiting is default for when user creates an intent (user wallet is charged amount-N100)
    //rejected means admin declines (user is refunded amount-N100)
    //cancelled  means user cancels awaiting intent
    intentStatus: {
      type: String,
      enum: ['attended', 'awaiting', 'rejected', 'cancelled'],
      default: 'awaiting',
    },
    dissatisfaction_reason: { type: String, default: '' }, //Only populated when admin rejects intent
  },
  { timestamps: true },
);

import mongoose from 'mongoose';

export const withdrawalIntentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    accountBank: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountBankName: { type: String, required: true },
    intentStatus: {
      type: String,
      enum: ['unattended', 'processing', 'attended', 'cancelled'],
    },
    cancellationReason: { type: String, default: '' },
  },
  { timestamps: true },
);

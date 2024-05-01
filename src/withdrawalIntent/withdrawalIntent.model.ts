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
    accountBankCode: { type: String, required: true },

    //cancelled is done by user.
    //rejected is done by admin, with a reason given
    //attended and failed are from FL webhook response
    //processing happens when admin submits the request to FL for processing funds to bank
    intentStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'attended',
        'rejected',
        'cancelled',
        'failed',
      ],
      default: 'pending',
    },
    cancellationReason: { type: String, default: '' },
  },
  { timestamps: true },
);

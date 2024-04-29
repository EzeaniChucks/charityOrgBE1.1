import mongoose from 'mongoose';

export const accountValIntentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    govt_issued_id_doc: { type: String, required: true },
    accountBankCode: { type: String, required: true },
    accountBankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    intentStatus: {
      type: String,
      enum: ['unattended', 'attended'],
      default: 'unattended',
    },
    verdict: {
      type: String,
      enum: ['satisfied', 'dissatisfied'],
      default: '',
    },
    dissatisfaction_reason: { type: String, default: '' },
  },
  { timestamps: true },
);

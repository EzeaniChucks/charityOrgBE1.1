import mongoose from 'mongoose';

export const vitualCardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: String,
    status: {
      type: String,
      enum: ['blocked', 'unblocked'],
      default: 'unblocked',
    },
    terminated: { type: Boolean, default: false },
    cardData: { type: Object },
  },
  { timestamps: true },
);
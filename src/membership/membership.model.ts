import mongoose from "mongoose";

export const membershipSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String, required: true },
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: { type: String },
      chargeDate: [Date], //array of charge date strings
    },
  ],
  currency: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  chargeFrequencyUnit: { type: String, required: true },
  chargeFrequencyValue: { type: Number, required: true },
  charge_frequency_MS: { type: Number }, //charge milliseconds to be added
  reviews: [
    new mongoose.Schema(
      {
        name: { type: String },
        comment: { type: String },
        reviewerId:{type:mongoose.Schema.Types.ObjectId, required:true}
      },
      { timestamps: true },
    ),
  ],
});
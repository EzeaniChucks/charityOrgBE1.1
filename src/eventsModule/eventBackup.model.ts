import * as mongoose from 'mongoose';

export const eventBackUpSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'creator ID must be provided'],
  },
  eventName: {
    type: String,
    required: [true, 'Event name must be provided'],
    unique: true,
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
  },
  currency: { type: String, required: [true, 'Currency must be specified'] },
  eventDescription: {
    type: String,
    required: [true, 'Event description must be provided'],
  },
  depositDeadline: {
    type: Date,
    required: [true, 'Deposit deadline must be provided'],
  },
  completionDeadline: {
    type: Date,
    required: [true, 'Completion deadline must be provided'],
  },
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
  eventImageName: { type: String },
  invitationEmails: [String],
});

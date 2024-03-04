import mongoose from 'mongoose';

export const chatSchema = new mongoose.Schema({
  eventId: mongoose.Schema.Types.ObjectId,
  chats: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      text: String,
      // files: { data: Buffer, fileName: String },
      file_details: {
        filename: { type: String,},
        secure_url: { type: String, },
        public_id: { type: String, },
        asset_id: { type: String },
        resource_type: { type: String, },
        format: { type: String, },
        playback_url: { type: String },
      },
      createdAt: { type: Date, default: new Date() },
    },
  ],
});

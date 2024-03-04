import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MongooseModule } from '@nestjs/mongoose';
import { chatSchema } from 'src/eventsModule/eventChats.model';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'eventchats', schema: chatSchema }]),
    CloudinaryModule,
  ],
  providers: [ChatsController, ChatsService],
  // controllers: [ChatsController]
})
export class ChatsModule {}

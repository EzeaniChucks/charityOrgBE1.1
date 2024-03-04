import { Module } from '@nestjs/common';
import { WebsocketsService } from './websockets.service';
import { WebsocketsController } from './websockets.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { chatSchema } from 'src/eventsModule/eventChats.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'eventChats', schema: chatSchema }]),
  ],
  providers: [WebsocketsService],
  controllers: [WebsocketsController],
})
export class WebsocketsModule {}

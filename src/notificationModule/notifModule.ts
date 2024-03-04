import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { notificationSchema } from './notifModel';
import { eventSchema } from 'src/eventsModule/events.model';
import { NotifController } from './notifController';
import { NotifService } from './notifService';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'notifications', schema: notificationSchema },
    ]),
    MongooseModule.forFeature([{ name: 'events', schema: eventSchema }]),
  ],
  controllers: [NotifController],
  providers: [NotifService],
  exports:[NotifService]
})
export class NotifModule {}

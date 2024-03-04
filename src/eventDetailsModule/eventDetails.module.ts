import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { eventDetailsSchema } from './eventDetails.model';
import { EventDetailsServices } from './eventDetails.service';
import { EventDetailsController } from './eventDetails.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'eventDetails', schema: eventDetailsSchema },
    ]),
  ],
  providers: [EventDetailsServices],
  controllers: [EventDetailsController],
  exports: [EventDetailsServices],
})
export class EventDetailsModule {}

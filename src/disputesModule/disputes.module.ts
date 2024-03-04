import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { disputesSchema } from './disputes.model';
import { DisputeController } from './disputes.controller';
import { eventDetailsSchema } from 'src/eventDetailsModule/eventDetails.model';
import { eventSchema } from 'src/eventsModule/events.model';
import { DisputesService } from './disputes.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'disputes', schema: disputesSchema }]),
    MongooseModule.forFeature([
      { name: 'eventDetails', schema: eventDetailsSchema },
    ]),
    MongooseModule.forFeature([{ name: 'events', schema: eventSchema }]),
  ],
  controllers: [DisputeController],
  providers: [DisputesService],
})
export class DisputeModule {}

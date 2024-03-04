import { Controller } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventDetailsServices } from './eventDetails.service';

@Controller()
export class EventDetailsController {
  constructor(private readonly eventdetails: EventDetailsServices) {}
  // create(eventId: string, eventName: string) {
  //   return this.eventdetails.create(eventId, eventName);
  // }
}

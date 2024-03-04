import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class EventDetailsServices {
  constructor(@InjectModel('eventDetails') private eventDetails: Model<any>) {}

  async create(eventId: string, eventName: string) {
    return await this.eventDetails.create({ eventId, eventName });
  }
}

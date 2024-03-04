import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class DisputesService {
  constructor(
    @InjectModel('disputes') private disputes: Model<any>,
    @InjectModel('eventDetails') private eventdetails: Model<any>,
    @InjectModel('events') private events: Model<any>,
  ) {}
  async addDisputes(
    requestId: string,
    requestOwnerId: string,
    dispute_complainerId: string,
    eventId: string,
    description: string,
  ) {
    try {
      const userExists = await this.eventdetails.findOne(
        { eventId: eventId },
        { memberRequests: { $elemMatch: { userId: requestOwnerId } } },
      );

      const exists =
        userExists.memberRequests[0].disputes.includes(dispute_complainerId);

      if (exists) {
        throw new BadRequestException({
          msg: 'You already logged a dispute to this request. Await user action or contact them inbox',
        });
      }
      const eventDet = await this.eventdetails.findOneAndUpdate(
        { eventId, 'memberRequests._id': requestId },
        { $push: { 'memberRequests.$.disputes': dispute_complainerId } },
        { new: true },
      );

      if (!eventDet) {
        throw new BadRequestException({ msg: 'Something went wrong' });
      }

      const dispute = await this.disputes.create({
        requestId,
        requestOwnerId,
        dispute_complainerId,
        eventId,
        description,
      });
      if (!dispute) {
        throw new NotFoundException({ msg: 'Something went wrong' });
      }
      return { msg: 'Dispute logged' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async removeDisputes(
    requestId: string,
    requestOwnerId: string,
    dispute_complainerId: string,
    eventId: string,
  ) {
    try {
      const eventUpdate = await this.eventdetails.findOneAndUpdate(
        { eventId, 'memberRequests._id': requestId },
        { $pull: { 'memberRequests.$.disputes': dispute_complainerId } },
        { new: true },
      );
      if (!eventUpdate) {
        throw new BadRequestException({ msg: 'Something went wrong' });
      }
      await this.disputes.findOneAndDelete({
        eventId,
        requestOwnerId,
        requestId,
      });
      return { msg: 'Dispute removed' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async removeAllDisputes(eventId: string, requestId: string, userId: string) {
    try {
      const eventExists = await this.events.findOne(
        { _id: eventId },
        { observers: { $elemMatch: { userId } } },
      );
      if (!eventExists) {
        throw new BadRequestException({ msg: 'Unauthorized access' });
      }

      //turn dispute array of selected requestform to empty
      const edited = await this.eventdetails.findOneAndUpdate(
        { eventId, 'memberRequests._id': requestId },
        { 'memberRequests.$.disputes': [] },
        { new: true },
      );
      // console.log(edited);
      if (!edited) {
        throw new BadRequestException({
          msg: 'No request disputes available to delete',
        });
      }

      //remove all concerned disputes regarding that request from dispute model
      const hasDeleted = await this.disputes.deleteMany({ requestId });
      if (!hasDeleted) {
        throw new BadRequestException({
          msg: 'No request disputes availble to delete',
        });
      }

      return { msg: 'All disputes have been removed' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
}

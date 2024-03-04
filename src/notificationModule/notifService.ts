import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class NotifService {
  constructor(
    @InjectModel('notifications') private notifications: Model<any>,
    @InjectModel('events') private events: Model<any>,
  ) {}

  //Helper Method
  async buildGroupNotificationArray({
    memberArray,
    message,
    link,
    userId,
    // frontEndObjectId,
    type,
  }) {
    return memberArray.reduce((total: [any], item: any) => {
      if (item?.userId.toString() === userId) return total;
      const data = {
        recipientId: item.userId,
        message,
        link,
        // frontEndObjectId,
        type,
      };
      total.push(data);
      return total;
    }, []);
  }

  async logNotifications(
    message: string,
    userId: string,
    link: string,
    eventId: string,
    type: string,
    // frontEndObjectId: string,
  ) {
    try {
      const event = await this.events.findOne({ _id: eventId });
      //blocking code below
      const array = await this.buildGroupNotificationArray({
        memberArray: event.members,
        // frontEndObjectId,
        message,
        link,
        userId,
        type,
      });

      //end of blocking code
      const notifs = await this.notifications.create(array);
      if (!notifs) {
        throw new BadRequestException({
          msg: 'Something went wrong logging notification',
        });
      }
      return { msg: 'success. Notification logged' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async logSingleNotification(
    message: string,
    recipientId: string,
    senderId:string,
    link: string,
    type: string,
    // frontEndObjectId: string,
  ) {
    try {
      // const event = await this.events.findOne({ _id: eventId });
      const data = {
        recipientId,
        senderId,
        message,
        link,
        type,
      };
      //end of blocking code
      const notifs = await this.notifications.create(data);
      if (!notifs) {
        throw new BadRequestException({
          msg: 'Something went wrong logging notification',
        });
      }
      return { msg: 'success. Notification logged' };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async getNotifications(userId: string) {
    try {
      const notifs = await this.notifications.find({ recipientId: userId });
      if (!notifs) {
        throw new BadRequestException({ msg: 'Something went wrong' });
      }
      return { msg: 'success', payload:notifs };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
  async markAsChecked(messageId: string, userId: string) {
    try {
      const notif = await this.notifications.findOne({
        _id: messageId,
        recipientId: userId,
      });
      if (!notif) {
        throw new BadRequestException({ msg: 'Something went wrong' });
      }
      notif.has_checked = true;
      await notif.save();

      const notifs = await this.notifications.find({ recipientId: userId });
      return { msg: 'success', payload:notifs };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
}

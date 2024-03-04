import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotifService } from './notifService';
import { ApiTags } from '@nestjs/swagger';
import { LogNotificationsDTO, MarkMessageAsReadDTO } from './notifications.dto';

@Controller()
export class NotifController {
  constructor(private readonly notificationservice: NotifService) {}
  @Post('mark_message_as_read')
  @ApiTags('Notifications')
  markAsRead(@Body() body: MarkMessageAsReadDTO) {
    const { messageId, userId } = body;
    return this.notificationservice.markAsChecked(messageId, userId);
  }

  @Post('log_notification')
  @ApiTags('Notifications')
  logNotifications(@Body() body: LogNotificationsDTO) {
    const { message, userId, link, eventId, type, } = body;
    return this.notificationservice.logNotifications(
      message,
      userId,
      link,
      eventId,
      type,
      // frontEndObjectId,
    );
  }

  @Get('get_notifications/:userId')
  @ApiTags('Notifications')
  getNotifications(@Param('userId') userId: string) {
    return this.notificationservice.getNotifications(userId);
  }
}

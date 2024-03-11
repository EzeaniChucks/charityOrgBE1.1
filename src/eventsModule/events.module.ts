import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsServices } from './events.service';
import { MongooseModule } from '@nestjs/mongoose';
import { eventSchema } from './events.model';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { EventDetailsModule } from 'src/eventDetailsModule/eventDetails.module';
import { AuthModule } from 'src/authModule/auth.module';
import { userSchema } from 'src/authModule/auth.model';
import { eventDetailsSchema } from 'src/eventDetailsModule/eventDetails.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import {
  recurrentPayment,
  transactionSchema,
  walletSchema,
  walletTransactionSchema,
} from 'src/paymentModule/payment.model';
import { chatSchema } from './eventChats.model';
import { NotifModule } from 'src/notificationModule/notifModule';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'events', schema: eventSchema }]),
    MongooseModule.forFeature([{ name: 'eventBackUp', schema: eventSchema }]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'recurrentPayment', schema: recurrentPayment },
    ]),
    MongooseModule.forFeature([
      { name: 'eventDetails', schema: eventDetailsSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'transaction', schema: transactionSchema },
    ]),
    MongooseModule.forFeature([{ name: 'wallet', schema: walletSchema }]),
    MongooseModule.forFeature([
      { name: 'walletTransaction', schema: walletTransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'transaction', schema: transactionSchema },
    ]),
    CloudinaryModule,
    EventDetailsModule,
    NotifModule,
    AuthModule,
    PaymentModule,
  ],
  providers: [EventsServices],
  controllers: [EventsController],
  exports: [EventsServices],
})
export class EventsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  recurrentPayment,
  transactionSchema,
  walletSchema,
  walletTransactionSchema,
} from './payment.model';
import { userSchema } from 'src/authModule/auth.model';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AuthModule } from 'src/authModule/auth.module';
import { eventSchema } from 'src/eventsModule/events.model';
import { eventDetailsSchema } from 'src/eventDetailsModule/eventDetails.model';
import { notificationSchema } from 'src/notificationModule/notifModel';
import { NotifModule } from 'src/notificationModule/notifModule';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'transaction', schema: transactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'walletTransaction', schema: walletTransactionSchema },
    ]),
    MongooseModule.forFeature([{ name: 'event', schema: eventSchema }]),
    MongooseModule.forFeature([
      { name: 'eventDetails', schema: eventDetailsSchema },
    ]),
    NotifModule,
    MongooseModule.forFeature([
      { name: 'recurrentPayment', schema: recurrentPayment },
    ]),
    MongooseModule.forFeature([{ name: 'wallet', schema: walletSchema }]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    forwardRef(() => AuthModule),
    // AuthModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminSettingsService } from './adminSettings.service';
import { AdminSettingsController } from './adminSettings.controller';
import { adminSchema } from './adminSettings.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import { userSchema } from 'src/authModule/auth.model';
import { eventSchema } from 'src/eventsModule/events.model';
import { membershipSchema } from 'src/membership/membership.model';
import { accountValIntentSchema } from 'src/accountValidationIntent/accountValIntent.model';
import { NotifModule } from 'src/notificationModule/notifModule';
import { withdrawalIntentSchema } from 'src/withdrawalIntent/withdrawalIntent.model';
import { vitualCardSchema } from 'src/virtualCardModule/virtualCardModel';
import { vCIntentSchema } from 'src/createVirtualCardIntent/createVCIntent.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'adminsettings', schema: adminSchema }]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    MongooseModule.forFeature([{ name: 'events', schema: eventSchema }]),
    MongooseModule.forFeature([
      { name: 'membership', schema: membershipSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'virtualcard', schema: vitualCardSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'accountValIntent', schema: accountValIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'withdrawalIntent', schema: withdrawalIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'vCardIntent', schema: vCIntentSchema },
    ]),
    PaymentModule,
    NotifModule,
  ],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}

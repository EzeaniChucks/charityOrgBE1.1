import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminSettingsService } from './adminSettings.service';
import { AdminSettingsController } from './adminSettings.controller';
import { adminSchema } from './adminSettings.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import { userSchema } from 'src/authModule/auth.model';
import { eventSchema } from 'src/eventsModule/events.model';
import { membershipSchema } from 'src/membership/membership.model';

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
    PaymentModule,
  ],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}

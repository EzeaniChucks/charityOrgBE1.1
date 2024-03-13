import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import mongoose from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { membershipSchema } from './membership.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import { userSchema } from 'src/authModule/auth.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'membership', schema: membershipSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    PaymentModule,
  ],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [],
})
export class MembershipModule {}

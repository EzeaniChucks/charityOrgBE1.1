import { Module } from '@nestjs/common';
import { WithdrawIntentController } from './withdrawalIntent.controller';
import { WithdrawIntentService } from './withdrawalIntent.service';
import { MongooseModule } from '@nestjs/mongoose';
import { withdrawalIntentSchema } from './withdrawal.model';
import { userSchema } from 'src/authModule/auth.model';
import { PaymentModule } from 'src/paymentModule/payment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'withdrawalIntent', schema: withdrawalIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    PaymentModule,
  ],
  controllers: [WithdrawIntentController],
  providers: [WithdrawIntentService],
  exports: [WithdrawIntentService],
})
export class WithdrawIntentModule {}

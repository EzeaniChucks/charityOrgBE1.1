import { Module } from '@nestjs/common';
import { AccountValIntentController } from './accountValIntent.controller';
import { AccountValIntentService } from './accountValIntent.service';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from 'src/authModule/auth.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import { accountValIntentSchema } from './accountValIntent.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'accountVallIntent', schema: accountValIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    PaymentModule,
  ],
  controllers: [AccountValIntentController],
  providers: [AccountValIntentService],
  exports: [AccountValIntentService],
})
export class AccountValIntentModule {}

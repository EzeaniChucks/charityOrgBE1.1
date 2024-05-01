import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { userSchema } from './auth.model';
import { PaymentModule } from 'src/paymentModule/payment.module';
import { walletSchema } from 'src/paymentModule/payment.model';
import { AdminSettingsModule } from 'src/adminSettingsModule/adminSettings.module';
import { adminSchema } from 'src/adminSettingsModule/adminSettings.model';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { accountValIntentSchema } from 'src/accountValidationIntent/accountValIntent.model';
import { withdrawalIntentSchema } from 'src/withdrawalIntent/withdrawalIntent.model';
import { vitualCardSchema } from 'src/virtualCardModule/virtualCardModel';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    MongooseModule.forFeature([{ name: 'wallet', schema: walletSchema }]),
    MongooseModule.forFeature([{ name: 'adminsettings', schema: adminSchema }]),
    MongooseModule.forFeature([
      { name: 'accountValIntent', schema: accountValIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'withdrawalIntent', schema: withdrawalIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'vCardIntent', schema: vitualCardSchema },
    ]),
    forwardRef(() => PaymentModule),
    // PaymentModule,
    AdminSettingsModule,
    CloudinaryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

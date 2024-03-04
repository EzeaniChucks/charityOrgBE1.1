import { Module } from "@nestjs/common";
import { VirtualCardController } from "./virtualCard.controller";
import { VirtualCardServices } from "./virtualCard.service";
import { MongooseModule } from "@nestjs/mongoose";
import { vitualCardSchema } from "./virtualCardModel";
import { userSchema } from "src/authModule/auth.model";
import { PaymentModule } from "src/paymentModule/payment.module";
import { walletSchema } from "src/paymentModule/payment.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'virtualcard', schema: vitualCardSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'CharityAppUsers', schema: userSchema },
    ]),
    MongooseModule.forFeature([{ name: 'wallet', schema: walletSchema }]),
    PaymentModule,
  ],
  controllers: [VirtualCardController],
  providers: [VirtualCardServices],
  exports: [],
})
export class VirtualCardModule {}
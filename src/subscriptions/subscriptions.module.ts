import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { subscriptionsSchema } from './subscriptions.model';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PaymentModule } from 'src/paymentModule/payment.module';

@Module({
    imports:[
        MongooseModule.forFeature([{name:'subscriptions', schema:subscriptionsSchema}]),
        PaymentModule,
    ],
    controllers:[SubscriptionsController],
    providers:[SubscriptionsService],
    exports:[]
})
export class SubscriptionsModule {}

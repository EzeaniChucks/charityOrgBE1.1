import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './authModule/auth.module';
import { PaymentModule } from './paymentModule/payment.module';
import { EventsModule } from './eventsModule/events.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EventDetailsModule } from './eventDetailsModule/eventDetails.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketsModule } from './websockets/websockets.module';
import { WebsocketsService } from './websockets/websockets.service';
import { chatSchema } from './eventsModule/eventChats.model';
import { NotifModule } from './notificationModule/notifModule';
import { DisputeModule } from './disputesModule/disputes.module';
import { AdminSettingsModule } from './adminSettingsModule/adminSettings.module';
import { ChatsModule } from './chats/chats.module';
import { PaymentsChecker } from './middleware/paymentsChecker.middleware';
import { PaymentController } from './paymentModule/payment.controller';
import { AdminChecker } from './middleware/adminChecker.middleware';
import { AdminSettingsController } from './adminSettingsModule/adminSettings.controller';
import { EventsChecker } from './middleware/eventsChecker.middleware';
import { EventsController } from './eventsModule/events.controller';
import { MembershipModule } from './membership/membership.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { VirtualCardModule } from './virtualCardModule/virtualCard.module';
import { VirtualCardsChecker } from './middleware/virtualCards.middleware';
import { VirtualCardController } from './virtualCardModule/virtualCard.controller';

@Module({
  imports: [
    AdminSettingsModule,
    AuthModule,
    CloudinaryModule,
    DisputeModule,
    EventDetailsModule,
    EventsModule,
    NotifModule,
    PaymentModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.DB_CONNECTION),
    MongooseModule.forFeature([{ name: 'eventChats', schema: chatSchema }]),
    ChatsModule,
    MembershipModule,
    SubscriptionsModule,
    VirtualCardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PaymentsChecker)
      .exclude(
        {
          path: 'paystack_bvn_validation_webhook_response',
          method: RequestMethod.POST,
        },
        {
          path: 'paystack_get_banks',
          method: RequestMethod.GET,
        },
      )
      .forRoutes(PaymentController);
        consumer
          .apply(EventsChecker)
          .exclude(
            {
              path: 'get_all_events',
              method: RequestMethod.GET,
            },
            {
              path: '/get_single_event/:eventId',
              method: RequestMethod.GET,
            },
            {
              path: '/event_creator_details/:creatorId',
              method: RequestMethod.GET,
            },
          )
          .forRoutes(EventsController);
    consumer.apply(AdminChecker).forRoutes(AdminSettingsController);
    consumer.apply(VirtualCardsChecker).forRoutes(VirtualCardController);
  }
}

import { Module } from '@nestjs/common';
import { CreeateVCIntentController } from './creeateVCIntent.controller';
import { CreeateVCIntentService } from './creeateVCIntent.service';
import { MongooseModule } from '@nestjs/mongoose';
import { createVCIntentSchema } from './createVCIntent.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'createVCIntent', schema: createVCIntentSchema },
    ]),
  ],
  controllers: [CreeateVCIntentController],
  providers: [CreeateVCIntentService],
  exports: [CreeateVCIntentService],
})
export class CreeateVCIntentModule {}

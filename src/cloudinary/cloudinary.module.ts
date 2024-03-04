import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.services';
import { CloudinaryControllers } from './cloudinary.controllers';

@Module({
  providers: [CloudinaryService, CloudinaryControllers],
  exports: [CloudinaryService, CloudinaryControllers],
})
export class CloudinaryModule {}

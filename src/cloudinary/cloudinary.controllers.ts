import { Controller } from '@nestjs/common';

import { v2 } from 'cloudinary';

export const CloudinaryControllers = {
  provide: 'cloudinary',
  useFactory: (): any => {
    return v2.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  },
};
// export class CloudinaryControllers {}

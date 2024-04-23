import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
// import { hostname } from 'os';
//backend address = https://charity-nest-be1-1-5a1ubp570-ezeanichucks.vercel.app
//new backend address = https://charity-nest-be1-1-kuknx75c2-ezeanichucks.vercel.app
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({
    origin: [
      'https://charityorg.vercel.app',
      'https://charityorgv1.vercel.app',
      'http://localhost:3000',
      'https://beta.commerce.coinbase.com',
      'https://commerce.coinbase.com',
      'https://api.paystack.co',
    ],
    // origin: ['https://charityorg.vercel.app:443'],
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
    credentials: true,
  });
  app.use(cookieParser(process.env.JWT_SECRET));
  const options = new DocumentBuilder()
    .setTitle('CharityOrg 1.1 API documentation')
    .setDescription('Protected routes for the charityOrg 1.1 API')
    .setVersion('1.1')
    .addTag('Admin','Admin endpoints')
    .addTag('Auth','Auth endpoints')
    .addTag('Events','Events endpoints')
    .addTag('Membership','Membership endpoints')
    .addTag('Notifications','Notifications endpoints')
    .addTag('Payment','Payment endpoints')
    .addTag('Subscriptions','Subscriptions endpoints')
    .addTag('VirtualCard','VirtualCard endpoints')
    .addBearerAuth({type:'apiKey', in:'cookie', name:'accessToken'})
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT || 8080);
}
bootstrap();

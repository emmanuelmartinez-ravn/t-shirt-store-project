import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Response } from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './exceptions/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './prisma/filters/prisma-exception.filter';

// Compiled entry is dist/src/main.js, so the repo-root static/ folder is two levels up.
const STATIC_ASSETS_DIR = join(__dirname, '..', '..', 'static');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.useStaticAssets(STATIC_ASSETS_DIR, {
    prefix: '/static/',
    setHeaders: (res: Response) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('T-Shirt Store API')
    .setDescription('API documentation for the T-Shirt Store backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

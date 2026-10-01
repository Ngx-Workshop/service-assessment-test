import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  assertLocalDatabase,
  localMode,
  localOrigins,
} from './assessment-test/assessment-auth.guard';

async function bootstrap() {
  if (process.env.GENERATE_OPENAPI === 'true')
    throw new Error('OpenAPI generation mode cannot serve HTTP');
  assertLocalDatabase();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  if (localMode()) app.enableCors({ origin: localOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  await app.listen(
    process.env.PORT ?? 3005,
    localMode() ? '127.0.0.1' : '0.0.0.0'
  );
}
bootstrap();

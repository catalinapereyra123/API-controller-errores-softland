import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module';
import { jsonTolerante } from './common/json-tolerante';

async function bootstrap() {
  // Parsers propios: el JSON de Nest rechaza los mensajes de Softland que
  // iFlow manda sin escapar (rutas `c:\padron\...`). Ver json-tolerante.ts.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(...jsonTolerante(), express.urlencoded({ extended: true }));

  const origins = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins && origins.length ? origins : true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

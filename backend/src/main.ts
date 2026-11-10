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
  // credentials: el front manda la cookie del login con Microsoft al pedir la
  // sesión. Sólo con orígenes explícitos (nunca reflejando cualquier origen).
  const conOrigenes = Boolean(origins && origins.length);
  app.enableCors({
    origin: conOrigenes ? origins : true,
    credentials: conOrigenes,
  });

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

import { Module } from '@nestjs/common';
import { ObjetivosController } from './objetivos.controller';
import { ObjetivosService } from './objetivos.service';

@Module({
  controllers: [ObjetivosController],
  providers: [ObjetivosService],
})
export class ObjetivosModule {}

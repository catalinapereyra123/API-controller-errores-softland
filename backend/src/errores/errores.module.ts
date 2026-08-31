import { Module } from '@nestjs/common';
import { ErroresController } from './errores.controller';
import { ErroresRepository } from './errores.repository';
import { ErroresService } from './errores.service';
import { SyncController } from './sync.controller';

@Module({
  controllers: [ErroresController, SyncController],
  providers: [ErroresService, ErroresRepository],
  exports: [ErroresService],
})
export class ErroresModule {}

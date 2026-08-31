import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ErroresModule } from './errores/errores.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [PrismaModule, ErroresModule, UsuariosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

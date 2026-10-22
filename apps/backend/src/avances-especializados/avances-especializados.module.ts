import { Module } from '@nestjs/common';
import { AvancesEspecializadosController } from './avances-especializados.controller';
import { AvancesEspecializadosService } from './avances-especializados.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AvancesEspecializadosController],
  providers: [AvancesEspecializadosService],
  exports: [AvancesEspecializadosService],
})
export class AvancesEspecializadosModule {}

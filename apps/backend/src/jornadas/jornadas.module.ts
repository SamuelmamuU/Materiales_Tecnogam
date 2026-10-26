import { Module } from '@nestjs/common';
import { JornadasService } from './jornadas.service';
import { JornadasController } from './jornadas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [JornadasController],
  providers: [JornadasService],
  exports: [JornadasService],
})
export class JornadasModule {}

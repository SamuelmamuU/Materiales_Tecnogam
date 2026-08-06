import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MaterialsModule } from './materials/materials.module';

@Module({
  imports: [PrismaModule, MaterialsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}

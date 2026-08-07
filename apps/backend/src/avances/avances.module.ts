import { Module } from '@nestjs/common';
import { AvancesService } from './avances.service';
import { AvancesController } from './avances.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AvancesController],
  providers: [AvancesService],
  exports: [AvancesService],
})
export class AvancesModule {}

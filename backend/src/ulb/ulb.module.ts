import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ulb } from '../database/entities/ulb.entity';
import { UlbService } from './ulb.service';
import { UlbController } from './ulb.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ulb])],
  providers: [UlbService],
  controllers: [UlbController],
  exports: [UlbService],
})
export class UlbModule {}

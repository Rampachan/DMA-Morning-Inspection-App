import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionCategory } from '../database/entities/inspection-category.entity';
import { InspectionCategoryService } from './inspection-category.service';
import { InspectionCategoryController } from './inspection-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionCategory])],
  providers: [InspectionCategoryService],
  controllers: [InspectionCategoryController],
  exports: [InspectionCategoryService],
})
export class InspectionCategoryModule {}

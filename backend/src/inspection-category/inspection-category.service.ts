import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionCategory } from '../database/entities/inspection-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class InspectionCategoryService {
  constructor(
    @InjectRepository(InspectionCategory)
    private readonly categoryRepo: Repository<InspectionCategory>,
  ) {}

  async findAll(activeOnly = false): Promise<InspectionCategory[]> {
    const where = activeOnly ? { active: true } : {};
    return this.categoryRepo.find({
      where,
      order: { display_order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<InspectionCategory> {
    const cat = await this.categoryRepo.findOne({ where: { category_id: id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found.`);
    return cat;
  }

  async findActive(): Promise<InspectionCategory[]> {
    return this.findAll(true);
  }

  async create(dto: CreateCategoryDto): Promise<InspectionCategory> {
    const active = dto.active !== undefined ? dto.active : (dto.isActive ?? true);
    const display_order = dto.display_order !== undefined ? dto.display_order : (dto.sortOrder ?? 0);

    const cat = this.categoryRepo.create({
      name: dto.name.trim(),
      active,
      display_order,
    });
    return this.categoryRepo.save(cat);
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<InspectionCategory> {
    const cat = await this.findOne(id);
    if (dto.name !== undefined) {
      cat.name = dto.name.trim();
    }
    const activeVal = dto.active !== undefined ? dto.active : dto.isActive;
    if (activeVal !== undefined) {
      cat.active = activeVal;
    }
    const orderVal = dto.display_order !== undefined ? dto.display_order : dto.sortOrder;
    if (orderVal !== undefined) {
      cat.display_order = orderVal;
    }
    return this.categoryRepo.save(cat);
  }

  /**
   * Reorders categories by updating display_order to match array position.
   * ids[] is the desired order from top (index 0) to bottom.
   */
  async reorder(ids: string[]): Promise<void> {
    if (!ids || !ids.length) return;
    for (let index = 0; index < ids.length; index++) {
      await this.categoryRepo.update(ids[index], { display_order: index + 1 });
    }
  }
}

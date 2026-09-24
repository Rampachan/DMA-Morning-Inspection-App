import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ulb } from '../database/entities/ulb.entity';
import { UlbType } from '../common/enums/ulb-type.enum';
import { CreateUlbDto } from './dto/create-ulb.dto';

export interface UlbFilters {
  district?: string;
  region?: string;
  type?: UlbType;
  activeOnly?: boolean;
}

@Injectable()
export class UlbService {
  constructor(
    @InjectRepository(Ulb)
    private readonly ulbRepo: Repository<Ulb>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: UlbFilters = {}): Promise<Ulb[]> {
    const qb = this.ulbRepo.createQueryBuilder('ulb');

    if (filters.district) {
      qb.andWhere('ulb.district = :district', { district: filters.district });
    }
    if (filters.region) {
      qb.andWhere('ulb.region = :region', { region: filters.region });
    }
    if (filters.type) {
      qb.andWhere('ulb.type = :type', { type: filters.type });
    }
    if (filters.activeOnly) {
      qb.andWhere('ulb.active = true');
    }

    return qb.orderBy('ulb.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Ulb> {
    const ulb = await this.ulbRepo.findOne({ where: { ulb_id: id } });
    if (!ulb) throw new NotFoundException(`ULB ${id} not found.`);
    return ulb;
  }

  async create(dto: CreateUlbDto): Promise<Ulb> {
    const ulb = this.ulbRepo.create({
      name: dto.name,
      type: dto.type,
      district: dto.district,
      region: dto.region ?? null,
      active: dto.active ?? true,
    });
    return this.ulbRepo.save(ulb);
  }

  async update(id: string, dto: Partial<CreateUlbDto>): Promise<Ulb> {
    const ulb = await this.findOne(id);
    Object.assign(ulb, dto);
    return this.ulbRepo.save(ulb);
  }

  /**
   * Stores a GeoJSON Polygon as a PostGIS geometry using ST_GeomFromGeoJSON.
   */
  async updateBoundary(
    id: string,
    geojsonPolygon: { type: string; coordinates: number[][][] },
  ): Promise<Ulb> {
    await this.findOne(id); // throws if not found

    const geojsonStr = JSON.stringify(geojsonPolygon);

    await this.dataSource.query(
      `UPDATE ulb SET geom = ST_GeomFromGeoJSON($1) WHERE ulb_id = $2`,
      [geojsonStr, id],
    );

    return this.findOne(id);
  }

  async getByIds(ids: string[]): Promise<Ulb[]> {
    if (ids.length === 0) return [];
    return this.ulbRepo
      .createQueryBuilder('ulb')
      .where('ulb.ulb_id IN (:...ids)', { ids })
      .getMany();
  }

  async findActive(): Promise<Ulb[]> {
    return this.ulbRepo.find({ where: { active: true } });
  }
}

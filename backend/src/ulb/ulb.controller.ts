import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UlbService } from './ulb.service';
import { CreateUlbDto } from './dto/create-ulb.dto';
import { UpdateBoundaryDto } from './dto/update-boundary.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { UlbType } from '../common/enums/ulb-type.enum';

@Controller('ulb')
@UseGuards(RolesGuard)
export class UlbController {
  constructor(private readonly ulbService: UlbService) {}

  @Get()
  findAll(
    @Query('district') district?: string,
    @Query('region') region?: string,
    @Query('type') type?: UlbType,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.ulbService.findAll({
      district,
      region,
      type,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ulbService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUlbDto) {
    return this.ulbService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUlbDto,
  ) {
    return this.ulbService.update(id, dto);
  }

  @Post(':id/boundary')
  @Roles(Role.ADMIN)
  updateBoundary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBoundaryDto,
  ) {
    return this.ulbService.updateBoundary(id, dto.geojson);
  }
}

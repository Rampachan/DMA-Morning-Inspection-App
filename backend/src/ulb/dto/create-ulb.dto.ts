import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UlbType } from '../../common/enums/ulb-type.enum';

export class CreateUlbDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(UlbType)
  type!: UlbType;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

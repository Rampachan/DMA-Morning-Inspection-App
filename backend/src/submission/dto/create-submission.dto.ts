import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class PhotoMetaDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsDateString()
  captured_at!: string;
}

export class CreateSubmissionDto {
  @IsUUID()
  category_id!: string;

  @IsDateString()
  device_timestamp!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoMetaDto)
  photos_meta!: PhotoMetaDto[];
}

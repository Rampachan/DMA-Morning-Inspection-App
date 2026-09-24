import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/roles.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  /**
   * Required when role === 'commissioner'.
   * Validation enforced in UsersService.create().
   */
  @IsOptional()
  @IsUUID()
  ulb_id?: string;

  @IsOptional()
  @IsUUID()
  ulbId?: string;
}

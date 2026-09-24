import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Role } from '../common/enums/roles.enum';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<User> {
    const ulbId = dto.ulb_id || dto.ulbId;
    if (dto.role === Role.COMMISSIONER && !ulbId) {
      throw new BadRequestException(
        'ulb_id is required when role is commissioner.',
      );
    }

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      name: dto.name.trim(),
      role: dto.role,
      username: dto.username.trim(),
      mobile: dto.mobile ? dto.mobile.trim() : null,
      password_hash,
      ulb_id: ulbId ?? null,
      active: true,
    });

    const saved = await this.userRepo.save(user);

    void this.auditLogService.log('user.create', actorId ?? null, {
      user_id: saved.user_id,
      username: saved.username,
    });

    return this.findOne(saved.user_id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['ulb'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { user_id: id },
      relations: ['ulb'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return user;
  }

  /**
   * Selects password_hash — ONLY used by AuthService.
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.username = :username', { username })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string): Promise<User> {
    const user = await this.findOne(id);

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.mobile !== undefined) user.mobile = dto.mobile ? dto.mobile.trim() : null;
    
    if (dto.username !== undefined && dto.username.trim().toLowerCase() !== user.username) {
      const trimmedUsername = dto.username.trim().toLowerCase();
      const existing = await this.findByUsername(trimmedUsername);
      if (existing && existing.user_id !== id) {
        throw new ConflictException(`Username "${trimmedUsername}" is already taken.`);
      }
      user.username = trimmedUsername;
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
      if (dto.role !== Role.COMMISSIONER) {
        user.ulb_id = null;
      }
    }

    const activeVal = dto.active !== undefined ? dto.active : dto.isActive;
    if (activeVal !== undefined) user.active = activeVal;

    const ulbIdVal = dto.ulb_id !== undefined ? dto.ulb_id : dto.ulbId;
    if (ulbIdVal !== undefined) {
      user.ulb_id = ulbIdVal ? ulbIdVal : null;
    }

    if (dto.password !== undefined && dto.password.trim().length > 0) {
      (user as User & { password_hash: string }).password_hash =
        await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    await this.userRepo.save(user);

    void this.auditLogService.log('user.update', actorId ?? null, {
      user_id: id,
    });

    return this.findOne(id);
  }

  async deactivate(id: string, actorId?: string): Promise<User> {
    const user = await this.findOne(id);
    user.active = false;
    await this.userRepo.save(user);

    void this.auditLogService.log('user.deactivate', actorId ?? null, {
      user_id: id,
    });

    return this.findOne(id);
  }

  async reactivate(id: string, actorId?: string): Promise<User> {
    const user = await this.findOne(id);
    user.active = true;
    await this.userRepo.save(user);

    void this.auditLogService.log('user.reactivate', actorId ?? null, {
      user_id: id,
    });

    return this.findOne(id);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { last_login_at: new Date() });
  }

  async findByUlbIds(ulbIds: string[]): Promise<User[]> {
    if (ulbIds.length === 0) return [];
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.ulb_id IN (:...ulbIds)', { ulbIds })
      .andWhere('u.active = true')
      .getMany();
  }

  async findByRoles(roles: Role[]): Promise<User[]> {
    if (roles.length === 0) return [];
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.role IN (:...roles)', { roles })
      .andWhere('u.active = true')
      .getMany();
  }
}

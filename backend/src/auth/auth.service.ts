import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Validates username + password.
   * Returns the User entity (without password_hash) or null if invalid.
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return null;

    if (!user.active) {
      throw new UnauthorizedException('Account is deactivated.');
    }

    // Strip password_hash before returning
    const { password_hash: _ph, ...safeUser } = user;
    return safeUser as Omit<User, 'password_hash'>;
  }

  /**
   * Issues a signed JWT for the validated user.
   * Updates last_login_at and writes an audit log entry.
   */
  async login(
    user: Omit<User, 'password_hash'>,
  ): Promise<{ access_token: string; user: { user_id: string; name: string; role: string; ulb_id: string | null } }> {
    const payload = {
      sub: user.user_id,
      role: user.role,
      ulb_id: user.ulb_id ?? null,
    };

    const access_token = this.jwtService.sign(payload);

    // Fire-and-forget — do not block login on these
    void this.usersService.updateLastLogin(user.user_id);
    void this.auditLogService.log('user.login', user.user_id, {
      username: user.username,
    });

    return {
      access_token,
      user: {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        ulb_id: user.ulb_id ?? null,
      },
    };
  }
}

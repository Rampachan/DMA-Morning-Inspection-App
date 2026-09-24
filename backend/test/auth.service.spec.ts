import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { AuditLogService } from '../src/audit-log/audit-log.service';
import { User } from '../src/database/entities/user.entity';
import { Role } from '../src/common/enums/roles.enum';
import * as bcrypt from 'bcrypt';

// ── Mock helpers ──────────────────────────────────────────────────────────────

const mockUser: User = {
  user_id: 'user-uuid-1234',
  name: 'Test Commissioner',
  role: Role.COMMISSIONER,
  username: 'testuser',
  mobile: null,
  password_hash: '', // will be set in beforeAll
  ulb_id: 'ulb-uuid-5678',
  active: true,
  last_login_at: null,
  created_at: new Date(),
  ulb: null,
};

const PLAIN_PASSWORD = 'Secur3P@ssword';

const mockUsersService = {
  findByUsername: jest.fn(),
  updateLastLogin: jest.fn().mockResolvedValue(undefined),
};

const mockAuditLogService = {
  log: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    // Hash the plain password so bcrypt.compare works in tests
    mockUser.password_hash = await bcrypt.hash(PLAIN_PASSWORD, 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── validateUser ────────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns the user (without password_hash) when credentials are correct', async () => {
      mockUsersService.findByUsername.mockResolvedValue({ ...mockUser });

      const result = await service.validateUser(
        mockUser.username,
        PLAIN_PASSWORD,
      );

      expect(result).not.toBeNull();
      expect(result!.user_id).toBe(mockUser.user_id);
      expect((result as unknown as Record<string, unknown>)['password_hash']).toBeUndefined();
    });

    it('returns null when the password is wrong', async () => {
      mockUsersService.findByUsername.mockResolvedValue({ ...mockUser });

      const result = await service.validateUser(
        mockUser.username,
        'WrongPassword99',
      );

      expect(result).toBeNull();
    });

    it('returns null when the username does not exist', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nobody', PLAIN_PASSWORD);

      expect(result).toBeNull();
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      mockUsersService.findByUsername.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await expect(
        service.validateUser(mockUser.username, PLAIN_PASSWORD),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns an access_token string and a user object', async () => {
      const safeUser = { ...mockUser } as Omit<User, 'password_hash'>;

      const result = await service.login(safeUser);

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
      expect(result.access_token).toBe('signed.jwt.token');

      expect(result).toHaveProperty('user');
      expect(result.user.user_id).toBe(mockUser.user_id);
      expect(result.user.role).toBe(mockUser.role);
      expect((result.user as unknown as Record<string, unknown>)['password_hash']).toBeUndefined();
    });

    it('calls jwtService.sign with the correct payload', async () => {
      const safeUser = { ...mockUser } as Omit<User, 'password_hash'>;

      await service.login(safeUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.user_id,
        role: mockUser.role,
        ulb_id: mockUser.ulb_id,
      });
    });

    it('calls updateLastLogin and audit log after login', async () => {
      const safeUser = { ...mockUser } as Omit<User, 'password_hash'>;
      await service.login(safeUser);

      // Allow microtasks (fire-and-forget) to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.user_id,
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        'user.login',
        mockUser.user_id,
        expect.objectContaining({ username: mockUser.username }),
      );
    });
  });
});

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
  ulb_id: string | null;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  sub: string;
  user_id: string;
  role: string;
  ulb_id: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'changeme'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      sub: payload.sub,
      user_id: payload.sub,
      role: payload.role,
      ulb_id: payload.ulb_id ?? null,
    };
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  role: string;
  ulb_id: string | null;
  iat?: number;
  exp?: number;
}

/**
 * @CurrentUser() param decorator — extracts the JWT payload attached by JwtStrategy.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);

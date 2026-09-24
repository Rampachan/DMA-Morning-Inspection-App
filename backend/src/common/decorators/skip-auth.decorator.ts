import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public — skips JwtAuthGuard.
 */
export const SkipAuth = () => SetMetadata(IS_PUBLIC_KEY, true);

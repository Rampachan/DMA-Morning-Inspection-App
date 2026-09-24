import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from '../../audit-log/audit-log.service';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * AuditInterceptor logs POST / PATCH / DELETE requests to audit_log after
 * successful response. Attach the @SetMetadata(AUDIT_ACTION_KEY, 'my-action')
 * decorator on a handler to customise the action label; otherwise the method
 * + route path is used.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{
        method: string;
        url: string;
        user?: { sub?: string; user_id?: string };
      }>();

    const method = request.method?.toUpperCase();
    const shouldAudit = ['POST', 'PATCH', 'DELETE'].includes(method);

    if (!shouldAudit) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const action =
          this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
            context.getHandler(),
            context.getClass(),
          ]) ?? `${method} ${request.url}`;

        const actorId =
          request.user?.sub ?? request.user?.user_id ?? null;

        void this.auditLogService.log(action, actorId, {
          url: request.url,
          method,
        });
      }),
    );
  }
}

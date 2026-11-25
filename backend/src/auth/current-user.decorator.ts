import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthUser, AuthenticatedRequest } from './jwt-auth.guard';

/** Injects the authenticated user (set by JwtAuthGuard) into a controller method. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthClientService } from '@tmdjr/ngx-auth-client';

export const localMode = () =>
  process.env.ASSESSMENT_LOCAL_DEV === 'true' &&
  process.env.NODE_ENV !== 'production';
export const localOrigins = [
  'https://admin.ngx-workshop.io',
  'http://localhost:4201',
];

export function assertLocalDatabase() {
  if (!localMode()) return;
  // Local bypass must never connect to a production database, even via .env.
  if (
    process.env.MONGODB_URI !==
    'mongodb://127.0.0.1:27017/assessment_test_local'
  ) {
    throw new Error(
      'Local assessment mode requires the isolated assessment_test_local database on loopback'
    );
  }
}

@Injectable()
export class AssessmentAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthClientService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (localMode()) {
      assertLocalDatabase();
      if (
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
          request.socket.remoteAddress
        ) ||
        (request.headers.origin &&
          !localOrigins.includes(request.headers.origin))
      ) {
        throw new ForbiddenException(
          'Local development access requires loopback and an allowed origin'
        );
      }
      request.user = { sub: 'local-assessment-admin', role: 'admin' };
      return true;
    }
    await this.auth.validateAccessToken(request);
    return true;
  }
}

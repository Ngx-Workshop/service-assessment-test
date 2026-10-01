import {
  AssessmentAuthGuard,
  assertLocalDatabase,
} from './assessment-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('local development isolation', () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
  });
  const context = (
    origin = 'https://admin.ngx-workshop.io',
    address = '127.0.0.1'
  ) => {
    const req = {
      headers: { origin },
      socket: { remoteAddress: address },
      user: undefined,
    };
    return {
      req,
      ctx: {
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext,
    };
  };
  it('requires an explicit isolated loopback database', () => {
    process.env.ASSESSMENT_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/other';
    expect(assertLocalDatabase).toThrow('isolated');
  });
  it('requires loopback requests and allowed browser origins', async () => {
    process.env.ASSESSMENT_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/assessment_test_local';
    const guard = new AssessmentAuthGuard({
      validateAccessToken: jest.fn(),
    } as any);
    await expect(
      guard.canActivate(context('https://example.com').ctx)
    ).rejects.toThrow();
    await expect(
      guard.canActivate(context(undefined, '192.168.1.2').ctx)
    ).rejects.toThrow();
    const { req, ctx } = context();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ sub: 'local-assessment-admin', role: 'admin' });
  });
  it('always uses platform authentication in production even when the local flag is set', async () => {
    process.env.ASSESSMENT_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'production';
    const validateAccessToken = jest.fn().mockResolvedValue(undefined);
    await new AssessmentAuthGuard({ validateAccessToken } as any).canActivate(
      context().ctx
    );
    expect(validateAccessToken).toHaveBeenCalledTimes(1);
  });
});

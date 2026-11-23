import type { Server } from 'node:http';
import {
  ConflictException,
  Controller,
  Get,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AssessmentWriteService } from '../assessment-test/assessment-write.service';
import { AssessmentTest } from '../assessment-test/schemas/assessment-test.schemas';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Match callable Supertest in CommonJS service builds.
import request = require('supertest');
import { ObservabilityModule } from './observability.module';
import {
  createServiceLogger,
  httpLoggingMiddleware,
  requestContext,
} from './observability';

@Controller('items')
class TestController {
  @Get(':id')
  async get() {
    await new Promise((resolve) => setImmediate(resolve));
    return { ok: true, requestId: requestContext.getStore()?.requestId };
  }
}

describe('Service observability', () => {
  let app: INestApplication<Server>;
  const log = jest.fn();
  const warn = jest.fn();
  const error = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(httpLoggingMiddleware({ log, warn, error } as unknown as Logger));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves an anonymous, non-cached heartbeat without database or auth providers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      status: 'ok',
      info: { heartbeat: { status: 'up' } },
      error: {},
      details: { heartbeat: { status: 'up' } },
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('logs route templates and timings without request data or concrete identifiers', async () => {
    const response = await request(app.getHttpServer())
      .get('/items/private-person?token=private-query')
      .set('Authorization', 'Bearer private-auth')
      .set('Cookie', 'session=private-cookie')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body).toMatchObject({
      requestId: response.headers['x-request-id'],
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        method: 'GET',
        route: '/items/:id',
        statusCode: 200,
        durationMs: expect.any(Number) as unknown,
        requestId: response.headers['x-request-id'],
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('logs unknown routes without their raw paths or query values', async () => {
    await request(app.getHttpServer())
      .get('/private-missing?secret=private-query')
      .expect(404);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/unmatched', statusCode: 404 })
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-');
  });

  it('does not provide a write endpoint for heartbeat', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .send({ secret: 'private-body' })
      .expect(404);
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-body');
  });

  it('uses native Nest JSON logging with a contextual, structured message', () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      createServiceLogger().log({ event: 'test_event' }, 'ObservabilityTest');
      expect(write).toHaveBeenCalled();
      const entry: unknown = JSON.parse(String(write.mock.calls[0][0]));
      expect(entry).toEqual(
        expect.objectContaining({
          level: 'log',
          context: 'ObservabilityTest',
          message: { event: 'test_event' },
        })
      );
    } finally {
      write.mockRestore();
    }
  });

  it('ignores caller correlation data and isolates concurrent HTTP contexts', async () => {
    const responses = await Promise.all(
      ['one', 'two'].map((id) =>
        request(app.getHttpServer())
          .get(`/items/${id}`)
          .set('X-Request-ID', 'private-caller-id')
          .expect(200)
      )
    );
    const ids = responses.map((response) => response.headers['x-request-id']);
    expect(new Set(ids).size).toBe(2);
    responses.forEach((response, index) => {
      expect(response.body).toMatchObject({ requestId: ids[index] });
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-caller-id');
    expect(requestContext.getStore()).toBeUndefined();
  });

  it('serializes real domain success/rejection/failure without canary content', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AssessmentWriteService,
        {
          provide: getModelToken(AssessmentTest.name),
          useValue: {
            db: {
              collection: () => ({
                findOneAndUpdate: () => Promise.resolve(),
                deleteOne: () => Promise.resolve(),
              }),
            },
          },
        },
      ],
    }).compile();
    const writes = module.get(AssessmentWriteService);
    const stdout = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    try {
      Logger.overrideLogger(createServiceLogger());
      await writes.run('submit', () =>
        Promise.resolve({ answer: 'private-answer' })
      );
      const rejected = new ConflictException('private-rejection');
      await expect(
        writes.run('start', () => Promise.reject(rejected))
      ).rejects.toBe(rejected);
      const failure = new Error('private-storage-token');
      await expect(
        writes.run('create', () => Promise.reject(failure))
      ).rejects.toBe(failure);
      expect(JSON.parse(String(stdout.mock.calls[0][0]))).toMatchObject({
        level: 'log',
        context: 'AssessmentWriteService',
        message: {
          event: 'assessment_write',
          outcome: 'success',
          operation: 'submit',
        },
      });
      expect(JSON.parse(String(stdout.mock.calls[1][0]))).toMatchObject({
        level: 'warn',
        context: 'AssessmentWriteService',
        message: {
          event: 'assessment_write',
          outcome: 'rejected',
          statusCode: 409,
        },
      });
      expect(JSON.parse(String(stderr.mock.calls[0][0]))).toMatchObject({
        level: 'error',
        context: 'AssessmentWriteService',
        message: { event: 'assessment_write', outcome: 'failure' },
      });
      expect(
        JSON.stringify([...stdout.mock.calls, ...stderr.mock.calls])
      ).not.toContain('private-');
    } finally {
      Logger.overrideLogger(false);
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});

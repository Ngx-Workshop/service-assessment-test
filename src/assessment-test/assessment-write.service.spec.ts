import { ConflictException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AssessmentWriteService } from './assessment-write.service';
import { AssessmentTest } from './schemas/assessment-test.schemas';
import { requestContext } from '../observability/observability';

describe('Safe assessment write events', () => {
  let writes: AssessmentWriteService;
  const leases = { findOneAndUpdate: jest.fn(), deleteOne: jest.fn() };
  let log: jest.SpyInstance<void, [Record<string, unknown>, ...unknown[]]>;
  let warn: jest.SpyInstance<void, [Record<string, unknown>, ...unknown[]]>;
  let error: jest.SpyInstance<void, [Record<string, unknown>, ...unknown[]]>;

  beforeEach(async () => {
    jest.resetAllMocks();
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      providers: [
        AssessmentWriteService,
        {
          provide: getModelToken(AssessmentTest.name),
          useValue: { db: { collection: () => leases } },
        },
      ],
    }).compile();
    writes = module.get(AssessmentWriteService);
    log.mockClear();
    warn.mockClear();
    error.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('correlates isolated concurrent work, without logging results or identity', async () => {
    await Promise.all(
      ['request-one', 'request-two'].map((requestId) =>
        requestContext.run({ requestId }, () =>
          writes.run('submit', async () => {
            await new Promise((resolve) => setImmediate(resolve));
            return { answer: 'private-answer', userId: 'private-user' };
          })
        )
      )
    );
    expect(log).toHaveBeenCalledTimes(2);
    const events = log.mock.calls.map(([entry]) => entry);
    expect(events.map((entry) => entry.requestId).sort()).toEqual([
      'request-one',
      'request-two',
    ]);
    expect(new Set(events.map((entry) => entry.runId)).size).toBe(2);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'assessment_write',
        operation: 'submit',
        outcome: 'success',
        durationMs: expect.any(Number) as unknown,
        runId: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
    expect(requestContext.getStore()).toBeUndefined();
  });

  it('warns for rejected operations and logs unexpected storage failures once without raw errors', async () => {
    const rejected = new ConflictException('private-rejection');
    await expect(
      writes.run('start', () => Promise.reject(rejected))
    ).rejects.toBe(rejected);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'rejected',
        statusCode: 409,
        operation: 'start',
      })
    );
    const failure = new Error('private-token private-answer private-user');
    leases.findOneAndUpdate.mockRejectedValueOnce(failure);
    await expect(
      writes.run('create', () => Promise.resolve('private-result'))
    ).rejects.toBe(failure);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', operation: 'create' })
    );
    expect(
      JSON.stringify([
        ...log.mock.calls,
        ...warn.mock.calls,
        ...error.mock.calls,
      ])
    ).not.toContain('private-');
    expect(log).not.toHaveBeenCalled();
    expect(error.mock.calls[0][0]).not.toHaveProperty('requestId');
  });

  it('logs cleanup failure as failure, not a successful operation', async () => {
    const failure = new Error('private-cleanup');
    leases.deleteOne.mockRejectedValueOnce(failure);
    await expect(writes.run('delete', () => Promise.resolve())).rejects.toBe(
      failure
    );
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-cleanup');
  });
});

import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { requestContext } from '../observability/observability';
import {
  AssessmentTest,
  AssessmentTestDocument,
} from './schemas/assessment-test.schemas';

type WriteOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'start'
  | 'save_answers'
  | 'submit';

@Injectable()
export class AssessmentWriteService {
  private readonly logger = new Logger(AssessmentWriteService.name);

  constructor(
    @InjectModel(AssessmentTest.name)
    private readonly definitions: Model<AssessmentTestDocument>
  ) {}

  async run<T>(
    operation: WriteOperation,
    execute: () => Promise<T>
  ): Promise<T> {
    const runId = randomUUID();
    const requestId = requestContext.getStore()?.requestId;
    const started = process.hrtime.bigint();
    const entry = () => ({
      event: 'assessment_write',
      operation,
      runId,
      ...(requestId ? { requestId } : {}),
      durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    });
    try {
      const result = await this.withLease(runId, execute);
      this.logger.log({ ...entry(), outcome: 'success' });
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        this.logger.warn({
          ...entry(),
          outcome: 'rejected',
          statusCode: error.getStatus(),
        });
      } else {
        this.logger.error({ ...entry(), outcome: 'failure' });
      }
      throw error;
    }
  }

  private async withLease<T>(
    owner: string,
    execute: () => Promise<T>
  ): Promise<T> {
    const leases = this.definitions.db.collection<{
      _id: string;
      owner: string;
      expires: Date;
    }>('assessment_write_leases');
    try {
      await leases.findOneAndUpdate(
        { _id: 'assessment-writes', expires: { $lte: new Date() } },
        { $set: { owner, expires: new Date(Date.now() + 120_000) } },
        { upsert: true, maxTimeMS: 5000 }
      );
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'Another assessment change is in progress. Please retry.'
        );
      }
      throw error;
    }
    try {
      return await execute();
    } finally {
      await leases.deleteOne(
        { _id: 'assessment-writes', owner },
        { maxTimeMS: 5000 }
      );
    }
  }
}

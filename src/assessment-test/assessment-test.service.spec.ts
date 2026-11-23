import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AssessmentTestService } from './assessment-test.service';
import { AssessmentWriteService } from './assessment-write.service';
import { AssessmentTest } from './schemas/assessment-test.schemas';
import { UserAssessmentTest } from './schemas/user-assessment-test.schemas';

describe('Assessment submission persistence boundary', () => {
  const id = '670000000000000000000001';
  const definitionId = '670000000000000000000002';
  const query = <T>(value: T) => ({
    maxTimeMS: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  });
  let service: AssessmentTestService;
  const leases = {
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };
  const attempts = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
  const definitions = {
    db: { collection: jest.fn(() => leases) },
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    definitions.db.collection.mockReturnValue(leases);
    attempts.findOne.mockReturnValue(
      query({ assessmentTestId: definitionId, completed: false })
    );
    definitions.findById.mockReturnValue(
      query({
        testQuestions: [
          {
            choices: [{ value: 'private-answer' }, { value: 'B' }],
            answer: 'private-answer',
          },
        ],
      })
    );
    attempts.findOneAndUpdate.mockReturnValue(
      query({ completed: true, score: 1, passed: true })
    );
    const module = await Test.createTestingModule({
      providers: [
        AssessmentTestService,
        AssessmentWriteService,
        { provide: getModelToken(AssessmentTest.name), useValue: definitions },
        { provide: getModelToken(UserAssessmentTest.name), useValue: attempts },
      ],
    }).compile();
    service = module.get(AssessmentTestService);
  });

  it('grades and completes once with the canonical/legacy owner and incomplete filter', async () => {
    await expect(
      service.submitTest(id, ['private-answer'], 'private-owner')
    ).resolves.toMatchObject({
      completed: true,
      score: 1,
      passed: true,
    });
    expect(attempts.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: id,
        $or: [
          { userId: 'private-owner' },
          { userId: { $exists: false }, uuid: 'private-owner' },
        ],
        completed: false,
      },
      {
        $set: expect.objectContaining({
          userAnswers: ['private-answer'],
          draftAnswers: [],
          score: 1,
          passed: true,
        }) as unknown,
      },
      { new: true, runValidators: true }
    );
    expect(leases.deleteOne).toHaveBeenCalledWith(
      { _id: 'assessment-writes', owner: expect.any(String) as unknown },
      { maxTimeMS: 5000 }
    );
  });

  it('rejects malformed IDs and invalid choices, releasing the lease without writing', async () => {
    await expect(
      service.submitTest('invalid', [], 'owner')
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.submitTest(id, ['invalid'], 'owner')
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(attempts.findOneAndUpdate).not.toHaveBeenCalled();
    expect(leases.deleteOne).toHaveBeenCalledTimes(2);
  });

  it('conceals missing or other-owner attempts and rejects already-completed attempts', async () => {
    attempts.findOne.mockReturnValueOnce(query(null));
    await expect(service.submitTest(id, [], 'other')).rejects.toBeInstanceOf(
      NotFoundException
    );
    attempts.findOne.mockReturnValueOnce(query({ completed: true }));
    await expect(service.submitTest(id, [], 'owner')).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(attempts.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reports lease contention without executing or releasing another writer', async () => {
    leases.findOneAndUpdate.mockRejectedValueOnce({ code: 11000 });
    await expect(service.submitTest(id, [], 'owner')).rejects.toThrow(
      'Another assessment change is in progress'
    );
    expect(attempts.findOne).not.toHaveBeenCalled();
    expect(leases.deleteOne).not.toHaveBeenCalled();
  });

  it('preserves storage failures and releases an acquired lease', async () => {
    const failure = new Error('private-storage-secret');
    attempts.findOne.mockReturnValueOnce({
      maxTimeMS: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(failure),
    });
    await expect(service.submitTest(id, [], 'owner')).rejects.toBe(failure);
    expect(leases.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('retains cleanup failure semantics rather than reporting a successful write', async () => {
    const failure = new Error('private-cleanup-secret');
    leases.deleteOne.mockRejectedValueOnce(failure);
    await expect(
      service.submitTest(id, ['private-answer'], 'owner')
    ).rejects.toBe(failure);
  });
});

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { TestSubjectEnum } from './dto/create.dto';
import {
  CreateAssessmentTestDto,
  UpdateAssessmentTestDto,
} from './dto/definition.dto';
import { LearnerSubjectDto } from './dto/learner.dto';
import {
  AssessmentTest,
  AssessmentTestDocument,
} from './schemas/assessment-test.schemas';
import {
  UserAssessmentTest,
  UserAssessmentTestDocument,
} from './schemas/user-assessment-test.schemas';

@Injectable()
export class AssessmentTestService {
  constructor(
    @InjectModel(UserAssessmentTest.name)
    private attempts: Model<UserAssessmentTestDocument>,
    @InjectModel(AssessmentTest.name)
    private definitions: Model<AssessmentTestDocument>
  ) {}

  private id(id: string) {
    if (
      typeof id !== 'string' ||
      !Types.ObjectId.isValid(id) ||
      !/^[a-f\d]{24}$/i.test(id)
    )
      throw new BadRequestException('Invalid assessment ID');
    return id;
  }
  private owner(userId: string) {
    return { $or: [{ userId }, { userId: { $exists: false }, uuid: userId }] };
  }
  // Shared across instances. Every operation below has bounded database queries;
  // a crashed writer's lease expires without modifying definitions or attempts.
  private async write<T>(operation: () => Promise<T>): Promise<T> {
    const leases = this.definitions.db.collection<{
      _id: string;
      owner: string;
      expires: Date;
    }>('assessment_write_leases');
    const owner = randomUUID();
    try {
      await leases.findOneAndUpdate(
        { _id: 'assessment-writes', expires: { $lte: new Date() } },
        { $set: { owner, expires: new Date(Date.now() + 120_000) } },
        { upsert: true, maxTimeMS: 5000 }
      );
    } catch (error) {
      if (error?.code === 11000)
        throw new ConflictException(
          'Another assessment change is in progress. Please retry.'
        );
      throw error;
    }
    try {
      return await operation();
    } finally {
      await leases.deleteOne(
        { _id: 'assessment-writes', owner },
        { maxTimeMS: 5000 }
      );
    }
  }
  private validateDefinition(input: CreateAssessmentTestDto) {
    for (const [i, question] of input.testQuestions.entries()) {
      const choices = question.choices.map((choice) => choice.value);
      if (new Set(choices).size !== choices.length)
        throw new BadRequestException(
          `Question ${i + 1}: choices must be distinct`
        );
      if (!choices.includes(question.answer))
        throw new BadRequestException(
          `Question ${i + 1}: select an answer from the choices`
        );
    }
  }
  private async available(input: CreateAssessmentTestDto, id?: string) {
    const duplicate = await this.definitions
      .exists({
        subject: input.subject,
        level: input.level,
        ...(id ? { _id: { $ne: id } } : {}),
      })
      .maxTimeMS(5000);
    if (duplicate)
      throw new ConflictException(
        'A test already exists for this subject and level'
      );
  }
  private async unused(id: string) {
    if (await this.attempts.exists({ assessmentTestId: id }).maxTimeMS(5000)) {
      throw new ConflictException(
        'This test has learner attempts and cannot be edited or deleted'
      );
    }
  }
  async create(input: CreateAssessmentTestDto) {
    this.validateDefinition(input);
    return this.write(async () => {
      await this.available(input);
      return new this.definitions(input).save({ wtimeout: 5000 });
    });
  }
  fetch() {
    return this.definitions
      .find()
      .sort({ subject: 1, level: 1 })
      .maxTimeMS(5000)
      .exec();
  }
  async fetchAssessmentTest(id: string) {
    const definition = await this.definitions
      .findById(this.id(id))
      .maxTimeMS(5000)
      .exec();
    if (!definition) throw new NotFoundException('Assessment test not found');
    return definition;
  }
  async update(input: UpdateAssessmentTestDto) {
    this.validateDefinition(input);
    return this.write(async () => {
      await this.fetchAssessmentTest(input._id);
      await this.unused(input._id);
      await this.available(input, input._id);
      const { _id, __v, ...fields } = input;
      const updated = await this.definitions
        .findOneAndUpdate(
          { _id, __v },
          { $set: { ...fields, lastUpdated: new Date() }, $inc: { __v: 1 } },
          { new: true, runValidators: true }
        )
        .maxTimeMS(5000)
        .exec();
      if (!updated)
        throw new ConflictException(
          'This test changed since you opened it. Reload before saving.'
        );
      return updated;
    });
  }
  async delete(id: string) {
    this.id(id);
    return this.write(async () => {
      await this.fetchAssessmentTest(id);
      await this.unused(id);
      await this.definitions.deleteOne({ _id: id }).maxTimeMS(5000).exec();
    });
  }
  fetchUsersAssessments(userId: string) {
    return this.attempts.find(this.owner(userId)).maxTimeMS(5000).exec();
  }
  async fetchUserSubjectsEligibility(
    userId: string,
    subjects: TestSubjectEnum[]
  ) {
    const [attempts, definitions] = await Promise.all([
      this.attempts
        .find({ ...this.owner(userId), subject: { $in: subjects } })
        .maxTimeMS(5000)
        .exec(),
      this.definitions
        .find({ subject: { $in: subjects } })
        .maxTimeMS(5000)
        .exec(),
    ]);
    return [...new Set(subjects)].map((subject) => {
      const completed = attempts.filter(
        (t) => t.subject === subject && t.completed
      ).length;
      return {
        subject,
        levelCount: completed,
        totalCount: definitions.filter((t) => t.subject === subject).length,
        enabled:
          attempts.some((t) => t.subject === subject && !t.completed) ||
          definitions.some(
            (t) => t.subject === subject && t.level === completed + 1
          ),
      };
    });
  }
  async startTest(subject: string, userId: string, assessmentTestId?: string) {
    return this.write(async () => {
      const attempts = await this.attempts
        .find({ ...this.owner(userId), subject })
        .maxTimeMS(5000)
        .exec();
      const incomplete = attempts.find((t) => !t.completed);
      if (incomplete) {
        if (
          assessmentTestId &&
          incomplete.assessmentTestId !== assessmentTestId
        )
          throw new ConflictException(
            'Resume your in-progress assessment first'
          );
        return incomplete;
      }
      const candidates = await this.definitions
        .find({ subject, level: attempts.length + 1 })
        .limit(2)
        .maxTimeMS(5000)
        .exec();
      if (!candidates.length)
        throw new ConflictException(
          'No next assessment is available for this subject'
        );
      if (candidates.length > 1)
        throw new ConflictException(
          'Duplicate subject levels must be resolved by an administrator'
        );
      const definition = candidates[0];
      if (assessmentTestId && String(definition._id) !== assessmentTestId)
        throw new ConflictException(
          'This assessment is no longer eligible. Refresh the subject.'
        );
      return new this.attempts({
        assessmentTestId: String(definition._id),
        testName: definition.name,
        userId,
        uuid: userId,
        subject,
      }).save({ wtimeout: 5000 });
    });
  }
  private async ownedAttempt(id: string, userId: string) {
    const attempt = await this.attempts
      .findOne({ _id: this.id(id), ...this.owner(userId) })
      .maxTimeMS(5000)
      .exec();
    if (!attempt) throw new NotFoundException('Assessment attempt not found');
    return attempt;
  }
  async questions(id: string, userId: string) {
    const attempt = await this.ownedAttempt(id, userId);
    const definition = await this.fetchAssessmentTest(attempt.assessmentTestId);
    return {
      testId: id,
      name: definition.name,
      testQuestions: definition.testQuestions.map(({ question, choices }) => ({
        question,
        choices,
      })),
    };
  }
  private enriched(
    attempt: UserAssessmentTestDocument,
    definition: AssessmentTestDocument
  ) {
    return {
      ...attempt.toObject(),
      level: definition.level,
      questionCount: definition.testQuestions.length,
      draftAnswers: attempt.draftAnswers ?? [],
    };
  }
  async history(userId: string) {
    const attempts = await this.attempts
      .find(this.owner(userId))
      .sort({ lastUpdated: -1 })
      .maxTimeMS(5000)
      .exec();
    const definitions = await this.definitions
      .find({ _id: { $in: attempts.map((t) => t.assessmentTestId) } })
      .maxTimeMS(5000)
      .exec();
    return attempts.map((attempt) => {
      const definition = definitions.find(
        (d) => String(d._id) === attempt.assessmentTestId
      );
      // Legacy orphan records remain visible with explicitly unavailable metadata.
      return definition
        ? this.enriched(attempt, definition)
        : {
            ...attempt.toObject(),
            level: 0,
            questionCount: 0,
            draftAnswers: attempt.draftAnswers ?? [],
          };
    });
  }
  async catalog(userId: string): Promise<LearnerSubjectDto[]> {
    const [attempts, definitions] = await Promise.all([
      this.attempts.find(this.owner(userId)).maxTimeMS(5000).exec(),
      this.definitions.find().sort({ level: 1 }).maxTimeMS(5000).exec(),
    ]);
    return Object.values(TestSubjectEnum).map((subject) => {
      const owned = attempts.filter((t) => t.subject === subject);
      const completed = owned.filter((t) => t.completed);
      const passed = completed.filter((t) => t.passed);
      const incomplete = owned.find((t) => !t.completed);
      const tests = definitions
        .filter((d) => d.subject === subject)
        .map((d) => {
          const matches = owned.filter(
            (t) => t.assessmentTestId === String(d._id)
          );
          const attempt =
            matches.find((t) => !t.completed) ??
            matches.find((t) => t.completed);
          const uniqueLevel =
            definitions.filter(
              (other) => other.subject === subject && other.level === d.level
            ).length === 1;
          const status = attempt
            ? attempt.completed
              ? 'completed'
              : 'in-progress'
            : !incomplete && uniqueLevel && d.level === completed.length + 1
              ? 'available'
              : 'locked';
          return {
            id: String(d._id),
            name: d.name,
            level: d.level,
            questionCount: d.testQuestions.length,
            status,
            attemptId: attempt ? String(attempt._id) : null,
          } as const;
        });
      const graded = completed.filter((t) =>
        tests.some((d) => d.id === t.assessmentTestId)
      );
      const total = graded.reduce(
        (sum, t) =>
          sum +
          (tests.find((d) => d.id === t.assessmentTestId)?.questionCount ?? 0),
        0
      );
      return {
        subject,
        tests,
        completedCount: completed.length,
        passedCount: passed.length,
        highestPassedLevel: Math.max(
          0,
          ...passed.map(
            (t) => tests.find((d) => d.id === t.assessmentTestId)?.level ?? 0
          )
        ),
        accuracy: total
          ? Math.round(
              (100 * graded.reduce((sum, t) => sum + t.score, 0)) / total
            )
          : null,
      };
    });
  }
  async saveAnswers(id: string, userId: string, answers: string[]) {
    return this.write(async () => {
      const attempt = await this.ownedAttempt(id, userId);
      if (attempt.completed)
        throw new ConflictException('Assessment attempt already completed');
      const definition = await this.fetchAssessmentTest(
        attempt.assessmentTestId
      );
      if (
        answers.length !== definition.testQuestions.length ||
        answers.some(
          (a, i) =>
            a !== '' &&
            !definition.testQuestions[i].choices.some((c) => c.value === a)
        )
      )
        throw new BadRequestException(
          'Provide a valid choice or an empty slot for every question'
        );
      const updated = await this.attempts
        .findOneAndUpdate(
          { _id: id, ...this.owner(userId), completed: false },
          { $set: { draftAnswers: answers, lastUpdated: new Date() } },
          { new: true, runValidators: true }
        )
        .maxTimeMS(5000)
        .exec();
      if (!updated)
        throw new ConflictException('Assessment attempt already completed');
      return this.enriched(updated, definition);
    });
  }
  async result(id: string, userId: string) {
    const attempt = await this.ownedAttempt(id, userId);
    if (!attempt.completed)
      throw new ConflictException(
        'Complete the assessment before viewing feedback'
      );
    const definition = await this.fetchAssessmentTest(attempt.assessmentTestId);
    return {
      attempt: this.enriched(attempt, definition),
      questions: definition.testQuestions.map((q, i) => {
        const correct = attempt.userAnswers[i] === q.answer;
        return {
          question: q.question,
          selectedAnswer: attempt.userAnswers[i] ?? '',
          correctAnswer: q.answer,
          correct,
          feedback: correct ? q.correctResponse : q.incorrectResponse,
        };
      }),
    };
  }
  async submitTest(id: string, answers: string[], userId: string) {
    return this.write(async () => {
      const attempt = await this.ownedAttempt(id, userId);
      if (attempt.completed)
        throw new ConflictException('Assessment attempt already completed');
      const definition = await this.fetchAssessmentTest(
        attempt.assessmentTestId
      );
      if (
        answers.length !== definition.testQuestions.length ||
        answers.some(
          (a, i) =>
            !definition.testQuestions[i].choices.some((c) => c.value === a)
        )
      )
        throw new BadRequestException(
          'Provide one valid choice for every question'
        );
      const score = answers.filter(
        (a, i) => a === definition.testQuestions[i].answer
      ).length;
      const updated = await this.attempts
        .findOneAndUpdate(
          { _id: id, ...this.owner(userId), completed: false },
          {
            $set: {
              completed: true,
              score,
              passed: score === answers.length,
              userAnswers: answers,
              draftAnswers: [],
              lastUpdated: new Date(),
            },
          },
          { new: true, runValidators: true }
        )
        .maxTimeMS(5000)
        .exec();
      if (!updated)
        throw new ConflictException('Assessment attempt already completed');
      return updated;
    });
  }
}

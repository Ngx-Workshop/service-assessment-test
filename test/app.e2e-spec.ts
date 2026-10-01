import { Test } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthClientService } from '@tmdjr/ngx-auth-client';
import * as request from 'supertest';
import { AssessmentTestModule } from '../src/assessment-test/assessment-test.module';

describe('assessment HTTP with disposable Mongo and a fake identity provider', () => {
  let app: INestApplication;
  let db: Connection;
  const definition = () => ({
    name: 'Angular fundamentals',
    subject: 'ANGULAR',
    level: 1,
    testQuestions: [
      {
        question: 'Select A',
        choices: [{ value: 'A' }, { value: 'B' }],
        answer: 'A',
        correctResponse: 'Correct',
        incorrectResponse: 'Try again',
      },
    ],
  });
  const api = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path = '',
    user = 'admin'
  ) =>
    request(app.getHttpServer())
      [method](`/assessment-test${path}`)
      .set('Authorization', user);
  beforeAll(async () => {
    delete process.env.ASSESSMENT_LOCAL_DEV;
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(
          `mongodb://127.0.0.1:27017/assessment_test_regression_${process.pid}`,
          { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 5000 }
        ),
        AssessmentTestModule,
      ],
    })
      .overrideProvider(AuthClientService)
      .useValue({
        validateAccessToken: async (req) => {
          const user = req.headers.authorization;
          if (!user || user === 'none') throw new UnauthorizedException();
          req.user = {
            sub: user,
            role: user === 'admin' ? 'admin' : 'regular',
          };
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();
    db = app.get(getConnectionToken());
  });
  beforeEach(async () => {
    for (const name of [
      'assessmenttests',
      'userassessmenttests',
      'assessment_write_leases',
    ])
      await db.collection(name).deleteMany({});
  });
  afterAll(async () => {
    await db?.dropDatabase();
    await app?.close();
  });

  it('creates, reads, updates with version checking, and deletes definitions', async () => {
    const created = (await api('post').send(definition()).expect(201)).body;
    expect(created.__v).toBe(0);
    const changed = (
      await api('patch')
        .send({ ...definition(), name: 'Updated', _id: created._id, __v: 0 })
        .expect(200)
    ).body;
    expect(changed.__v).toBe(1);
    await api('patch')
      .send({ ...definition(), _id: created._id, __v: 0 })
      .expect(409);
    expect((await api('get', `/${created._id}`).expect(200)).body.name).toBe(
      'Updated'
    );
    await api('delete', `/${created._id}`).expect(204);
    await api('get', `/${created._id}`).expect(404);
    await api('delete', `/${created._id}`).expect(404);
    await api('get', '/invalid').expect(400);
  });
  it('rejects malformed nested data, stale answers, duplicates, whitespace, unknown fields and fractional levels', async () => {
    for (const input of [
      { ...definition(), name: '   ' },
      { ...definition(), level: 1.5 },
      { ...definition(), level: '1' },
      { ...definition(), testQuestions: [] },
      { ...definition(), privileged: true },
      {
        ...definition(),
        testQuestions: [{ ...definition().testQuestions[0], answer: 'C' }],
      },
      {
        ...definition(),
        testQuestions: [
          {
            ...definition().testQuestions[0],
            choices: [{ value: 'A' }, { value: ' A ' }],
          },
        ],
      },
      {
        ...definition(),
        testQuestions: [
          {
            ...definition().testQuestions[0],
            choices: [{ value: ' ' }, { value: 'B' }],
          },
        ],
      },
    ])
      await api('post').send(input).expect(400);
    await api('post').send(definition()).expect(201);
    await api('post').send(definition()).expect(409);
  });
  it('enforces authentication and admin roles on CRUD and other-user lookups', async () => {
    const created = (await api('post').send(definition()).expect(201)).body;
    await api('get', '', 'none').expect(401);
    for (const [method, path] of [
      ['get', ''],
      ['post', ''],
      ['patch', ''],
      ['delete', ''],
      ['delete', `/${created._id}`],
      ['get', `/${created._id}`],
      ['get', '/admin-user-asssessments/admin'],
      ['get', '/admin-user-subjects-eligibility/admin?subjects=ANGULAR'],
    ] as const)
      await api(method, path, 'learner').send(definition()).expect(403);
  });
  it('resumes owned attempts, redacts questions, locks used definitions, and grades only once', async () => {
    const created = (await api('post').send(definition()).expect(201)).body;
    const attempt = (
      await api('post', '/start-test', 'learner')
        .send({ subject: 'ANGULAR' })
        .expect(201)
    ).body;
    expect(attempt.userId).toBe('learner');
    expect(attempt.uuid).toBe('learner');
    expect(
      (
        await api('post', '/start-test', 'learner')
          .send({ subject: 'ANGULAR' })
          .expect(201)
      ).body._id
    ).toBe(attempt._id);
    expect(
      (
        await api(
          'get',
          `/attempts/${attempt._id}/questions`,
          'learner'
        ).expect(200)
      ).body.testQuestions[0]
    ).toEqual({
      question: 'Select A',
      choices: [{ value: 'A' }, { value: 'B' }],
    });
    await api('get', `/attempts/${attempt._id}/questions`, 'other').expect(404);
    await api('post', '/submit-test', 'other')
      .send({ testId: attempt._id, answers: ['A'] })
      .expect(404);
    await api('patch')
      .send({ ...definition(), _id: created._id, __v: 0 })
      .expect(409);
    await api('delete', `/${created._id}`).expect(409);
    await api('post', '/submit-test', 'learner')
      .send({ testId: attempt._id, answers: ['C'] })
      .expect(400);
    const completed = (
      await api('post', '/submit-test', 'learner')
        .send({ testId: attempt._id, answers: ['A'] })
        .expect(200)
    ).body;
    expect(completed.score).toBe(1);
    expect(completed.passed).toBe(true);
    await api('post', '/submit-test', 'learner')
      .send({ testId: attempt._id, answers: ['B'] })
      .expect(409);
    expect(
      (
        await api(
          'get',
          '/user-subjects-eligibility?subjects=ANGULAR',
          'learner'
        ).expect(200)
      ).body[0]
    ).toEqual({
      subject: 'ANGULAR',
      levelCount: 1,
      totalCount: 1,
      enabled: false,
    });
  });
  it('reads legacy uuid owners without accepting a conflicting canonical owner', async () => {
    const created = (await api('post').send(definition()).expect(201)).body;
    await db.collection('userassessmenttests').insertMany([
      {
        uuid: 'legacy',
        assessmentTestId: created._id,
        subject: 'ANGULAR',
        completed: false,
      },
      {
        uuid: 'legacy',
        userId: 'other',
        assessmentTestId: created._id,
        subject: 'ANGULAR',
        completed: false,
      },
    ]);
    expect(
      (await api('get', '/user-asssessments', 'legacy').expect(200)).body
    ).toHaveLength(1);
    const resumed = (
      await api('post', '/start-test', 'legacy')
        .send({ subject: 'ANGULAR' })
        .expect(201)
    ).body;
    expect(resumed.uuid).toBe('legacy');
    expect(resumed.userId).toBeUndefined();
    await api('post', '/submit-test', 'legacy')
      .send({ testId: resumed._id, answers: ['B'] })
      .expect(200);
  });
  it('serializes concurrent starts and submissions and recovers an expired lease', async () => {
    await api('post').send(definition()).expect(201);
    await db
      .collection('assessment_write_leases')
      .insertOne({
        _id: 'assessment-writes' as any,
        owner: 'crashed',
        expires: new Date(0),
      });
    const starts = await Promise.all(
      Array.from({ length: 6 }, () =>
        api('post', '/start-test', 'learner').send({ subject: 'ANGULAR' })
      )
    );
    expect(starts.every((r) => [201, 409].includes(r.status))).toBe(true);
    expect(
      await db
        .collection('userassessmenttests')
        .countDocuments({ userId: 'learner' })
    ).toBe(1);
    const attempt = (
      await api('post', '/start-test', 'learner')
        .send({ subject: 'ANGULAR' })
        .expect(201)
    ).body;
    const submissions = await Promise.all(
      Array.from({ length: 3 }, () =>
        api('post', '/submit-test', 'learner').send({
          testId: attempt._id,
          answers: ['A'],
        })
      )
    );
    expect(submissions.filter((r) => r.status === 200)).toHaveLength(1);
    expect(submissions.filter((r) => r.status === 409)).toHaveLength(2);
  });
});

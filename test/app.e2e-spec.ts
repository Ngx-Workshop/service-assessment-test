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

  it('round-trips section IDs/titles and keeps grouping stable across display renames', async () => {
    const subject = '670000000000000000000001';
    const input = { ...definition(), subject, sectionTitle: 'Rust' };
    const created = (await api('post').send(input).expect(201)).body;
    expect(created).toMatchObject({ subject, sectionTitle: 'Rust' });
    const renamed = (
      await api('patch')
        .send({
          ...input,
          sectionTitle: 'Rust language',
          _id: created._id,
          __v: 0,
        })
        .expect(200)
    ).body;
    expect(renamed).toMatchObject({ subject, sectionTitle: 'Rust language' });
    const legacyUpdate = (await api('patch').send({ ...definition(), subject, _id: created._id, __v: 1 }).expect(200)).body;
    expect(legacyUpdate.sectionTitle).toBe('Rust language');

    await api('post')
      .send({ ...input, sectionTitle: 'Another title' })
      .expect(409);
    const sameTitle = (
      await api('post')
        .send({ ...input, subject: 'legacy-rust-key' })
        .expect(201)
    ).body;
    expect(sameTitle.subject).toBe('legacy-rust-key');
    expect(
      (await api('get', `/${created._id}`).expect(200)).body.sectionTitle
    ).toBe('Rust language');
    const catalog = (
      await api('get', '/learner/catalog', 'learner').expect(200)
    ).body;
    expect(catalog.find((s) => s.subject === subject)).toMatchObject({
      sectionTitle: 'Rust language',
    });
    const eligibility = (
      await api(
        'get',
        `/user-subjects-eligibility?subjects=${subject}`,
        'learner'
      ).expect(200)
    ).body;
    expect(eligibility[0]).toMatchObject({
      subject,
      sectionTitle: 'Rust language',
      enabled: true,
    });
    const attempt = (
      await api('post', '/start-test', 'learner')
        .send({ subject, assessmentTestId: created._id })
        .expect(201)
    ).body;
    expect(attempt).toMatchObject({ subject, sectionTitle: 'Rust language' });
    await api('post', '/submit-test', 'learner')
      .send({ testId: attempt._id, answers: ['A'] })
      .expect(200);
    const completed = (
      await api('get', '/learner/catalog', 'learner').expect(200)
    ).body;
    expect(completed.find((s) => s.subject === subject)).toMatchObject({
      completedCount: 1,
      passedCount: 1,
    });
  });

  it('rejects invalid section identifiers and titles before creating definitions', async () => {
    for (const value of ['', '  ', null, 1, {}, [], 'x'.repeat(121)]) {
      await api('post')
        .send({ ...definition(), subject: value })
        .expect(400);
      await api('post')
        .send({ ...definition(), subject: 'rust', sectionTitle: value })
        .expect(400);
    }
    expect((await api('get').expect(200)).body).toEqual([]);
  });

  it('reads legacy subjects without changing stored identity or historical attempts', async () => {
    const legacy = await db
      .collection('assessmenttests')
      .insertOne({ ...definition(), __v: 0 });
    const read = (await api('get', `/${legacy.insertedId}`).expect(200)).body;
    expect(read).toMatchObject({ subject: 'ANGULAR', sectionTitle: 'ANGULAR' });
    const stored = await db
      .collection('assessmenttests')
      .findOne({ _id: legacy.insertedId });
    expect(stored).not.toHaveProperty('sectionTitle');
    expect(
      (
        await api('post', '/start-test', 'learner')
          .send({ subject: 'ANGULAR' })
          .expect(201)
      ).body.subject
    ).toBe('ANGULAR');
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
      sectionTitle: 'ANGULAR',
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
    await db.collection('assessment_write_leases').insertOne({
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
  it('exposes safe catalogs, exact eligible starts, persisted drafts and completed-only owned feedback', async () => {
    const first = (await api('post').send(definition()).expect(201)).body;
    const second = (
      await api('post')
        .send({ ...definition(), name: 'Next level', level: 2 })
        .expect(201)
    ).body;
    await api('post')
      .send({ ...definition(), subject: 'RXJS', level: 2 })
      .expect(201);
    await api('get', '/learner/catalog', 'none').expect(401);
    let catalog = (await api('get', '/learner/catalog', 'learner').expect(200))
      .body;
    expect(catalog).toHaveLength(2);
    expect(catalog[0].tests.map((t) => t.status)).toEqual([
      'available',
      'locked',
    ]);
    expect(catalog[1].tests[0].status).toBe('locked');
    expect(JSON.stringify(catalog)).not.toMatch(
      /correctResponse|incorrectResponse|"answer"|Select A/
    );
    await api('post', '/start-test', 'learner')
      .send({ subject: 'ANGULAR', assessmentTestId: second._id })
      .expect(409);
    const attempt = (
      await api('post', '/start-test', 'learner')
        .send({ subject: 'ANGULAR', assessmentTestId: first._id })
        .expect(201)
    ).body;
    await api('get', `/attempts/${attempt._id}/result`, 'learner').expect(409);
    await api('patch', `/attempts/${attempt._id}/answers`, 'other')
      .send({ answers: ['A'] })
      .expect(404);
    for (const answers of [[], ['C'], ['A', 'B']])
      await api('patch', `/attempts/${attempt._id}/answers`, 'learner')
        .send({ answers })
        .expect(400);
    await api('patch', `/attempts/${attempt._id}/answers`, 'learner')
      .send({ answers: [''] })
      .expect(200);
    await api('patch', `/attempts/${attempt._id}/answers`, 'learner')
      .send({ answers: ['B'] })
      .expect(200);
    let history = (await api('get', '/learner/history', 'learner').expect(200))
      .body;
    expect(history[0].draftAnswers).toEqual(['B']);
    expect(history[0].questionCount).toBe(1);
    expect(history[0].level).toBe(1);
    expect(
      (await api('get', '/learner/history', 'other').expect(200)).body
    ).toEqual([]);
    catalog = (await api('get', '/learner/catalog', 'learner').expect(200))
      .body;
    expect(catalog[0].tests[0].status).toBe('in-progress');
    await api('post', '/submit-test', 'learner')
      .send({ testId: attempt._id, answers: ['B'] })
      .expect(200);
    await api('patch', `/attempts/${attempt._id}/answers`, 'learner')
      .send({ answers: ['A'] })
      .expect(409);
    await api('get', `/attempts/${attempt._id}/result`, 'other').expect(404);
    const result = (
      await api('get', `/attempts/${attempt._id}/result`, 'learner').expect(200)
    ).body;
    expect(result.questions[0]).toEqual({
      question: 'Select A',
      selectedAnswer: 'B',
      correctAnswer: 'A',
      correct: false,
      feedback: 'Try again',
    });
    expect(result.attempt.draftAnswers).toEqual([]);
    catalog = (await api('get', '/learner/catalog', 'learner').expect(200))
      .body;
    expect(catalog[0]).toMatchObject({
      completedCount: 1,
      passedCount: 0,
      highestPassedLevel: 0,
      accuracy: 0,
    });
    expect(catalog[0].tests[1].status).toBe('available');
    const next = (
      await api('post', '/start-test', 'learner')
        .send({ subject: 'ANGULAR', assessmentTestId: second._id })
        .expect(201)
    ).body;
    await api('post', '/submit-test', 'learner')
      .send({ testId: next._id, answers: ['A'] })
      .expect(200);
    expect(
      (await api('get', '/learner/catalog', 'learner').expect(200)).body[0]
    ).toMatchObject({
      completedCount: 2,
      passedCount: 1,
      highestPassedLevel: 2,
      accuracy: 50,
    });
    expect(
      (await api('get', `/attempts/${next._id}/result`, 'learner').expect(200))
        .body.questions[0].feedback
    ).toBe('Correct');
  });
});

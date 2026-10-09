/** Local visual fixture. Synthetic identity, disposable database, loopback only. Never used by AppModule. */
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthClientService } from '@tmdjr/ngx-auth-client';
import { AssessmentTestModule } from '../src/assessment-test/assessment-test.module';
import { AssessmentTestService } from '../src/assessment-test/assessment-test.service';
import { TestSubjectEnum } from '../src/assessment-test/dto/create.dto';
import { resolve } from 'node:path';
import * as express from 'express';

async function preview() {
  delete process.env.ASSESSMENT_LOCAL_DEV;
  const module = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(
        `mongodb://127.0.0.1:27017/assessment_test_preview_${process.pid}`,
        { serverSelectionTimeoutMS: 5000 }
      ),
      AssessmentTestModule,
    ],
  })
    .overrideProvider(AuthClientService)
    .useValue({
      validateAccessToken: async (req) => {
        req.user = { sub: 'preview-learner', role: 'regular' };
      },
    })
    .compile();
  const app = module.createNestApplication();
  const db = app.get<Connection>(getConnectionToken());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  app.use(
    express.static(
      resolve(
        __dirname,
        '../../mfe-user-journey-assessment-test/dist/learner-verification'
      )
    )
  );
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path === '/overview')
      res.sendFile(
        resolve(
          __dirname,
          '../../mfe-user-journey-assessment-test/dist/learner-verification/index.html'
        )
      );
    else next();
  });
  await app.init();
  const service = app.get(AssessmentTestService);
  const question = (
    question: string,
    values: string[],
    answer: string,
    feedback: string
  ) => ({
    question,
    choices: values.map((value) => ({ value })),
    answer,
    correctResponse: feedback,
    incorrectResponse: feedback,
  });
  const angular = [
    question(
      'What is the primary role of an Angular component?',
      [
        'To define a view and its behavior',
        'To configure database connections',
        'To bundle static assets',
        'To manage HTTP servers',
      ],
      'To define a view and its behavior',
      'A component brings together a template, styles, and the behavior that powers a part of the user interface.'
    ),
    question(
      'Which syntax binds a component property to an element property?',
      [
        '[property]="expression"',
        '(event)="handler()"',
        '*property="value"',
        '#property="value"',
      ],
      '[property]="expression"',
      'Square brackets create a property binding. Parentheses bind to events.'
    ),
    question(
      'What happens when a signal’s value changes?',
      [
        'Consumers of the signal can update',
        'The entire application reloads',
        'All subscriptions complete',
        'Change detection is permanently disabled',
      ],
      'Consumers of the signal can update',
      'Signals track their consumers so dependent values and views can update when state changes.'
    ),
    question(
      'Where should shared data access usually live?',
      [
        'In an injectable service',
        'In every component template',
        'In a CSS stylesheet',
        'In the index HTML file',
      ],
      'In an injectable service',
      'An injectable service separates shared data access from presentation and can be reused across components.'
    ),
  ];
  for (const subject of Object.values(TestSubjectEnum)) {
    const names =
      subject === 'ANGULAR'
        ? [
            'Angular foundations',
            'Components & reactive state',
            'Application architecture',
          ]
        : subject === 'NESTJS'
          ? [
              'NestJS essentials',
              'Services & dependency injection',
              'API architecture',
            ]
          : [
              'Thinking in streams',
              'Operators & composition',
              'Advanced reactive patterns',
            ];
    for (let level = 1; level <= 3; level++)
      await service.create({
        subject,
        level,
        name: names[level - 1],
        testQuestions:
          subject === 'ANGULAR'
            ? angular
            : [
                question(
                  subject === 'NESTJS'
                    ? 'What is the role of a NestJS provider?'
                    : 'What does an Observable represent?',
                  subject === 'NESTJS'
                    ? [
                        'An injectable dependency',
                        'A browser stylesheet',
                        'A static HTML element',
                      ]
                    : [
                        'A stream of values over time',
                        'A fixed string',
                        'A stylesheet',
                      ],
                  subject === 'NESTJS'
                    ? 'An injectable dependency'
                    : 'A stream of values over time',
                  subject === 'NESTJS'
                    ? 'Providers encapsulate reusable behavior and participate in dependency injection.'
                    : 'An Observable models a stream; subscribing lets you receive its emitted values.'
                ),
              ],
      });
  }
  const first = await service.startTest('ANGULAR', 'preview-learner');
  await service.submitTest(
    String(first._id),
    [
      angular[0].answer,
      angular[1].answer,
      angular[2].answer,
      angular[3].choices[1].value,
    ],
    'preview-learner'
  );
  const next = await service.startTest('ANGULAR', 'preview-learner');
  await service.saveAnswers(String(next._id), 'preview-learner', [
    angular[0].answer,
    '',
    '',
    '',
  ]);
  const rxjs = await service.startTest('RXJS', 'preview-learner');
  await service.submitTest(
    String(rxjs._id),
    ['A stream of values over time'],
    'preview-learner'
  );
  await app.listen(4203, '127.0.0.1');
  console.log(
    'Disposable preview: http://localhost:4203/ (synthetic learner, isolated database)'
  );
  const stop = async () => {
    await db.dropDatabase();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
preview().catch((error) => {
  console.error(error);
  process.exit(1);
});

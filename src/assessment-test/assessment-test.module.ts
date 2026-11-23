import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  NgxAuthClientModule,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import { AssessmentTestController } from './assessment-test.controller';
import { AssessmentAuthGuard } from './assessment-auth.guard';
import { AssessmentTestService } from './assessment-test.service';
import { AssessmentWriteService } from './assessment-write.service';
import {
  AssessmentTest,
  AssessmentTestSchema,
} from './schemas/assessment-test.schemas';
import {
  UserAssessmentTest,
  UserAssessmentTestSchema,
} from './schemas/user-assessment-test.schemas';

const ASSESSMENT_SCHEMA_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forFeature([
          { name: AssessmentTest.name, schema: AssessmentTestSchema },
          { name: UserAssessmentTest.name, schema: UserAssessmentTestSchema },
        ]),
      ];

// When generating OpenAPI, stub out Mongoose models (and guard, if referenced)
const ASSESSMENT_FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [
        {
          provide: getModelToken(AssessmentTest.name),
          useValue: {
            find: () => ({ exec: () => Promise.resolve([]) }),
            findById: () => ({ exec: () => Promise.resolve(null) }),
            findByIdAndUpdate: () => ({ exec: () => Promise.resolve(null) }),
            findOne: () => ({ exec: () => Promise.resolve(null) }),
            create: () => Promise.resolve({}),
          },
        },
        {
          provide: getModelToken(UserAssessmentTest.name),
          useValue: {
            find: () => ({ exec: () => Promise.resolve([]) }),
            findById: () => ({ exec: () => Promise.resolve(null) }),
            findByIdAndUpdate: () => ({ exec: () => Promise.resolve(null) }),
            findOne: () => ({ exec: () => Promise.resolve(null) }),
            create: () => Promise.resolve({}),
          },
        },
        {
          // In case guards are evaluated during bootstrap, make it a no-op
          provide: RemoteAuthGuard,
          useValue: { canActivate: () => true },
        },
      ]
    : [];

@Module({
  imports: [NgxAuthClientModule, ...ASSESSMENT_SCHEMA_IMPORTS],
  controllers: [AssessmentTestController],
  providers: [
    AssessmentTestService,
    AssessmentWriteService,
    {
      provide: APP_GUARD,
      useClass: AssessmentAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ...ASSESSMENT_FAKE_PROVIDERS,
  ],
})
export class AssessmentTestModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  AuthenticationGuard,
  NgxAuthClientModule,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import { AssessmentTestController } from './assessment-test.controller';
import { AssessmentTestService } from './assessment-test.service';
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
            find: () => ({ exec: async () => [] }),
            findById: () => ({ exec: async () => null }),
            findByIdAndUpdate: () => ({ exec: async () => null }),
            findOne: () => ({ exec: async () => null }),
            create: async () => ({}),
          },
        },
        {
          provide: getModelToken(UserAssessmentTest.name),
          useValue: {
            find: () => ({ exec: async () => [] }),
            findById: () => ({ exec: async () => null }),
            findByIdAndUpdate: () => ({ exec: async () => null }),
            findOne: () => ({ exec: async () => null }),
            create: async () => ({}),
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
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ...ASSESSMENT_FAKE_PROVIDERS,
  ],
})
export class AssessmentTestModule {}

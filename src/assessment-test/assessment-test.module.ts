import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NgxAuthClientModule } from '@tmdjr/ngx-auth-client';
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
import { UserAssessmentTestService } from './user-assessment-test.service';

@Module({
  imports: [
    NgxAuthClientModule,
    MongooseModule.forFeature([
      { name: AssessmentTest.name, schema: AssessmentTestSchema },
      { name: UserAssessmentTest.name, schema: UserAssessmentTestSchema },
    ]),
  ],
  controllers: [AssessmentTestController],
  providers: [AssessmentTestService, UserAssessmentTestService],
})
export class AssessmentTestModule {}

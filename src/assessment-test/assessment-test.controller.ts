import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUser, IActiveUserData } from '@tmdjr/ngx-auth-client';
import { AssessmentTestService } from './assessment-test.service';
import {
  AssessmentTestDto,
  TestSubjectEnum,
  UserAssessmentTestDto,
  UserSubjectEligibilityDto,
} from './dto/create.dto';
import { AssessmentTestDocument } from './schemas/assessment-test.schemas';

@ApiTags('Assessment Tests')
@Controller('assessment-test')
export class AssessmentTestController {
  constructor(private assessmentTestService: AssessmentTestService) {}

  @Post()
  @ApiCreatedResponse({ type: AssessmentTestDto })
  create(@Body() assessmentTest: AssessmentTestDocument) {
    return this.assessmentTestService.create(assessmentTest);
  }

  @Get()
  @ApiOkResponse({ isArray: true })
  fetch() {
    return this.assessmentTestService.fetch();
  }

  @Post()
  @ApiOkResponse()
  update(@Body() assessmentTest: AssessmentTestDocument) {
    return this.assessmentTestService.update(assessmentTest);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Body() id: string) {
    return this.assessmentTestService.delete(id);
  }

  @Get('user-asssessments')
  @ApiOkResponse({ type: UserAssessmentTestDto, isArray: true })
  fetchUsersAssessments(@ActiveUser() user: IActiveUserData) {
    return this.assessmentTestService.fetchUsersAssessments(user.sub);
  }

  @Get('user-subjects-eligibility')
  @ApiQuery({
    name: 'subjects',
    required: true,
    type: String,
    description: 'CSV list of subjects, e.g. ANGULAR,NESTJS,RXJS',
  })
  @ApiOkResponse({ type: UserSubjectEligibilityDto, isArray: true })
  fetchUserSubjectsEligibility(
    @ActiveUser() user: IActiveUserData,
    @Query('subjects') subjects: string
  ) {
    const subjectArray = subjects.split(',');
    return this.assessmentTestService.fetchUserSubjectsEligibility(
      user.sub,
      subjectArray as TestSubjectEnum[]
    );
  }

  @Post('start-test')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', enum: Object.values(TestSubjectEnum) },
      },
      required: ['subject'],
    },
  })
  @ApiCreatedResponse({ type: UserAssessmentTestDto })
  startTest(
    @ActiveUser() user: IActiveUserData,
    @Body() reqBody: { subject: string }
  ) {
    return this.assessmentTestService.startTest(reqBody.subject, user.sub);
  }

  @Post('submit-test')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string' },
        answers: { type: 'array', items: { type: 'string' } },
      },
      required: ['testId', 'answers'],
    },
  })
  @ApiOkResponse({ type: UserAssessmentTestDto })
  submitTest(@Body() reqBody: { testId: string; answers: string[] }) {
    return this.assessmentTestService.submitTest(
      reqBody.testId,
      reqBody.answers
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: AssessmentTestDto })
  fetchAssessmentTest(@Param('id') id: string) {
    return this.assessmentTestService.fetchAssessmentTest(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import {
  ActiveUser,
  IActiveUserData,
  Role,
  Roles,
} from '@tmdjr/ngx-auth-client';
import { AssessmentTestService } from './assessment-test.service';
import {
  AssessmentTestDto,
  StartTestDto,
  SubmitTestDto,
  UserAssessmentTestDto,
  UserSubjectEligibilityDto,
  UserSubjectsEligibilityQueryDto,
} from './dto/create.dto';
import {
  CreateAssessmentTestDto,
  UpdateAssessmentTestDto,
  AttemptQuestionsDto,
} from './dto/definition.dto';

@ApiTags('Assessment Tests')
@Controller('assessment-test')
export class AssessmentTestController {
  constructor(private assessmentTestService: AssessmentTestService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: AssessmentTestDto })
  create(@Body() assessmentTest: CreateAssessmentTestDto) {
    return this.assessmentTestService.create(assessmentTest);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOkResponse({ type: AssessmentTestDto, isArray: true })
  fetch() {
    return this.assessmentTestService.fetch();
  }

  @Patch()
  @Roles(Role.Admin)
  @ApiOkResponse({ type: AssessmentTestDto })
  update(@Body() assessmentTest: UpdateAssessmentTestDto) {
    return this.assessmentTestService.update(assessmentTest);
  }

  @Delete()
  @Roles(Role.Admin)
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

  @Get('admin-user-asssessments/:id')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: UserAssessmentTestDto, isArray: true })
  fetchAdminUserAssessments(@Param('id') id: string) {
    return this.assessmentTestService.fetchUsersAssessments(id);
  }

  @Get('user-subjects-eligibility')
  @ApiQuery({
    name: 'subjects',
    required: true,
    type: String,
    isArray: true,
    description: 'CSV list of subjects, e.g. ANGULAR,NESTJS,RXJS',
  })
  @ApiOkResponse({ type: UserSubjectEligibilityDto, isArray: true })
  fetchUserSubjectsEligibility(
    @ActiveUser() user: IActiveUserData,
    @Query() query: UserSubjectsEligibilityQueryDto
  ) {
    return this.assessmentTestService.fetchUserSubjectsEligibility(
      user.sub,
      query.subjects
    );
  }

  @Get('admin-user-subjects-eligibility/:id')
  @Roles(Role.Admin)
  @ApiQuery({
    name: 'subjects',
    required: true,
    type: String,
    isArray: true,
    description: 'CSV list of subjects, e.g. ANGULAR,NESTJS,RXJS',
  })
  @ApiOkResponse({ type: UserSubjectEligibilityDto, isArray: true })
  fetchAdminUserSubjectsEligibility(
    @Param('id') id: string,
    @Query() query: UserSubjectsEligibilityQueryDto
  ) {
    return this.assessmentTestService.fetchUserSubjectsEligibility(
      id,
      query.subjects
    );
  }

  @Post('start-test')
  @ApiBody({ type: StartTestDto })
  @ApiCreatedResponse({ type: UserAssessmentTestDto })
  startTest(@ActiveUser() user: IActiveUserData, @Body() body: StartTestDto) {
    return this.assessmentTestService.startTest(body.subject, user.sub);
  }

  @Post('submit-test')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: SubmitTestDto })
  @ApiOkResponse({ type: UserAssessmentTestDto })
  submitTest(@ActiveUser() user: IActiveUserData, @Body() body: SubmitTestDto) {
    return this.assessmentTestService.submitTest(
      body.testId,
      body.answers,
      user.sub
    );
  }

  @Get('attempts/:id/questions')
  @ApiOkResponse({ type: AttemptQuestionsDto })
  questions(@Param('id') id: string, @ActiveUser() user: IActiveUserData) {
    return this.assessmentTestService.questions(id, user.sub);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteById(@Param('id') id: string) {
    return this.assessmentTestService.delete(id);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: AssessmentTestDto })
  fetchAssessmentTest(@Param('id') id: string) {
    return this.assessmentTestService.fetchAssessmentTest(id);
  }
}

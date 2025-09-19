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
  UseGuards,
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
  RemoteAuthGuard,
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
import { AssessmentTestDocument } from './schemas/assessment-test.schemas';

@ApiTags('Assessment Tests')
@Controller('assessment-test')
export class AssessmentTestController {
  constructor(private assessmentTestService: AssessmentTestService) {}

  @Post()
  @UseGuards(RemoteAuthGuard)
  @ApiCreatedResponse({ type: AssessmentTestDto })
  create(@Body() assessmentTest: AssessmentTestDocument) {
    return this.assessmentTestService.create(assessmentTest);
  }

  @Get()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ isArray: true })
  fetch() {
    return this.assessmentTestService.fetch();
  }

  @Patch()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: AssessmentTestDto })
  update(@Body() assessmentTest: AssessmentTestDocument) {
    return this.assessmentTestService.update(assessmentTest);
  }

  @Delete()
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Body() id: string) {
    return this.assessmentTestService.delete(id);
  }

  @Get('user-asssessments')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UserAssessmentTestDto, isArray: true })
  fetchUsersAssessments(@ActiveUser() user: IActiveUserData) {
    return this.assessmentTestService.fetchUsersAssessments(user.sub);
  }

  @Get('user-subjects-eligibility')
  @UseGuards(RemoteAuthGuard)
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

  @Post('start-test')
  @UseGuards(RemoteAuthGuard)
  @ApiBody({ type: StartTestDto })
  @ApiCreatedResponse({ type: UserAssessmentTestDto })
  startTest(@ActiveUser() user: IActiveUserData, @Body() body: StartTestDto) {
    return this.assessmentTestService.startTest(body.subject, user.sub);
  }

  @Post('submit-test')
  @UseGuards(RemoteAuthGuard)
  @ApiBody({ type: SubmitTestDto })
  @ApiOkResponse({ type: UserAssessmentTestDto })
  submitTest(@Body() body: SubmitTestDto) {
    return this.assessmentTestService.submitTest(body.testId, body.answers);
  }

  @Get(':id')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: AssessmentTestDto })
  fetchAssessmentTest(@Param('id') id: string) {
    return this.assessmentTestService.fetchAssessmentTest(id);
  }
}

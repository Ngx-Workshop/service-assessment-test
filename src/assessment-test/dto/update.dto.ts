import { PartialType } from '@nestjs/swagger';
import { CreateUserAssessmentTestDto } from './create.dto';

export class UpdateExampleMongodbDocDto extends PartialType(
  CreateUserAssessmentTestDto
) {}

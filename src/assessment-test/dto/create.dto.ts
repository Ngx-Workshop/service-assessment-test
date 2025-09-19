import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Mirror of the `TestSubject` union in the Mongoose schema
 * (`ANGULAR` | `NESTJS` | `RXJS`). We declare an enum here to
 * support Swagger `enum` metadata and class-validator `IsEnum`.
 */
export enum TestSubjectEnum {
  ANGULAR = 'ANGULAR',
  NESTJS = 'NESTJS',
  RXJS = 'RXJS',
}

/**
 * READ/Response DTO for a single UserAssessmentTest
 */
export class UserAssessmentTestDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  testName: string;

  @ApiProperty()
  score: number;

  @ApiProperty({ enum: TestSubjectEnum })
  subject: TestSubjectEnum;

  @ApiProperty({ type: [String] })
  userAnswers: string[];

  @ApiProperty()
  passed: boolean;

  @ApiProperty()
  completed: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;

  @ApiProperty()
  __v: number;
}

/**
 * CREATE DTO – fields a client may supply when creating a test record.
 * Defaults are applied by the Mongoose schema, so most fields are optional here.
 */
export class CreateUserAssessmentTestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assessmentTestId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  testName?: string; // defaults to 'DEFAULT' in schema

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  score?: number; // defaults to 0 in schema

  @ApiPropertyOptional({ enum: TestSubjectEnum })
  @IsEnum(TestSubjectEnum)
  @IsOptional()
  subject?: TestSubjectEnum; // defaults to 'ANGULAR' in schema

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userAnswers?: string[]; // defaults to [] in schema

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  passed?: boolean; // defaults to false in schema

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  completed?: boolean; // defaults to false in schema

  // Expose in case clients want to explicitly set it; otherwise schema default (Date.now) applies
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  lastUpdated?: string;
}

/**
 * UPDATE DTO – Partial of Create DTO
 */
export class UpdateUserAssessmentTestDto extends PartialType(
  CreateUserAssessmentTestDto
) {}

// Eligibility DTO
// {
//   subject,
//   levelCount: completedCount,
//   totalCount,
//   enabled: completedCount < totalCount,
// }
export class UserSubjectEligibilityDto {
  @ApiProperty({ enum: TestSubjectEnum })
  subject: TestSubjectEnum;

  @ApiProperty()
  levelCount: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  enabled: boolean;
}

// Nested DTOs for AssessmentTest
export class TestChoiceDto {
  @ApiProperty()
  value: string;
}

export class TestQuestionDto {
  @ApiProperty()
  question: string;

  @ApiProperty({ type: [TestChoiceDto] })
  choices: TestChoiceDto[];

  @ApiProperty()
  answer: string;

  @ApiProperty()
  correctResponse: string;

  @ApiProperty()
  incorrectResponse: string;
}

// READ/Response DTO for an AssessmentTest
export class AssessmentTestDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: TestSubjectEnum })
  subject: TestSubjectEnum;

  @ApiProperty()
  level: number;

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;

  @ApiProperty({ type: [TestQuestionDto] })
  testQuestions: TestQuestionDto[];

  @ApiProperty()
  __v: number;
}

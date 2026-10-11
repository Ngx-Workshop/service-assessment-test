import { SectionId } from './subject.dto';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * READ/Response DTO for a single UserAssessmentTest
 */
export class UserAssessmentTestDto {
  @ApiProperty()
  assessmentTestId: string;

  @ApiPropertyOptional({
    description: 'Canonical owner; legacy records may only have uuid',
  })
  userId?: string;

  @ApiProperty()
  _id: string;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  testName: string;

  @ApiProperty()
  score: number;

  @ApiProperty({
    description: 'Document section ID or preserved legacy subject key',
  })
  subject: string;

  @ApiProperty({
    description: 'Section display title; falls back to legacy subject',
  })
  sectionTitle: string;

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

  @ApiPropertyOptional()
  @SectionId()
  @IsOptional()
  subject?: string;

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
  @ApiProperty({
    description: 'Document section ID or preserved legacy subject key',
  })
  subject: string;

  @ApiProperty({
    description: 'Section display title; falls back to legacy subject',
  })
  sectionTitle: string;

  @ApiProperty({ description: 'Number of consecutive levels with at least one completed test' })
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

  @ApiProperty({
    description: 'Document section ID or preserved legacy subject key',
  })
  subject: string;

  @ApiProperty({
    description: 'Section display title; falls back to legacy subject',
  })
  sectionTitle: string;

  @ApiProperty()
  level: number;

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;

  @ApiProperty({ type: [TestQuestionDto] })
  testQuestions: TestQuestionDto[];

  @ApiProperty()
  __v: number;
}

export class SubmitTestDto {
  @ApiProperty()
  @IsMongoId()
  testId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  answers: string[];
}

export class StartTestDto {
  @ApiProperty({
    description: 'Document section ID or preserved legacy subject key',
  })
  @SectionId()
  subject: string;

  @ApiPropertyOptional({
    description: 'Selected definition ID; required when multiple tests are available',
  })
  @IsOptional()
  @IsMongoId()
  assessmentTestId?: string;
}

export class UserSubjectsEligibilityQueryDto {
  @ApiProperty({
    description: 'CSV list of document section IDs or legacy subject keys',
    isArray: true,
    example: 'angular,rust',
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(120, { each: true })
  subjects: string[];
}

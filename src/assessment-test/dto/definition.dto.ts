import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestSubjectEnum } from './create.dto';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class ChoiceInputDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  value: string;
}
export class QuestionInputDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;
  @ApiProperty({ type: [ChoiceInputDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ChoiceInputDto)
  choices: ChoiceInputDto[];
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  answer: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  correctResponse: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  incorrectResponse: string;
}
export class CreateAssessmentTestDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;
  @ApiProperty({ enum: TestSubjectEnum })
  @IsEnum(TestSubjectEnum)
  subject: TestSubjectEnum;
  @ApiProperty({ minimum: 1, type: 'integer' })
  @IsInt()
  @Min(1)
  level: number;
  @ApiProperty({ type: [QuestionInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  testQuestions: QuestionInputDto[];
}
export class UpdateAssessmentTestDto extends CreateAssessmentTestDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;
  @ApiProperty({
    description:
      'Version returned by the definition read; prevents lost updates.',
  })
  @IsInt()
  @Min(0)
  __v: number;
}
export class LearnerQuestionDto {
  @ApiProperty() question: string;
  @ApiProperty({ type: [ChoiceInputDto] }) choices: ChoiceInputDto[];
}
export class AttemptQuestionsDto {
  @ApiProperty() testId: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: [LearnerQuestionDto] })
  testQuestions: LearnerQuestionDto[];
}

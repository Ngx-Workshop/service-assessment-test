import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { UserAssessmentTestDto } from './create.dto';

export class DraftAnswersDto {
  @ApiProperty({
    type: [String],
    description: 'One slot per question; empty string means unanswered',
  })
  @IsArray()
  @IsString({ each: true })
  answers: string[];
}
export class LearnerTestDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() level: number;
  @ApiProperty() questionCount: number;
  @ApiProperty({ enum: ['available', 'in-progress', 'completed', 'locked'] })
  status: 'available' | 'in-progress' | 'completed' | 'locked';
  @ApiProperty({ nullable: true, type: String }) attemptId: string | null;
}
export class LearnerSubjectDto {
  @ApiProperty() subject: string;
  @ApiProperty() sectionTitle: string;
  @ApiProperty({ type: [LearnerTestDto] }) tests: LearnerTestDto[];
  @ApiProperty() completedCount: number;
  @ApiProperty() passedCount: number;
  @ApiProperty() highestPassedLevel: number;
  @ApiProperty({ nullable: true, type: Number }) accuracy: number | null;
}
export class LearnerAttemptDto extends UserAssessmentTestDto {
  @ApiProperty() level: number;
  @ApiProperty() questionCount: number;
  @ApiProperty({ type: [String] }) draftAnswers: string[];
}
export class ResultQuestionDto {
  @ApiProperty() question: string;
  @ApiProperty() selectedAnswer: string;
  @ApiProperty() correctAnswer: string;
  @ApiProperty() correct: boolean;
  @ApiProperty() feedback: string;
}
export class LearnerResultDto {
  @ApiProperty({ type: LearnerAttemptDto }) attempt: LearnerAttemptDto;
  @ApiProperty({ type: [ResultQuestionDto] }) questions: ResultQuestionDto[];
}

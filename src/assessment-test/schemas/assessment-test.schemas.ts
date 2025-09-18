import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TAssessmentTest = AssessmentTest & Document;

type TestSubject = 'ANGULAR' | 'NESTJS' | 'RXJS';
export interface TestQuestion {
  question: string;
  choices: { value: string }[];
  answer: string;
  correctResponse: string;
  incorrectResponse: string;
}

@Schema()
export class AssessmentTest {

  @Prop({ default: () => 'Test Name' })
  name: string;

  @Prop({ default: () => 'ANGULAR' })
  subject: TestSubject;

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: () => Date.now() })
  lastUpdated: Date;

  @Prop({ default: () => [] })
  testQuestions: TestQuestion[];
}

export const AssessmentTestSchema = SchemaFactory.createForClass(AssessmentTest);

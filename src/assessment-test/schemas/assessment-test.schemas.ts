import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AssessmentTestDocument = HydratedDocument<AssessmentTest>;

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

  @Prop({ required: true, trim: true, maxlength: 120 })
  subject: string;

  @Prop({ default: '', trim: true, maxlength: 120 })
  sectionTitle: string;

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: () => Date.now() })
  lastUpdated: Date;

  @Prop({ default: () => [] })
  testQuestions: TestQuestion[];
}

export const AssessmentTestSchema =
  SchemaFactory.createForClass(AssessmentTest);

AssessmentTestSchema.set('toJSON', {
  transform: (
    _document,
    result: { sectionTitle?: string; subject: string }
  ) => {
    result.sectionTitle = result.sectionTitle || result.subject;
    return result;
  },
});

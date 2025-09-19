import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserAssessmentTestDocument = HydratedDocument<UserAssessmentTest>;

type TestSubject = 'ANGULAR' | 'NESTJS' | 'RXJS';

@Schema()
export class UserAssessmentTest {
  @Prop({ required: true })
  assessmentTestId: string;

  @Prop({ required: true })
  uuid: string;

  @Prop({ default: () => 'DEFAULT' })
  testName: string;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: () => 'ANGULAR' })
  subject: TestSubject;

  @Prop({ default: () => [] })
  userAnswers: string[];

  @Prop({ default: false })
  passed: boolean;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: () => Date.now() })
  lastUpdated: Date;
}

export const UserAssessmentTestSchema =
  SchemaFactory.createForClass(UserAssessmentTest);

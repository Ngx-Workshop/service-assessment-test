import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserAssessmentTestDocument = HydratedDocument<UserAssessmentTest>;

@Schema()
export class UserAssessmentTest {
  @Prop({ index: true })
  userId: string;

  @Prop({ required: true })
  assessmentTestId: string;

  @Prop({ required: true })
  uuid: string;

  @Prop({ default: () => 'DEFAULT' })
  testName: string;

  @Prop({ default: 0 })
  score: number;

  @Prop({ required: true, trim: true, maxlength: 120 })
  subject: string;

  @Prop({ default: '', trim: true, maxlength: 120 })
  sectionTitle: string;

  @Prop({ default: () => [] })
  userAnswers: string[];

  @Prop({ type: [String], default: () => [] })
  draftAnswers: string[];

  @Prop({ default: false })
  passed: boolean;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: () => Date.now() })
  lastUpdated: Date;
}

export const UserAssessmentTestSchema =
  SchemaFactory.createForClass(UserAssessmentTest);

UserAssessmentTestSchema.set('toJSON', {
  transform: (
    _document,
    result: { sectionTitle?: string; subject: string }
  ) => {
    result.sectionTitle = result.sectionTitle || result.subject;
    return result;
  },
});

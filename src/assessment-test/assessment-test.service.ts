import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  catchError,
  forkJoin,
  from,
  map,
  Observable,
  switchMap,
  throwError,
} from 'rxjs';
import { TestSubjectEnum, UserSubjectEligibilityDto } from './dto/create.dto';
import {
  AssessmentTest,
  AssessmentTestDocument,
} from './schemas/assessment-test.schemas';
import {
  UserAssessmentTest,
  UserAssessmentTestDocument,
} from './schemas/user-assessment-test.schemas';

@Injectable()
export class AssessmentTestService {
  constructor(
    @InjectModel(UserAssessmentTest.name)
    private userAssessmentTestModel: Model<UserAssessmentTestDocument>,
    @InjectModel(AssessmentTest.name)
    private assessmentTestModel: Model<AssessmentTestDocument>
  ) {}

  async create(assessmentTest: AssessmentTestDocument) {
    return await this.assessmentTestModel.create(assessmentTest);
  }

  async fetch() {
    return await this.assessmentTestModel.find().exec();
  }

  async fetchAssessmentTest(id: string) {
    return await this.assessmentTestModel
      .findById(new Types.ObjectId(id))
      .exec();
  }

  async update(assessmentTest: AssessmentTestDocument) {
    return await this.assessmentTestModel.findByIdAndUpdate(
      { _id: assessmentTest._id },
      assessmentTest,
      { returnDocument: 'after' }
    );
  }

  async delete(_id: string) {
    return await this.assessmentTestModel.deleteOne({ _id });
  }

  async fetchUsersAssessments(userId: string) {
    return await this.userAssessmentTestModel.find({ userId }).exec();
  }

  fetchUserSubjectsEligibility(
    userId: string,
    subjects: TestSubjectEnum[]
  ): Observable<UserSubjectEligibilityDto[]> {
    return forkJoin({
      userTests: from(
        this.userAssessmentTestModel.find({
          userId,
          subject: { $in: subjects },
        })
      ),
      assessmentTests: from(
        this.assessmentTestModel.find({ subject: { $in: subjects } })
      ),
    }).pipe(
      map(({ userTests, assessmentTests }) => {
        const userTestsArray = Array.isArray(userTests)
          ? userTests
          : [userTests];
        const assessmentTestsArray = Array.isArray(assessmentTests)
          ? assessmentTests
          : [assessmentTests];
        return subjects.map((subject) => {
          const completedCount = userTestsArray.filter(
            (test) => test.subject === subject && test.completed
          ).length;
          const totalCount = assessmentTestsArray.filter(
            (test) => test.subject === subject
          ).length;
          return {
            subject,
            levelCount: completedCount,
            totalCount,
            enabled: completedCount < totalCount,
          };
        });
        // .filter(({ levelCount, totalCount }) => levelCount < totalCount)
        // .map(({ subject, levelCount }) => ({ subject, levelCount }));
      }),
      catchError((err) =>
        throwError(
          () => new Error(`Failed to fetch subjects level: ${err.message}`)
        )
      )
    );
  }

  startTest(
    subject: string,
    userId: string
  ): Observable<UserAssessmentTestDocument> {
    return from(this.userAssessmentTestModel.find({ userId, subject })).pipe(
      map((userAssessmentsTests) => {
        const testsArray = Array.isArray(userAssessmentsTests)
          ? userAssessmentsTests
          : [userAssessmentsTests];
        const incompleteTest = testsArray.find((test) => !test.completed);
        return incompleteTest ? incompleteTest : testsArray;
      }),

      switchMap((result) => {
        if (!Array.isArray(result)) {
          return from(Promise.resolve(result as UserAssessmentTestDocument));
        }

        const nextTestLevel = result.length + 1;

        return from(
          this.assessmentTestModel.findOne({ subject, level: nextTestLevel })
        ).pipe(
          switchMap((nexAssessmentTestDocument) => {
            if (!nexAssessmentTestDocument) {
              return throwError(
                () => new Error(`User has maxed out tests for ${subject}`)
              );
            }

            return from(
              this.userAssessmentTestModel.create({
                assessmentTestId: nexAssessmentTestDocument._id,
                testName: nexAssessmentTestDocument.name,
                userId,
                subject,
              })
            );
          })
        );
      }),
      catchError((err) =>
        throwError(() => new Error(`Failed to start test: ${err.message}`))
      )
    );
  }

  submitTest(
    userAssessmentTestId: string,
    answers: string[]
  ): Observable<UserAssessmentTestDocument> {
    return from(
      this.userAssessmentTestModel
        .findById(userAssessmentTestId)
        .orFail(() => new Error('User assessment test not found'))
        .exec()
    ).pipe(
      switchMap((userAssessmentTest) => {
        if (!userAssessmentTest) {
          return throwError(() => new Error('User assessment test not found'));
        }
        return from(Promise.resolve(userAssessmentTest));
      }),
      switchMap((userAssessmentTest) => {
        if (!userAssessmentTest)
          return throwError(() => new Error('User assessment test not found'));
        if (userAssessmentTest.completed)
          return throwError(
            () => new Error('User assessment test already completed')
          );

        return from(
          this.assessmentTestModel
            .findById(userAssessmentTest.assessmentTestId)
            .orFail(() => new Error('Assessment test not found'))
            .exec()
        ).pipe(
          switchMap((assessmentTest) => {
            if (!assessmentTest)
              return throwError(() => new Error('Assessment test not found'));

            if (answers.length !== assessmentTest.testQuestions.length)
              return throwError(() => new Error('Invalid number of answers'));

            const score = answers.reduce((acc, answer, index) => {
              return answer === assessmentTest.testQuestions[index].answer
                ? acc + 1
                : acc;
            }, 0);

            const update = {
              completed: true,
              score,
              passed: score === assessmentTest.testQuestions.length,
              userAnswers: answers,
              lastUpdated: new Date(),
            };

            return from(
              this.userAssessmentTestModel
                .findByIdAndUpdate(userAssessmentTestId, update, { new: true })
                .orFail(
                  () => new Error('Failed to update user assessment test')
                )
                .exec()
            );
          })
        );
      }),
      catchError((err) =>
        throwError(() => new Error(`Failed to finish test: ${err.message}`))
      )
    );
  }
}

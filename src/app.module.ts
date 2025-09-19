import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentTestModule } from './assessment-test/assessment-test.module';

const DB_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => ({
            uri: config.get<string>('MONGODB_URI'),
            serverSelectionTimeoutMS: 5000, // Timeout in 5 seconds
          }),
        }),
      ];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ...DB_IMPORTS,
    AssessmentTestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

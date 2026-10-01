# Architecture — assessment test service

Source baseline: `22aaac7`, reviewed 2026-09-30. Statements below describe source,
not verified production behavior. No schema migration is included in this review.

## Domain and source map

Owns assessment definitions (questions, choices, answer keys, feedback), learner
attempts, subject eligibility and scoring. Auth accounts, profile metadata, host
navigation, frontend composition and coding-lab execution are external domains.

| Concern | Source | Current behavior |
| --- | --- | --- |
| Runtime | `src/main.ts` | Cookies; global validation with whitelist, forbid-extra, transform and implicit conversion; port 3005 on `0.0.0.0`; no global `/api` prefix or CORS setup |
| App/database | `src/app.module.ts` | Global ConfigModule, `MONGODB_URI`, 5-second selection timeout; generation mode skips DB wiring |
| Feature wiring | `src/assessment-test/assessment-test.module.ts` | Two Mongoose models, auth client, global AuthenticationGuard/RolesGuard, conditional generation stubs |
| Routes | `src/assessment-test/assessment-test.controller.ts` | Definition CRUD, attempts, eligibility, start and submit |
| Domain operations | `src/assessment-test/assessment-test.service.ts` | Queries, start/resume, exact-answer scoring |
| Unwired helper | `src/assessment-test/user-assessment-test.service.ts` | Separate attempt CRUD helper; not registered in the feature module |
| DTOs | `src/assessment-test/dto/create.dto.ts`, `update.dto.ts` | Start/submit/query validation and response docs; legacy-named unused update DTO |
| Persistence | `src/assessment-test/schemas/assessment-test.schemas.ts`, `user-assessment-test.schemas.ts` | Definition and attempt schemas |
| OpenAPI | `src/swagger.ts`, `openapi.json` | Generator and checked-in snapshot; snapshot currently omits admin routes |
| Contracts | `contracts/service-nestjs-assessment-test` | Generates TypeScript paths/models from OpenAPI |

HTTP → global/route guards → validation where concrete DTO metadata exists →
controller → AssessmentTestService → Mongoose. The installed auth-client package
owns guard implementation; registering guard classes is not proof of all access rules.

## Stored data and algorithms

Definitions contain name (default `Test Name`), subject (default `ANGULAR`), level
(default 1), lastUpdated and testQuestions. Each question has a question string,
choices of `{ value }`, answer, correctResponse and incorrectResponse. Subject types
mention ANGULAR/NESTJS/RXJS, but schemas do not declare matching enum constraints,
a unique subject+level index, or nested question validation.

Attempts require `assessmentTestId` and `uuid`. Defaults include testName `DEFAULT`,
score 0, subject ANGULAR, userAnswers [], passed false, completed false, lastUpdated.
**Service operations query/write `userId`, which is absent from that schema, and
start does not supply required `uuid`.** This is an unresolved identity mismatch,
not a documented alternative field convention. Default Mongoose behavior is likely
to reject new attempts for missing `uuid`; verify with isolated persistence tests.

Eligibility counts completed attempts as `levelCount` and definitions as `totalCount`
per requested subject; enabled is `completedCount < totalCount`. Passing is not used.
Start reuses the first incomplete matching attempt, otherwise looks for definition
level `all existing attempt count + 1`. There is no explicit ordering, level-gap
handling, attempt uniqueness or atomic concurrency control.

Submit loads an attempt by supplied testId, rejects completed attempts, loads its
current definition, requires equal answer/question counts, and compares strings at
the same indices. Score is the number of exact matches; passed requires all correct.
It updates completion, score, passed, answers and lastUpdated. There is no definition
snapshot, attempt-owner argument or atomic completed-state condition on the update.

## Native route contract

Every route passes through the registered global guards. “Remote” below means an
additional `@UseGuards(RemoteAuthGuard)` declaration. Only one route explicitly
requires `Role.Admin`; names alone do not impose roles. Spellings are intentional
records of the current compatibility surface, including `asssessments`.

| Method | Native path | Additional access declaration | Behavior / caveat |
| --- | --- | --- | --- |
| POST | `/assessment-test` | Remote | Create full definition; body typed as Mongoose document, not validated create DTO |
| GET | `/assessment-test` | Remote | All full definitions, including answer keys; response array lacks item type in Swagger |
| PATCH | `/assessment-test` | Remote | Update using body's `_id`; no `runValidators` option |
| DELETE | `/assessment-test` | Remote | Raw string body ID; 204; no dedicated ID DTO or not-found handling |
| GET | `/assessment-test/user-asssessments` | Remote | Attempts filtered by active user's `sub` as `userId` |
| GET | `/assessment-test/admin-user-asssessments/:id` | `@Roles(Role.Admin)` | Attempts for supplied user ID; relies on global guards |
| GET | `/assessment-test/user-subjects-eligibility` | Remote | Active user; validated subjects CSV/array query |
| GET | `/assessment-test/admin-user-subjects-eligibility/:id` | Remote | Supplied user ID; no explicit Admin role decorator |
| POST | `/assessment-test/start-test` | Remote | StartTestDto.subject; active user's sub; create/reuse attempt, default 201 |
| POST | `/assessment-test/submit-test` | Remote | SubmitTestDto.testId/answers; does not pass active user; Swagger says 200 but no HttpCode overrides Nest POST default 201 |
| GET | `/assessment-test/:id` | Remote | Full definition by ObjectId, answer keys included; no learner-redacted response |

Definition create/update use a TypeScript Mongoose document alias, so global DTO
validation is not equivalent to class-decorated input validation. Raw malformed IDs
and null results lack deliberate API error mapping. Start/submit errors are wrapped
as generic Error, rather than explicit 4xx domain exceptions.

## External boundaries and release

- `mfe-user-journey-assessment-test`: intended learner consumer; current frontend
  still calls seed example CRUD and does not depend on this contract package.
- `mfe-user-journey-admin-assessment-test`: separate definition-authoring owner.
- Dashboard/admin-user-management journeys: potential eligibility/history consumers;
  confirm their installed versions and exact behavior before changing routes.
- `service-auth`: auth client `@tmdjr/ngx-auth-client` 0.0.21 and `AUTH_BASE_URL`.
  Package is currently listed under devDependencies, despite runtime imports.
- BFF/Nginx: browser prefix/forwarding; native routes above do not prove a deployed
  browser mapping. Mongo infrastructure supplies runtime database access.

Service package name: `service-nestjs-assessment-test`. Contracts package:
`@tmdjr/service-nestjs-assessment-test-contracts`, local manifest `0.0.1`. Generated
files are not currently tracked beyond the hand-authored entry point. That entry
point suppresses missing-export errors with `@ts-ignore`; inspect actual generated
exports, not just successful TypeScript compilation.

CI uses Node 22, publishes contracts with OIDC and a run-number patch version,
then deploys the container to `/opt/ngx-nestjs-services/service-nestjs-assessment-test`
on `ngx-net`, port 3005. It enforces deployment-specific database constraints and
performs a TCP startup check, not assessment behavior tests. See the workflow for
secret names; do not copy production credentials into docs or local test setup.

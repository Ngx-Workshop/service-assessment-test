# Assessment readiness review and documentation handoff

Review baseline: `22aaac7`. Scope: read the service codebase and migrate the seed's
Markdown workflow. Findings are source observations, not live exploit tests or
verified production failures. Runtime changes require their own specification.

## Priority findings for the next implementation

| Finding | Source evidence | Decision / acceptance needed |
| --- | --- | --- |
| Attempt identity mismatch | Schema requires uuid; service queries/writes userId and start omits uuid | Choose canonical authenticated identity, inspect existing data safely, define migration, prove create/resume/history isolation |
| Submission is not owner-scoped | Controller sends only testId/answers; service reads/updates by ID | Require authenticated user ownership and test cross-user denial |
| Answer keys in reads | Definition list/detail return full Mongoose documents | Separate learner question payload from admin answer/feedback payload and define disclosure timing |
| Uneven role declarations | CRUD and admin-user-subjects-eligibility lack explicit Admin role; only admin-user-asssessments declares it | Define route access matrix and test auth package/global plus route guard behavior |
| Progression differs from passing | Eligibility counts completed; start selects all-attempt count + 1; passed requires every answer correct | Agree passing, failed retry, level gaps and resume rules before UI implementation |
| Start/submit races and mutable definitions | No attempt uniqueness; read-then-write completion; scoring reloads current definition | Specify atomic/idempotent behavior and definition snapshot/version policy |
| Input and error gaps | Mongoose document body types; weak nested schemas; raw IDs; generic Error wrappers | Concrete input DTOs, schema invariants and stable 4xx outcomes |
| Contract drift | Missing admin routes in OpenAPI; submit status mismatch; attempt response omits assessmentTestId | Align controller/runtime/OpenAPI, generate and inspect exports, verify consumers |
| No domain test baseline | No unit specs; stale root Hello World e2e | Isolated behavior tests and disposable-database HTTP scenarios |

The unused `UserAssessmentTestService` and legacy-named `UpdateExampleMongodbDocDto`
do not supply missing runtime functionality; neither is wired into the controller's
operations. The current attempt is not a complete, verified learner assessment system.

## External handoff

The intended learner consumer is `mfe-user-journey-assessment-test`, which currently
still renders seed CRUD. Authoring belongs to `mfe-user-journey-admin-assessment-test`.
Before a new release, identify actual dashboard/admin-user-management consumers and
verify package versions, route spellings and response expectations. Do not silently
correct `user-asssessments` / `admin-user-asssessments` without a compatibility plan.

The next feature should settle identity/access/progression/response contracts first,
then implement and verify producer changes before wiring the learner client. The
existing source does not determine the desired product behavior for every question.

## Delivered files and evidence

Added local agent entry point, constitution, workflow and four templates, architecture,
development, seed-adoption status, this review and feature index; expanded README.
Generic workflow/templates match the corresponding seed. Repository facts are adapted
from the actual code rather than the Coding Labs implementation.

Verification: 29 local documentation links resolve (template links target future feature files), seed workflow/template parity passes,
`git diff --check` passes, and all changes are Markdown. No runtime build/test run,
Mongo mutation, contract publication, commit/push or deployment was performed.

Documentation migration is complete. No assessment implementation feature is marked
complete or implicitly authorized by this review. Next: create the first agreed
feature's spec/plan/tasks/handoff using the local templates and readiness findings.

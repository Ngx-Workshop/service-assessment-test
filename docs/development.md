# Development and verification

Use Node 22 and `npm ci`, matching CI. MongoDB is required for persistence integration.

| Purpose                                   | Command                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| Compile + generate OpenAPI without DB     | `npm run build`                                          |
| Unit tests                                | `npm test -- --runInBand`                                |
| Non-mutating lint regression gate         | `npm run lint:check`                                     |
| Strict lint (includes inherited failures) | `npm run lint:strict`                                    |
| Non-mutating formatting gate              | `npm run format:check`                                   |
| Disposable hook/install verification      | `node scripts/verify-maintenance.mjs`                    |
| Disposable Mongo HTTP tests               | `npm run test:e2e -- --runInBand`                        |
| Generate contracts                        | `npm run contracts:service-nestjs-assessment-test:gen`   |
| Build contracts                           | `npm run contracts:service-nestjs-assessment-test:build` |
| Isolated local service                    | `npm run start:local`                                    |
| Normal configured watch                   | `npm run start:dev`                                      |

`start:local` explicitly selects `mongodb://127.0.0.1:27017/assessment_test_local`,
port 3005 and development mode, overriding any .env database. It binds only to loopback.
The local guard accepts loopback requests and browser origins admin.ngx-workshop.io or
localhost:4201, using synthetic identity `local-assessment-admin`. Any other database
is rejected in local mode. Production mode always uses the auth service even if the
local flag is present. Do not expose this mode through a tunnel or reverse proxy.

The HTTP suite creates `assessment_test_regression_<pid>` on local Mongo, then drops
that database. It uses real schemas/controllers/guards and a fake identity provider;
it does not test live platform token validation. The three guard tests cover local
DB/origin/address restrictions and production behavior. Six HTTP scenarios cover CRUD,
validation, admin roles, owner checks, legacy identity, scoring, protected definitions,
version conflicts, concurrent starts/submissions and expired leases.

Verified locally: 3 unit tests, 6 HTTP scenarios, service build, OpenAPI and generated
contract compilation. No external infrastructure credentials or production records
are needed. Contract generation artifacts are ignored; the generated public index and
OpenAPI snapshot are tracked. `gen` regenerates the index and appends path type exports.

Production deployment and a real auth/gateway smoke test are separate release work.
See the [handoff](../specs/001-reliable-authoring/handoff.md) for compatibility details.

## Learner journey verification

The suite now has seven HTTP scenarios, including safe catalogs, exact eligibility, draft validation and persistence, cross-user denial, completed-only feedback, cleared drafts and weighted proficiency. All seven HTTP scenarios plus the three auth guard tests pass. Service/OpenAPI and contract builds pass.

`npm run preview:learner` optionally serves the companion learner verification bundle from `../mfe-user-journey-assessment-test/dist/learner-verification` on localhost:4203. It seeds only synthetic records in a unique local `assessment_test_preview_<pid>` database and drops it on termination. It uses the real assessment module with a regular synthetic identity, not real platform auth. Bind is loopback only; this harness is never used by AppModule or production startup. Normal local development's guard/origin restrictions are unchanged.

## Document section subject verification — 2026-10-09

- PASS: 3 auth guard unit tests and 10 HTTP scenarios with real isolated MongoDB,
  controllers/validation/roles and synthetic identity. The test database is dropped.
  Covers Rust ID/title CRUD, title rename/legacy omitted title, duplicate ID-level,
  identical titles with different IDs, arbitrary eligibility/start, invalid fields,
  preserved legacy records and existing ownership/scoring/concurrency regressions.
- PASS: service build/OpenAPI, contract generation/build, exact no-enum string
  schema assertions and focused DTO/schema lint.

See [subject handoff](../specs/003-document-section-subjects/handoff.md).

## Existing-data migration — 2026-10-09

At the user's explicit request, migrated the live workshop-viewer database through
its authenticated mongosh session: 9 assessment definitions and 15 user attempts.
ANGULAR → angular / Angular; NESTJS → nestjs / Nest JS; RXJS → rxjs / RxJS.
Those are the actual section \_ids/titles. Definition/attempt IDs, assessmentTestId,
owner identity, questions/answers, scoring/completion flags and timestamps remained
unchanged. Subject/title updates incremented \_\_v. Backed up all 24 originals plus
manifest in assessment_section_subject_backup_20261009 on the same server, and
committed both collections in one majority-acknowledged snapshot transaction under
the service write lease. Independent post-commit queries found no broken/mismatched
references, no active lease, and zero remaining dry-run changes. Script syntax
check passes. Initial top-level-await shell syntax errors made no database changes;
loading the function and invoking it without top-level await succeeded.

See [migration and recovery record](../scripts/migrations/README.md).
No package release, deployment, rollback or live application journey check was run
as part of the migration. Existing data acceptance is complete; hosted rollout
acceptance remains separately tracked.

## Multiple tests per level — 2026-10-11

11 real disposable-Mongo HTTP scenarios, 3 auth guard tests, service/OpenAPI build and contract generation/build passed. See [handoff](../specs/004-multiple-tests-per-level/handoff.md). No production deployment or data writes.

## Deployment storage policy

See [deployment cleanup](deployment-cleanup.md) for success-only image/container retention and local verification.

## Service observability

See [logging and heartbeat](observability.md) for operational endpoint semantics, JSON logging, collector ownership and actual validation.

## Maintenance quality workflow

`npm ci` enables Husky in a Git developer checkout. The manifest's self-contained
prepare lifecycle skips hook setup for CI, `HUSKY=0`, production/omitted dev
dependencies and package-only/no-Git Docker installs; it does not skip dependency
install scripts. There is no network fallback in the pre-commit hook. Husky runs
project-local lint-staged/Prettier for staged TS/JS/JSON/Markdown/YAML files, retaining
unstaged hunks. Generated contracts, OpenAPI, lockfiles and build/coverage output
are excluded by `.prettierignore`. Prettier's existing style is unchanged.

`format:check` covers source/tests and maintenance tooling/configuration, including
both CI workflows. `.quality-baseline.json` exempts only exact unchanged hashes for
the two inherited drifting files (`dto/create.dto.ts`, `test/app.e2e-spec.ts`).
Changing either file requires formatting it; the pre-commit formatter has no hash
exemptions. No blanket source rewrite was performed.

`lint:check` runs the existing type-aware ESLint rules without fixes and fails on
new per-file/rule error counts above the recorded baseline. Inherited diagnostics
remain printed; this is not strict lint cleanliness. `lint:strict` still fails on
226 inherited errors (25 warnings), primarily unsafe legacy test types and
generation/bootstrap issues. Counts were reduced for repaired touched code, never
raised to accept new failures. Remove/reduce baseline entries as debt is repaired;
do not regenerate the baseline to conceal new errors. The ratchet cannot detect
a replacement error with the same file/rule count; strict lint remains the goal.

PR/main validation and the existing publishing job run these non-mutating gates,
unit tests and build before publishing. The disposable verification script tests
actual staged formatting, partial staging, generated-file exclusion, hook failure,
negative CI gates and clean local/CI/package-only/production installs. It makes
commits only inside temporary fixture repositories and removes those fixtures.

See [maintenance evidence](../specs/007-code-maintenance/audit.md) for current
commands, runtime versions, real Mongo regressions and infrastructure limitations.

# Maintenance audit and evidence

Baseline: `5a3360c`, 2026-11-22. Existing dirty work: AGENTS.md,
specs/README.md, .github/copilot-instructions.md, .github/prompts/ and this
feature folder. These are preserved and integrated, not reverted.
The workspace-level entry-point links do not exist; all guidance resolves locally.

## T001 baseline

- Node v24.9.0 / npm 11.6.0 locally; supported CI/image runtime remains Node 22.
- `npm test -- --runInBand`: 3 suites, 9 tests passed.
- `npm run test:e2e -- --runInBand`: 11 real disposable-Mongo HTTP scenarios passed.
  The suite drops only its PID-named local regression database.
- `npm run build`: compilation and DB-free OpenAPI generation passed.
- `npx --no-install eslint "{src,apps,libs,test}/**/*.ts"`: failed on inherited
  unsafe types, require-await and formatting: 260 errors / 25 warnings
  (machine-readable baseline captured).
- `npx --no-install prettier --check "src/**/*.ts" "test/**/*.ts"`:
  drift in assessment-test.service.ts, dto/create.dto.ts and test/app.e2e-spec.ts.
- Docker CLI exists but daemon information is unavailable. Image validation is
  pending; package-only/no-Git installation will be tested independently.
- Live auth/gateway/Grafana and production writes are outside local verification.

## T002 source map and decisions

| Boundary                  | Current dependencies / responsibility                                                                  | Decision                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| AppModule                 | Global ConfigModule, Mongoose root, AssessmentTestModule, ObservabilityModule                          | Retain composition and generation-mode DB exclusion                                          |
| AssessmentTestModule      | Auth client, two Mongoose models; controller, assessment service, global auth/roles guards; no exports | Keep domain ownership and narrow API; add internal lease provider only                       |
| AssessmentTestController  | DTOs, Swagger, roles, ActiveUser, delegation                                                           | Already thin; no route split or metadata change                                              |
| AssessmentTestService     | Both models; CRUD, eligibility, owner-scoped learner operations, scoring, write lease                  | Extract concrete cross-instance persistence coordination, not a speculative repository layer |
| AssessmentAuthGuard       | AuthClientService upstream token validation; explicit local policy; exact heartbeat exemption          | Preserve access policy and upstream protocol                                                 |
| ObservabilityModule       | Terminus/HealthController; no exports                                                                  | Retain anonymous heartbeat and JSON collector pipeline                                       |
| UserAssessmentTestService | Unwired legacy model CRUD                                                                              | Leave unwired; do not introduce unscoped attempt operations                                  |

P1, `src/assessment-test/assessment-test.service.ts` (former private `write`):
the assessment service embeds Mongo lease acquisition/release
inside domain operations. Move this invariant unchanged into an explicitly injected
internal provider. Retain unique `_id`, owner-qualified release, 120-second expiry,
5-second query limits, duplicate-key retryable 409, finally-release behavior and
atomic submission filters. No schema, API, identity or authorization changes.

P1, `src/observability/observability.ts`: access logs have request IDs but domain work has no async context
or safe outcome logs. Establish an AsyncLocalStorage context in existing middleware.
Keep generated request IDs (ignore inbound IDs rather than trust caller text).
Log one bounded event per write boundary, with static operation, outcome, duration,
safe generated run ID and optional request ID; no input, identity, scores, raw
errors or stack. Expected HTTP failures warn; unexpected persistence failures error.
Do not duplicate access logs or log reads/draft content. No upstream tracing claim.
Assessment use cases have no network upstream adapter; storage failures are logged
at their write boundary. Platform authentication remains owned by the installed
auth client/guard, with existing HTTP failure logging and unchanged protocol.

P2, `package.json`, `Dockerfile`, `.github/workflows/deploy.yml`: add staged-file
hooks and non-mutating gates while retaining package-only install ordering and
the existing publishing/deployment sequence.

Validation remains in DTOs and service choice checks. Owner queries retain canonical
userId and uuid fallback only when userId is absent. Definition protection, consecutive
level progression, answer-free questions and completed-only feedback stay unchanged.
Lease cleanup can replace an operation error if cleanup also fails; preserve this
existing behavior and characterize it, not invent new concurrency semantics.

Formatting strategy: format only touched source. Grandfather the exact hashes of
the two untouched drifting files in a checked-in quality baseline; changed content
must pass Prettier. ESLint uses per-file/per-rule inherited error counts as a ratchet,
with a strict command also available. New files/rules or increased counts fail CI.
Warnings remain visible. This avoids disabling rules or rewriting legacy tests.
Staged Prettier never uses the baseline exemption.

Constitution: all six principles retained. No foreign collections, contract or
data migration, guard change, publication or deployment. Generation stubs remain
generation-only. No async paradigm migration or additional global module.

## Implementation order

Characterize submission and storage/lease failures plus existing HTTP boundaries;
extract internal AssessmentWriteService; add guarded Husky/lint-staged and baseline
quality gates; add correlated safe write events; test hook/install/JSON behavior;
run regressions/build and record actual results below before completing tasks.

## T003-T009 execution evidence

- Before extraction: the new submission characterization suite passed all 6 cases
  against the original service. Existing 11 HTTP scenarios also passed. Cases cover
  exact completion/owner filters, invalid ID/choices, missing/other-owner attempts,
  completed conflicts, lease contention, storage errors and cleanup failure.
- After extraction: the same suite and all 11 real Mongo HTTP scenarios pass.
  The lease lives in AssessmentWriteService, registered once internally; controllers,
  DTOs, schemas, guard policies and upstream auth protocol are unchanged.
- Added 3 safe-event tests and expanded observability to 7 scenarios. Full unit
  result: 5 suites / 20 tests passed. Actual native Logger output from real write
  operations is parsed for log/warn/error context and nested message shape; canary
  result/error content is absent. Concurrency isolates generated HTTP request IDs
  and write run IDs. GET heartbeat stays quiet and business authentication persists.
- Initial implementation checks caught a misplaced context call and spy/test typing
  issues; these were corrected before final passing validation. They were not
  accepted as baseline debt.
- Pinned Husky 9.1.7 and lint-staged 15.5.2 installed with `npm install --no-audit
--no-fund`; lockfile updated. Existing Prettier style and install scripts retained.
- `node scripts/verify-maintenance.mjs` passed actual disposable Git commits:
  full staged formatting, partial-staged content committed while unstaged edits
  remain, generated contracts ignored, invalid syntax blocks commit without
  changing HEAD/unstaged edits. Negative lint/format checks fail without mutation;
  positive controls pass; changed baseline-hash content is rejected.
- The same script passed fresh `npm ci --no-audit --no-fund` installations for
  developer Git, CI=true, HUSKY=0, package-only/no-Git (no installer copied), and
  `NODE_ENV=production npm ci --omit=dev`. Hook setup is enabled only for developer
  Git. Missing developer hook tools fail explicitly instead of silently skipping.
- Obtained the exact supported runtime with `npm exec --yes --package=node@22.23.5
-- node --version` (v22.23.5). Repeated unit/HTTP/build/lint/format and fixture
  checks under that runtime using `npm exec --yes --package=node@22.23.5 --call
'...'`. npm remains 11.6.0 locally; publishing CLI npm 12.1.0 was not changed.
- `npm run build` passes including DB-free OpenAPI. `git diff --exit-code --
openapi.json` passes: no public contract change, so no contract regeneration/
  publication is required.
- `npm run lint:check` and `npm run format:check` pass without fixes. Strict ESLint
  remains failed with 226 inherited errors / 25 warnings; the baseline was tightened
  to actual remaining counts, excluding repaired service/module errors. Two
  untouched formatting hashes remain exempt only while their bytes are unchanged.
- `git diff --check` passes. No original unrelated files were reverted; no repository
  commit, push, publish, deployment or production data mutation was performed.

## Remaining integration evidence

The Docker daemon is unavailable. Fresh package-only installation reproduces image
COPY ordering locally, but an actual Linux image build/start/health check is not
claimed. GitHub workflow execution (including npm 12 publishing) is not triggered.
Alloy/Grafana credentials, host configuration and ingestion are external-owned;
only actual local JSON placement and the repository's documented pipeline were
verified. Host labels and live LogQL receipt must be checked by infrastructure
owner after authorized deployment. No external source checkout was required.

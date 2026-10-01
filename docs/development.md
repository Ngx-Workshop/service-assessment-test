# Development and verification

Use Node 22 (Docker/CI baseline) and committed lockfiles. Normal runtime needs
MongoDB plus platform authentication. Run from this repository root.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/assessment_test_local
PORT=3005
AUTH_BASE_URL=http://localhost:3000
```

These are local examples, not deployed values. The auth URL must match an actual
local auth service; this repo does not launch one. Never commit `.env`, use a live
shared database for tests, or enable `GENERATE_OPENAPI` while serving the API.

| Purpose | Command | Notes |
| --- | --- | --- |
| Install | `npm ci` | Uses root lockfile |
| Development | `npm run start:dev` | Requires runtime Mongo/auth configuration |
| Build and OpenAPI | `GENERATE_OPENAPI=true npm run build` | `postbuild` runs the generator |
| Regenerate OpenAPI | `GENERATE_OPENAPI=true npm run openapi` | Reuses compiled output; build first for source changes |
| Run compiled API | `npm run start:prod` | Set real runtime configuration, without generation flag |
| Unit tests | `npm test -- --runInBand` | No source unit specs present in reviewed baseline |
| HTTP tests | `npm run test:e2e -- --runInBand` | Existing Hello World scaffold is stale |
| Lint | `npm run lint` | Uses `--fix`, so inspect mutations |

`src/swagger.ts` imports AppModule before setting its generation flag inside the
function. Conditional database/model providers are already evaluated by then.
Set the flag in the command environment as above; Docker and CI do so. Generation
stubs are for metadata extraction only, not runtime mocks or test evidence.

## Contracts

For an API change, update controller/DTO/schema/behavior first, then:

1. `GENERATE_OPENAPI=true npm run build`
2. `npm --prefix contracts/service-nestjs-assessment-test ci`
3. `npm run contracts:service-nestjs-assessment-test:gen`
4. `npm run contracts:service-nestjs-assessment-test:build`
5. Review `openapi.json`, emitted paths/models, entry-point exports and response
   status/required-field consistency. Use consumer compilation or export checks to
   catch missing generated modules concealed by `@ts-ignore`.

The publish script invokes clean/gen/build through prepublishOnly. Publishing is a
separate action; local generation does not establish a released package version.
Current OpenAPI omits both admin routes present in source, lacks create/update body
schemas and list item types, and documents submit as 200 despite default POST 201.
`UserAssessmentTestDto` also omits assessmentTestId while exposing uuid; reconcile
what consumers need with actual schema/service behavior before regeneration/release.

## Containers

The tracked Compose filename is `docker-compose.yml ` with a trailing space. Use
`docker compose -f 'docker-compose.yml ' up --build` if deliberately running that
configuration. It expects `.env` and external `ngx-net`; it does not start Mongo/auth.
Container network addresses differ from host-local addresses. Dockerfile builds with
generation mode for the build command only and runs normal `dist/main.js` on port 3005.

## Required verification for future behavior work

- Add isolated model/guard tests for definitions, identity, eligibility, start/resume,
  scoring, ownership/role denial, malformed IDs and domain errors.
- Use disposable Mongo integration tests for the userId/uuid mismatch, uniqueness,
  question constraints, concurrent starts/submits and existing-record migration.
- HTTP tests must reproduce main.ts validation/cookies and close the app. Mock auth
  where appropriate; separately label real authenticated integration tests.
- Test learner response redaction before connecting the new frontend. Verify contract
  output and gateway behavior independently of successful service compilation.

The current e2e file imports real AppModule, expects GET / → Hello World!, omits
runtime validation/cookie setup and never closes the app. No root controller exists.
This is a source-observed mismatch, not a newly executed test failure. No unit specs
are present; an empty test suite is not passing coverage.

Documentation-only adoption was checked through source inspection, local links,
template parity and whitespace. No install/build/test execution or live Mongo/auth/
gateway/deployment validation was performed. See [readiness](assessment-readiness.md).

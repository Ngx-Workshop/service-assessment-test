# Architecture — assessment service

Updated for [001 reliable authoring](../specs/001-reliable-authoring/spec.md).

NestJS/Mongoose service on port 3005. Owns definitions, learner attempts, eligibility
and grading. It does not own the learner UI, admin shell, auth service or gateway.

## Boundaries

- `assessment-test.controller.ts`: authenticated HTTP routes, explicit admin roles,
  concrete authoring DTOs and Swagger responses. Native prefix `/assessment-test`.
- `dto/definition.dto.ts`: nested, trimmed inputs; positive integer levels; required
  questions, two or more choices, bounded text and update version. Service validates
  distinct choices and answer membership. Global whitelist rejects unknown fields.
- `assessment-test.service.ts`: definition CRUD, owner-scoped attempts, eligibility,
  start/resume and perfect-score grading. Returns 400 for malformed input, 404 for
  absent/other-user records and 409 for conflicting or forbidden state changes.
- `schemas/`: existing definition/attempt storage plus canonical `userId`. New attempts
  write both userId and legacy uuid. Legacy reads use uuid only when userId is absent;
  mismatched identities are not merged. No bulk data migration is performed.
- `assessment-auth.guard.ts`: production platform token validation. Global RolesGuard
  enforces route roles. Explicit local mode has a separate, isolated loopback policy.
- `swagger.ts`: sets generation mode before dynamically importing AppModule; creates
  metadata without a database. `main.ts` refuses to serve in generation mode.

## Access and contracts

| Operation | Access / behavior |
| --- | --- |
| GET/POST/PATCH/DELETE collection | Administrator; PATCH requires full fields, _id and __v |
| GET/DELETE `:id` | Administrator; full answer keys on GET; DELETE returns 204 |
| `user-asssessments` | Authenticated owner's attempts; legacy spelling retained |
| `admin-user-asssessments/:id` | Administrator |
| `user-subjects-eligibility` | Authenticated owner; validated subjects query |
| `admin-user-subjects-eligibility/:id` | Administrator |
| POST `start-test` | Authenticated owner; resumes an unfinished attempt or starts next level; 201 |
| POST `submit-test` | Authenticated owner only; valid choices, one completion; 200 |
| GET `attempts/:id/questions` | Owner only; prompts and choice values without answers or feedback |

Legacy DELETE at the collection path remains available; the admin MFE uses DELETE by
ID. Learners must use the owned questions route instead of the now-admin-only full
definition detail. Authoring PATCH requires the version returned by GET. Generated
contracts export models plus paths/components/operations types.

## Persistence decisions

Definitions must have a unique subject/level among service writes. Updates advance
`__v` and lastUpdated. A stale version returns 409. Definitions referenced by any
attempt cannot be edited or deleted, preserving grading for both old and new attempts.
There is no publication lifecycle, retry policy or snapshot migration.

Progression remains completed-attempt count plus one, regardless of pass/fail. Passing
still requires every answer to be correct. Eligibility now checks for an available
next level or unfinished attempt, so missing levels do not advertise an unusable start.
Legacy duplicate levels produce a conflict when starting; they are not silently repaired.

Writes share a Mongo `assessment_write_leases` collection, serialized across instances
through its unique `_id`. Contention returns retryable 409. The lease expires after
120 seconds; database operations have 5-second limits/socket timeouts. This is a
bounded-operation lease, not a transaction or an exactly-once guarantee under an
arbitrarily paused process. All application writers must use this service; direct
collection writes and old deployed writers are outside these guarantees. Submission
also uses an atomic conditional update on owner and `completed:false`.

The unwired legacy attempt CRUD helper remains unused. No other service's collections
are accessed. Production release must coordinate the updated admin consumer and
verify gateway forwarding for the added DELETE and learner questions routes.

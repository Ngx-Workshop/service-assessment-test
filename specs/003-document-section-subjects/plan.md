# Plan: Document section subjects

Status: Implemented; hosted integration pending
Spec: [spec.md](spec.md)

## Design and constitution

Keep browser HTTP in stateless adapters, sections request state in a root store,
and presentation driven by typed inputs. The wizard orchestrates section loading
with destroy cleanup; form payload explicitly includes ID and title. Catalog
filters derive subjects from loaded definitions, display titles and compare IDs.
Document HTTP uses /api/documents in production, localhost:3007 in development.

The assessment service replaces subject enums/unions with validated strings,
adds optional title inputs/defaulted title storage for old clients, and groups
learner subjects from definitions/attempts. All identity/progression queries remain
string-based. Title updates never affect identity. Generate contract types from
DTO source; use a local vendored archive for consumer verification, not publication.

No constitution deviations. No other service collections, data migration, auth,
scoring, lifecycle, route or federation changes. Subject options are not server
foreign-key validation; the service validates shape and stores the snapshot.

## Verification

Service disposable Mongo HTTP tests cover Rust round-trip, title rename with same
ID, duplicate detection, start/eligibility and invalid IDs/titles plus existing
regressions. Admin tests cover dynamic choices, states/retry, payload mapping,
existing selection and title display/filtering. Build source, generated contracts
and production admin; check source organization.

## Technical Context

**Language/Version**: TypeScript ~5.7.3 / NestJS 11
**Primary Dependencies**: Mongoose 8, class-validator, Swagger
**Storage**: MongoDB assessment definitions/attempts
**Project Type**: REST service and generated contracts

## Authorized existing-data migration — 2026-10-09

The user explicitly requested migrating existing assessment/user subjects in their
server mongosh session. Map ANGULAR/NESTJS/RXJS to existing document section IDs
angular/nestjs/rxjs and read sectionTitle from those records. Retain definition and
attempt IDs and assessmentTestId references. Use server-side originals, a shared
write lease, a snapshot transaction and conditional version updates. Reject
missing mappings, collisions and broken references before mutation. No identity,
answer, grading, timestamp or ownership changes. See the migration record in
[scripts/migrations](../../scripts/migrations/README.md).

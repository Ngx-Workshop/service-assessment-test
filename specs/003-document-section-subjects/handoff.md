# Handoff: Document section subjects

Status: Implemented; hosted integration pending
Updated: 2026-10-09
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)

## Delivered and verified

- PASS: 3 auth guard unit tests and 10 HTTP scenarios with real isolated MongoDB,
  controllers/validation/roles and synthetic identity. The test database is dropped.
  Covers Rust ID/title CRUD, title rename/legacy omitted title, duplicate ID-level,
  identical titles with different IDs, arbitrary eligibility/start, invalid fields,
  preserved legacy records and existing ownership/scoring/concurrency regressions.
- PASS: service build/OpenAPI, contract generation/build, exact no-enum string
  schema assertions and focused DTO/schema lint.

HTTP/Angular tests use synthetic identity or HTTP doubles; they do not verify live
platform authentication or cross-service hosted UI. Earlier test expectation
failures for additive title metadata/dynamic catalog counts and asynchronous
Material selection were corrected; the final suites pass.

## Contract and rollout

Definitions save `subject` as the document section `_id` and `sectionTitle` as
its display title snapshot. New authoring reads document GET /navigation/sections
(map wrapper); production /api/documents, development localhost:3007. New forms
require selection. Existing subjects absent from the catalog retain their identity
and remain editable; they are not silently reassigned by matching a title.

Legacy persisted strings and attempts are unchanged. Missing display titles fall
back to the old subject. Titles refresh from current document sections when the
admin opens a definition, then save explicitly; used-definition protection still
applies. No background title synchronization or bulk migration is performed.
The service validates string shape, not section existence through a foreign DB.
Duplicate levels, eligibility and starts compare IDs. Subjects with no definitions
or attempts no longer create empty fixed-enum learner cards.

Generated contract 0.0.20 is built locally and vendored in both consumers. Release
owners deploy the service, publish/adopt the reviewed contract and release both
consumers together before enabling new subjects. Verify real Admin creation,
section load/error states and learner start/resume/history through hosted gateways.
No publication, deployment or production data changes were performed here.

## Remaining and context

Local tasks are complete. X001 is hosted rollout/auth/gateway acceptance.
Architecture/development and feature index document this contract and verification.

## Existing-data migration — 2026-10-09

At the user's explicit request, migrated the live workshop-viewer database through
its authenticated mongosh session: 9 assessment definitions and 15 user attempts.
ANGULAR → angular / Angular; NESTJS → nestjs / Nest JS; RXJS → rxjs / RxJS.
Those are the actual section _ids/titles. Definition/attempt IDs, assessmentTestId,
owner identity, questions/answers, scoring/completion flags and timestamps remained
unchanged. Subject/title updates incremented __v. Backed up all 24 originals plus
manifest in assessment_section_subject_backup_20261009 on the same server, and
committed both collections in one majority-acknowledged snapshot transaction under
the service write lease. Independent post-commit queries found no broken/mismatched
references, no active lease, and zero remaining dry-run changes. Script syntax
check passes. Initial top-level-await shell syntax errors made no database changes;
loading the function and invoking it without top-level await succeeded.

See [migration and recovery record](../../scripts/migrations/README.md).
No package release, deployment, rollback or live application journey check was run
as part of the migration. Existing data acceptance is complete; hosted rollout
acceptance remains separately tracked.

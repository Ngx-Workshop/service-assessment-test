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

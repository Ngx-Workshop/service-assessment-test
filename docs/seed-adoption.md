# Seed adoption status — assessment service

> Historical migration snapshot. The runtime repairs and current verification are recorded in [001 reliable authoring](../specs/001-reliable-authoring/handoff.md). Read architecture/development for current behavior.

The Markdown workflow is adopted from `seed-service-nestjs`. Workflow instructions
and templates remain reusable; entry point, constitution and context now describe
assessment definitions and learner attempts instead of example-document CRUD.

| Area | Observed adoption | Remaining work before learner integration |
| --- | --- | --- |
| Runtime identity | Assessment module/routes, port 3005, assessment Docker/CI target | Preserve deployment compatibility |
| Persistence | Assessment and attempt schemas | Reconcile userId/uuid, validation, indexes and existing records |
| Business operations | Eligibility, start/resume, submit/scoring | Specify progression, retry and concurrency rules |
| Access | Global auth/roles plus route guards | Explicit admin roles, attempt ownership and answer-key redaction |
| Contracts | Assessment package and generation scripts | Repair source/snapshot/export drift and verify consumer version |
| Tests | Stale Hello World e2e, no source unit specs | Add meaningful domain and HTTP coverage |
| Leftovers | Unwired attempt CRUD helper, legacy-named update DTO, generator ordering, Compose filename | Resolve only when within implementation scope |

Read [readiness](assessment-readiness.md) before a behavioral feature. Do not copy
Coding Labs runner, publication/versioning or local admin-bypass assumptions into
assessments. No schema migration, endpoint rename, auth change, generated-contract
rewrite or deployment was performed during this Markdown migration.

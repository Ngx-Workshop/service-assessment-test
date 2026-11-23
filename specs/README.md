# Assessment feature specifications

## Next task: Code Maintenance

Status: Implemented; integration pending. Selected on 2026-11-22; local maintenance
tasks and verification are complete. Docker image execution and live Grafana
receipt remain explicitly outstanding in the handoff.

[Spec](007-code-maintenance/spec.md) · [Plan](007-code-maintenance/plan.md) ·
[Tasks](007-code-maintenance/tasks.md) · [Handoff](007-code-maintenance/handoff.md) ·
[Reusable Copilot prompt](../.github/prompts/code-maintenance.prompt.md)

Continue with X001-X002 after separate infrastructure/deployment authorization.
Older unfinished work retains its recorded status below.

Use the local [workflow](../.specify/README.md) and [templates](../.specify/templates/)
to create a spec, plan, tasks and handoff for each accepted implementation feature.
Select work from the user's request; the highest folder number is not automatically
active. Keep completed records for compatibility decisions and rationale.

| Feature | Status | Spec | Plan | Tasks | Handoff |
| ------- | ------ | ---- | ---- | ----- | ------- |

The documentation migration and source review are complete; see
[assessment readiness and handoff](../docs/assessment-readiness.md). That review
records current behavior and future decisions, not approval to implement every
finding. No Coding Labs history or seed example feature specs were copied here.

- [001 Reliable authoring](001-reliable-authoring/spec.md) — Implemented and locally verified; production release pending.

- [002 Learner journey](002-learner-journey/spec.md) — Implemented; deployment and live integration pending.

- [003 Document section subjects](003-document-section-subjects/spec.md) — Implemented; hosted integration pending.

- [004-multiple-tests-per-level](004-multiple-tests-per-level/spec.md) — Implemented; hosted integration pending.

- [005-deployment-cleanup](005-deployment-cleanup/spec.md): Deployment cleanup; implemented and locally verified.

- [006-service-observability](006-service-observability/spec.md): Implemented and locally verified; Grafana ingestion authorization pending.

- [008-deployment-management](008-deployment-management/spec.md): Implemented locally; automatic verification/deployment, manual publication.

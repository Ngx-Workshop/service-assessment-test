# Tasks: Document section subjects

- [x] T001: Implement DTO/schema dynamic ID/title contracts and learner grouping.
- [x] T002: Connect admin adapter/store/wizard/forms/catalog to document subjects.
- [x] T003: Generate/consume contracts; verify HTTP/admin regressions and builds.
- [x] T004: Update context and handoff with actual verification and release order.
- [ ] X001: Release owners coordinate service/contracts/admin and learner consumer
  adoption, then verify production document/assessment gateway with real auth.

## Verification evidence

See [handoff.md](handoff.md) for test/build evidence and hosted release limits.

- [x] T005: Audit production section mappings and assessment/attempt references.
  Verified 9 definitions, 15 attempts; no canonical collisions or orphan references.
- [x] T006: Back up and migrate both collections transactionally, retaining IDs,
  assessmentTestId and all answers/scores. Majority commit, 24 backups, lease released.
- [x] T007: Verify independent stored counts/reference consistency and idempotent
  dry run (zero changes), retain script/recovery record. No rollback performed.

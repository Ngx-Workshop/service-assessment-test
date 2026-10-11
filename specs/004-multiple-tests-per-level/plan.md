# Implementation plan
Spec: [spec.md](spec.md)

Service removes subject/level availability rejection from create/update. Shared helpers compute consecutive completed levels from known definition IDs and select unattempted tests at unlocked levels. Catalog, start and subject eligibility use the same rule. Selected ID determines the exact attempt; ambiguous old callers must supply it. Learner already sends definition IDs; update explanatory copy and prove second-row selection through a rendered component test.

Constitution: owned persistence and auth boundaries preserved; uniqueness intentionally superseded by explicit user instruction. No migration or grading change. Regenerate service OpenAPI/contracts for start-selection metadata. Deploy producer before learner copy. Verify real disposable Mongo HTTP tests, learner HTTP-double component suite and both production builds. Preserve existing unrelated working-tree changes.

# Plan
Status: Implemented; integration pending · Updated: 2026-10-09

## Source and design
Learner frontend is seed CRUD; service has owner-scoped start/questions/submit and immutable used definitions. Add safe catalog DTOs with level status, enriched owner history, completed-only feedback and persisted draft answers. Optional definition ID on start makes catalog selection race-safe while keeping old callers compatible. Keep answer validation, eligibility and proficiency on the service boundary. Frontend uses generated producer contracts, Angular signals, reactive question controls, Material actions and relative query parameters for deep links that work with both exposed Component and Routes. Separate catalog, runner and results components from API/state.

## Constitution
Single journey ownership, authenticated APIs, typed contracts, zoneless state, preserved federation and local documentation are satisfied. No new auth bypass or publication lifecycle. New endpoints are additive; stored draftAnswers defaults to empty for legacy records. Producer builds and regenerates contracts before consumer installation; use a vendored generated package archive until this additive version is released (no registry publishing in this task).

## Verification
Run service unit and disposable-Mongo HTTP suites; add scenarios for safe catalog, exact eligibility, draft validation/ownership/refresh, completed-only feedback and proficiency. Build regenerated contracts. Frontend HTTP/component tests verify navigation, restored answers, review/submission, errors and history. Build production separately from the existing watch output, inspect desktop/mobile and real host where accessible. Live gateway/auth checks remain distinct from mocks.

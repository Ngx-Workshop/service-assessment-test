# Learner assessment journey
Status: Implemented; integration pending · Created: 2026-10-09

## Problem and scope
Learners need to discover subjects, enter eligible assessments, save progress, submit answers and understand previous results. Authoring remains in the administrator journey.

## Requirements and acceptance
- FR-001 / AC-001: Show all supported subjects and safe definition metadata; subject detail shows available, in-progress, completed and locked levels. Clicking an eligible test starts or resumes that exact definition.
- FR-002 / AC-002: Owner-scoped questions exclude answers and feedback. Learners navigate questions, persist partial answers, leave and resume after refresh, and review all responses before submission.
- FR-003 / AC-003: Validate one choice per question. Submit once; recover from request errors without losing choices. Disclose correctness and author feedback only after completion to the owner.
- FR-004 / AC-004: Show dated historical results, score percentages and subject proficiency derived from the highest passed level, separately from levels completed. Empty, loading and retryable error states are explicit.
- FR-005 / AC-005: Preserve authenticated ownership including legacy uuid-only records; deny other users and unauthenticated requests. Responsive layouts and keyboard-operable choices/navigation.

## Decisions and compatibility
Retain existing completion-based progression (next level = completed count + 1), perfect-score passing, and no retries. No invented beginner/expert certification. Canonical userId and legacy uuid fallback follow reliable-authoring policy, without bulk migration. Preserve federation name, default App, named Routes and overview mount. New learner endpoints use existing authentication and browser /api/assessment-test gateway prefix. Production deployment is outside local implementation; host smoke testing is attempted separately.

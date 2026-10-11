# Multiple tests per level
Status: Implemented; hosted integration pending · 2026-10-11

## Problem and evidence
User creation at angular/1 returns 409 because the service enforces subject/level uniqueness. Live read-only Mongo inspection found an existing level-1 quiz with four attempts. User explicitly requested multiple tests per level and learner selection.

## Requirements and acceptance
- FR-001 / AC-001: Admin can create and update multiple definitions at the same subject/level, without changing prior records.
- FR-002 / AC-002: Learner chooses a specific available definition ID; another subject, a completed test or a locked level is rejected. Ambiguous starts without an ID return 409 asking for selection.
- FR-003 / AC-003: Completing any test at each consecutive level unlocks the next level regardless of passing. Unattempted sibling tests at unlocked levels stay available. Extra completions at one level do not skip levels; orphan attempts cannot advance progression.
- FR-004 / AC-004: One active attempt per subject, owner checks, resume, scoring, historical results and used-definition protection remain enforced.

## Boundaries and assumptions
Completion rather than passing preserves existing progression policy. One test per consecutive level is sufficient; no requirement to complete every sibling. Existing data needs no migration. No production data writes or deployment in this change. Wire DTO shapes and federation exports stay compatible.

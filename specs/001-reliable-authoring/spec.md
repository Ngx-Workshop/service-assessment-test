# Validated admin authoring and owned learner attempts

Status: Implemented and locally verified; production release pending

## Requirements
- FR-001: Create, edit and delete valid definitions with clear success/failure states. Require trimmed text, positive integer levels, distinct choices and an answer belonging to those choices.
- FR-002: Restrict definition management and other-user queries to administrators; scope submissions to their owner. Keep answer keys out of learner responses.
- FR-003: Preserve existing completed-attempt progression and perfect-score passing. Canonical identity is userId, with uuid as a legacy alias. Read legacy uuid only when userId is absent. Do not bulk-rewrite production records.
- FR-004: Preserve assessments referenced by attempts: reject edits/deletes once used. This conservative policy avoids changing historical scoring without inventing a publication lifecycle. Serialize writes across service instances using a Mongo lease; concurrent writes return retryable 409.
- FR-005: Distinguish empty, filtered-empty, loading and error states; retain failed edits, prevent duplicate submissions, protect unsaved changes and support narrow screens.
- FR-006: Use a dedicated local database and explicit development API configuration for hosted-shell testing. Production uses the existing gateway and platform authentication.

## Acceptance
- AC-001: A multi-question definition can be created, reopened, edited and deleted; saved answer/feedback values match the form.
- AC-002: Invalid choices, whitespace, fractional levels and stale answers are rejected by client and service.
- AC-003: Failed fetch/save/delete is recoverable and never reports success or discards entered data.
- AC-004: Unauthorized management, cross-user submission, duplicate submissions, missing IDs and edits to used definitions return appropriate 4xx errors.
- AC-005: New and legacy attempts resume correctly and grading remains server-owned.
- AC-006: Host-mounted navigation, unsaved protection and mobile layout are verified against isolated local data.

## Compatibility
Preserve route spellings, federation exports, subjects, collection PATCH and legacy DELETE body. Add DELETE by ID for reliable browser requests. Full definition detail becomes admin-only; add owned attempt questions endpoint for learner integration. No learner UI implementation or production data migration is included.

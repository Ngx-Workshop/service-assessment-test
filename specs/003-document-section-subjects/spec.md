# Feature: Document section subjects

Status: Implemented; hosted integration pending
Created: 2026-10-09

## Scope and acceptance

FR-001 / AC-001: Authoring loads choices from document GET /navigation/sections,
showing sectionTitle and saving the selected _id as subject, with sectionTitle as
its display snapshot. No hardcoded subject choices or default selection.
FR-002 / AC-002: Persist arbitrary nonblank string section IDs (including legacy
keys) and titles. Subject identity, duplicate-level checks, eligibility, start and
catalog grouping use ID, never title. Preserve legacy string subject records and
attempt identity; do not silently remap them to new section IDs.
FR-003 / AC-003: Loading, error/retry and empty sections states are observable;
failed loads preserve drafts. Existing subjects absent from the document catalog
remain displayed for edits, with their existing identity retained.
FR-004 / AC-004: Validate blank/non-string/oversized IDs and titles. Keep roles,
versioning, question validation, used-definition protection and scoring unchanged.
FR-005 / AC-005: Regenerate and consume contracts; run service HTTP and admin
regressions plus production builds. Hosted auth/gateway verification is separate.

## Compatibility and ownership

Use subject: string and sectionTitle: string as the recommended additive shape.
The title is a saved display snapshot, not an automatic cross-service rename.
Legacy records/callers without sectionTitle fall back to subject; no bulk migration.
Document service remains the source of authoring choices via API, not direct DB
access. No section schema change, publication or deployment is required locally.
Learner consumers must adopt arbitrary string IDs and display titles before release.

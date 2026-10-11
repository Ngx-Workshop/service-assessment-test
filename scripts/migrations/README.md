# Assessment section subject migration

Applied and verified 2026-10-09 through the user-authorized server mongosh session.
Target: `workshop-viewer` on replica set `rs0` primary. No credentials are saved.

## Outcome

| Old subject | Section _id | Section title | Definitions | User attempts |
| --- | --- | --- | --- | --- |
| ANGULAR | angular | Angular | 3 | 7 |
| NESTJS | nestjs | Nest JS | 3 | 5 |
| RXJS | rxjs | RxJS | 3 | 3 |

These section IDs are existing legacy string IDs, not Mongo ObjectIds. Titles are
read directly from sections. All 9 definitions and 15 user attempts migrated.
Only subject, sectionTitle and __v changed; each version advanced by one to reject
stale updates. Document/attempt _id, assessmentTestId, owner identity, questions,
answers, scores, completion/passing flags and timestamps were verified unchanged.

## Execution and verification

Load `assessment-section-subjects.mongosh.js` in a mongosh session authenticated to
the intended server, then call `migrateAssessmentSubjects(false)` to preview.
The explicit mutation command is `migrateAssessmentSubjects(true)`. This server's
interactive mongosh rejects top-level await syntax; it resolves the returned
promise automatically. The function itself uses async/await internally.

The preflight aborts on unmapped sections, orphan/mismatched references, invalid
versions or canonical subject/level collisions. Apply acquires the same expiring
assessment-writes lease used by the service, then backs up and updates both
collections within a snapshot transaction committed with majority write concern.
The lease is released by expiry without deleting its record. Backup collections
are not overwritten. All fields outside the three migration fields are compared
with the originals before commit. A post-commit dry run returned zero changes;
independent queries found 24 backups, no mismatched references and no active lease.

## Recovery

Server backup: `workshop-viewer.assessment_section_subject_backup_20261009`.
There are 24 original documents plus a manifest. Each backup uses
`_id: { collection: 'assessmenttests' | 'userassessmenttests', id: <original _id> }`
and stores the full original under `document`. Originals remain on the server;
no user records were exported locally.

Before any rollback, dry-run comparison against the backup and current records.
Restore only subject and the original presence/value of sectionTitle, keeping
assessmentTestId and all answer/scoring data untouched. Use a fresh service-write
lease and transaction, filter each update by its expected post-migration __v,
and advance __v again rather than reverting it. Abort if any record changed since
migration. Never blindly replace current records with backups: later learner
progress must be preserved. No rollback was requested or performed.

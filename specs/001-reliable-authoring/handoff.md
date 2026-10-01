# Reliable authoring handoff

Status: Implemented and locally verified. Production release authorized.
Deployment outcomes are recorded by the GitHub Actions run for the release commit.

## Delivered

- Concrete nested authoring DTOs, trimmed/length/integer validation, distinct choices and answer membership.
- Administrator definition management and other-user queries; owned learner submissions and a redacted questions route.
- Canonical userId with legacy uuid fallback and dual-write compatibility; no production migration.
- Version-checked updates, protected used definitions, bounded Mongo write leases and conditional completion.
- Reliable raw form mapping, dirty-state protection, route reuse, feedback review, accessible actions, refresh, errors and retry.
- Separate development API target, isolated loopback service and safe OpenAPI/contract generation.

## Verification

- Service: 3 local-isolation guard tests and 6 real Mongo HTTP scenarios pass. Test database is disposable; identity provider is mocked, production guards/roles run.
- Admin: 10 ChromeHeadless regression tests pass. Both production builds and generated contract compilation pass.
- Browser: standalone create and hosted list/edit/save/return work against localhost:3005. Hosted navigation uses /assessment-tests correctly. Unsaved-navigation prompt was observed. Catalog and question editor have no horizontal overflow at 390px.
- Delete success is verified by real HTTP tests; failed-delete row retention by frontend regression tests. Browser deletion was not exercised.
- The initial stale Hello World e2e failed as expected and was replaced with the domain suite. Hosted testing found an implicit DestroyRef federation issue; explicit injection fixes it.
- Production auth, gateway and deployment are not validated by the local synthetic admin identity.

## Release and compatibility

Deploy the service before the updated admin assets. PATCH now requires __v; older authoring clients must refresh after rollout. Full definition GET is admin-only. Learners must use GET /assessment-test/attempts/:id/questions; the learner remote is outside this task. DELETE /assessment-test/:id is additive; legacy collection DELETE remains. Preserve the existing misspelled attempt routes for consumers.

Verify gateway forwarding of the new routes and normal production auth on release. Review legacy duplicate levels, missing levels and mismatched identities before any future data migration; this change does not silently repair existing records. Used definitions cannot be edited or deleted, including after completed attempts. There is no new retry, snapshot, archive or publication lifecycle.

## Local continuation

The development watcher and isolated service were left running. Service command: npm run start:local (MongoDB required). Frontend command: npm run dev:bundle, now using development configuration. Production API remains /api/assessment-test. One clearly named local verification definition remains in assessment_test_local for inspection; production records were not modified.

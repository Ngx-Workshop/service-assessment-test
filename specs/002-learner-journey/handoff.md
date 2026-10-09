# Learner journey handoff
Status: Implemented; integration pending · Updated: 2026-10-09
Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md) · Tasks: [tasks.md](tasks.md)

## Delivered
Subject catalog with eligible/in-progress/completed/locked levels; exact selection; focused untimed runner; sequential server saves and interrupted-request browser recovery; save/exit and refresh/resume; all-answer review; final submit with lost-response reconciliation; owner-scoped historical question feedback and proficiency. Existing completion progression, 100% pass threshold and legacy identity behavior are retained. Seed CRUD is removed from the learner remote; authoring remains separate.

## Verification
| Acceptance/check | Result | Evidence and limits |
| --- | --- | --- |
| AC-001 catalog/exact eligibility | PASS locally | Frontend request mapping + real Mongo HTTP catalog/start validation; browser start |
| AC-002 saved answers/refresh | PASS locally | Backend draft validation/isolation + frontend saved/browser recovery tests; full browser refresh and save/exit |
| AC-003 scoring/review/feedback | PASS locally | Incomplete submit blocked, review shown, perfect-score grading; completed-only/other-user denial; lost response reconciled |
| AC-004 history/proficiency | PASS locally | Weighted scores/highest passed level HTTP checks, empty history tests, dated browser results |
| AC-005 access/responsive/keyboard | PASS locally | 3 guard tests + HTTP owner checks; Material radio/buttons, keyboard focus; 1366/390 px with no page overflow |
| Frontend build/tests | PASS | Production build, 8 ChromeHeadless tests. Scoped styles 4.3–6.2 kB exceed inherited 4 kB warnings but remain below 8 kB errors |
| Service/OpenAPI/contracts | PASS | Service build, generated OpenAPI, contract gen/build, 3 unit tests and 7 real Mongo HTTP scenarios |
| Live beta/auth/gateway | NOT VERIFIED with new release | Inspected beta still served deployed seed remote. Local preview uses synthetic auth and a unique disposable DB |

## Compatibility and delivery
The service owns the additive learner catalog/history/answers/result routes and optional exact definition selector. Generated contracts are prepared as 0.0.19, not published. The learner has a reproducible vendored archive/file dependency pending registry release. Existing admin consumers/routes remain compatible. No bulk identity migration or production mutations.

Release the updated service and verify gateway forwarding of `/api/assessment-test/learner/*` and `/api/assessment-test/attempts/*`, then release the learner remote. Preserve its existing registry identity/exposed Component and Routes. Host must supply router/HTTP/session interceptors. Local routes use query parameters under overview. Validate a real authenticated subject → start → save → refresh → submit → history flow after release (X001).

## Review locally
Build the learner to `dist/learner-verification`, then run `npm run preview:learner` in the service checkout; open http://localhost:4203/. It uses the real service with synthetic definitions and learner identity on loopback, and drops its unique test database on termination. This optional companion-checkout harness is not part of production.

## Context
Architecture/development now describe implemented behavior and actual evidence. Historical readiness reviews remain baseline snapshots. No deployment, registry publication, commit or push was performed.

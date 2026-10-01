# Development and verification

Use Node 22 and `npm ci`, matching CI. MongoDB is required for persistence integration.

| Purpose | Command |
| --- | --- |
| Compile + generate OpenAPI without DB | `npm run build` |
| Unit tests | `npm test -- --runInBand` |
| Disposable Mongo HTTP tests | `npm run test:e2e -- --runInBand` |
| Generate contracts | `npm run contracts:service-nestjs-assessment-test:gen` |
| Build contracts | `npm run contracts:service-nestjs-assessment-test:build` |
| Isolated local service | `npm run start:local` |
| Normal configured watch | `npm run start:dev` |

`start:local` explicitly selects `mongodb://127.0.0.1:27017/assessment_test_local`,
port 3005 and development mode, overriding any .env database. It binds only to loopback.
The local guard accepts loopback requests and browser origins admin.ngx-workshop.io or
localhost:4201, using synthetic identity `local-assessment-admin`. Any other database
is rejected in local mode. Production mode always uses the auth service even if the
local flag is present. Do not expose this mode through a tunnel or reverse proxy.

The HTTP suite creates `assessment_test_regression_<pid>` on local Mongo, then drops
that database. It uses real schemas/controllers/guards and a fake identity provider;
it does not test live platform token validation. The three guard tests cover local
DB/origin/address restrictions and production behavior. Six HTTP scenarios cover CRUD,
validation, admin roles, owner checks, legacy identity, scoring, protected definitions,
version conflicts, concurrent starts/submissions and expired leases.

Verified locally: 3 unit tests, 6 HTTP scenarios, service build, OpenAPI and generated
contract compilation. No external infrastructure credentials or production records
are needed. Contract generation artifacts are ignored; the generated public index and
OpenAPI snapshot are tracked. `gen` regenerates the index and appends path type exports.

Production deployment and a real auth/gateway smoke test are separate release work.
See the [handoff](../specs/001-reliable-authoring/handoff.md) for compatibility details.

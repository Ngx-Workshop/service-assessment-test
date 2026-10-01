# Assessment Test Service

NestJS/Mongoose service for assessment definitions, learner attempts, subject
eligibility and scoring in Ngx-Workshop. The current implementation has identity,
authorization and contract gaps; see the [readiness review](docs/assessment-readiness.md)
before building a learner flow against it.

Start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), and
[development](docs/development.md). The local [specification workflow](.specify/README.md)
and [feature index](specs/README.md) support future implementation work.

## Local commands

Use Node 22 and `npm ci`. Normal runtime needs `MONGODB_URI` and platform auth
configuration; port defaults to 3005. `npm run start:dev` runs the service.
`GENERATE_OPENAPI=true npm run build` compiles and generates OpenAPI without database
wiring. Never use that flag to serve the real API.

Contracts are generated under `contracts/service-nestjs-assessment-test` and published
as `@tmdjr/service-nestjs-assessment-test-contracts`. Local manifest version `0.0.1`
is not evidence of the latest published version. Main-branch pushes trigger contract
publication followed by production deployment.

Documentation adoption did not alter runtime behavior, APIs, schemas, contracts or CI.

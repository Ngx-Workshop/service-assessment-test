# Service logging and heartbeat

This service uses native NestJS 11 `ConsoleLogger` JSON output to stdout/stderr, with `Logger` context for application events. No Angular logger or application-held Grafana credential is used. HTTP logs contain generated request ID, method, route template, status and duration; bodies, cookies, authorization headers, concrete identifiers and query strings are not logged by the middleware. Health polling is excluded from access logs. Avoid embedding secrets or personal search text in domain log messages.

`GET /health` and HEAD return the anonymous operational Terminus heartbeat with `status: ok` and `heartbeat: up`, plus `Cache-Control: no-store`. This is liveness only; it does not claim MongoDB or upstream readiness. Existing business-route authentication remains enforced. The gateway's exact read-only heartbeat is the only exception to its normalized proxy-envelope requirement. The operational endpoint is excluded from business Swagger/contracts where that service generates them.

Docker probes `/health` every 30 seconds. Deployments bound each container's local JSON log files to 10 MiB × 3. Host Alloy discovers active service names and ships logs and private HTTP heartbeat probe metrics to Grafana Cloud stack `ivorytoffee195`. Collector configuration/dashboard lives in infrastructure owner `nginx-ngx-workshop.io/ops/grafana`; its ingestion token remains host-owned, scoped to logs/metrics write, and requires account authorization before activation. No production credential belongs in this repository.

Validation on 2026-11-21: the isolated observability HTTP suite passed (5 scenarios), build passed, Linux-targeted lockfile dry run passed. Guarded services additionally passed the anonymous-heartbeat/protected-business-route HTTP test. Gateway production ingress e2e passed (51 scenarios), including exact-path/method heartbeat boundaries. Gateway and publisher lint passed. Full existing unit suites passed except Backstage's unchanged Octokit ESM test-loader failure, reproduced on its pre-change HEAD. Uploader tests pass under its documented `npm test` command; its 10 optional cases remain skipped. Publisher persistence e2e cases require the isolated Mongo URI and remain skipped when unavailable. These are local checks, not evidence of Grafana ingestion or live deployment.

## Assessment write events (maintenance 007)

The existing middleware now runs business requests in AsyncLocalStorage. The
generated `X-Request-ID` response header matches the access event and any awaited
assessment write event. Incoming request IDs are ignored, regardless of shape,
so callers cannot inject identifiers/content into logs. No auth-service header or
distributed trace protocol changed. Concurrent requests have isolated contexts;
background work without a request has only a generated runId. Work deliberately
spawned inside a request inherits that context; this is correlation, not a span.
Health GET/HEAD remain excluded before context creation and access logging.

The internal write coordinator emits one `assessment_write` event for each
`create`, `update`, `delete`, `start`, `save_answers` or `submit` lease boundary.
It includes a generated runId (also the lease owner), optional requestId and
nonnegative durationMs including lease acquisition, execution and cleanup.
Success uses `log`; expected HTTP rejection uses `warn` with statusCode;
unexpected storage/acquisition/cleanup failure uses `error`. Errors are rethrown
unchanged; a failed cleanup never emits success. Resume uses operation `start`.
Read operations and validation before lease acquisition emit no domain event;
HTTP access logging still covers their statuses. No per-question events are emitted.

No learner/definition IDs, subject/title, selected/correct answers, scores, feedback,
tokens, request content, exception messages or stack traces enter these domain
payloads. Existing framework exception logging is separate and unchanged.
The collector remains infrastructure-owned; no app ingestion SDK/token is added.

Native Nest JSON places structured fields under `message`, not the root:

```json
{
  "level": "error",
  "context": "AssessmentWriteService",
  "message": {
    "event": "assessment_write",
    "operation": "submit",
    "runId": "00000000-0000-4000-8000-000000000001",
    "requestId": "00000000-0000-4000-8000-000000000002",
    "durationMs": 5,
    "outcome": "failure"
  }
}
```

This illustrative payload omits the native timestamp/pid. Local tests assert
success/rejection/failure objects, native warn/error JSON field placement, canary
exclusion, caller-ID rejection, concurrent correlation and quiet health polls.
For LogQL, first select this service using the actual host collector labels,
then parse the nested fields (replace the selector with the deployed labels):

```text
{service_name="service-nestjs-assessment-test"}
  | json event="message.event", operation="message.operation", outcome="message.outcome", requestId="message.requestId"
  | event="assessment_write"
  | outcome="failure"
```

For request correlation, filter the parsed requestId value and include access
events as well. Never promote requestId/runId to indexed Loki labels. Local
serialization is compatible with the documented stdout collector pipeline;
actual deployed labels, ingestion receipt and query behavior are not locally
verified. Infrastructure owner `nginx-ngx-workshop.io` must authorize Alloy,
deploy the service, then confirm a synthetic success/failure and heartbeat metric
in stack `ivorytoffee195`. Do not use production learner content as test payloads.

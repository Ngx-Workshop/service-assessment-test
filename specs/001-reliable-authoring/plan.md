# Plan

Implement concrete nested DTO validation and stable HTTP errors; add role/ownership checks and legacy identity reads. Reject modification of referenced definitions to preserve existing grading. Use atomic conditional submission and a short, renewable-free Mongo write lease with bounded database operations. Lease contention returns 409; expired leases recover crashed processes.

Repair typed raw-value mapping and aligned form validation, then implement recoverable async states, route reuse, unsaved navigation protection and accessible controls. Keep published response DTO types; input payload remains structurally compatible. Add explicit development environments and isolated loopback service mode.

Verify using focused form tests, HTTP/persistence tests against disposable Mongo, production builds and generated contracts, then hosted-shell browser CRUD. Record any external integration gaps. No production release in this implementation step.

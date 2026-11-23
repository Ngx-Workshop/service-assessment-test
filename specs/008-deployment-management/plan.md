# Plan

Baseline HEAD: `89267a559aa91c1beafec04d91ec9569908b60ba`. Audit found jobs publish, deploy;
deploy prerequisites were `publish`.
Use the central Node CLI policy and reviewed service-specific job profile. Separate
validation from publication, make deploy need validate only, preserve transport
steps and existing contract/version semantics. Main-only guards protect mutation;
OIDC write permission belongs only to manual publish. Preserve domain/access rules;
no application/schema changes. Verify YAML parsing, event gates, source transport
comparison and CLI drift check. No live deployment verification is requested.

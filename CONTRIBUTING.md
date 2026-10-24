# Contributing

This source candidate is [MIT licensed](LICENSE). Use [GitHub Issues](https://github.com/john07180718/task-resource-guard/issues) for general questions and synthetic bug reports. There is no promised response time or tagged release yet.

## Scope

Useful changes include a reproducible lifecycle failure, a Windows compatibility correction, clearer adapter instructions or better protection of queued/busy work. Keep fixes small and preserve default dry-run, explicit ownership and cooperative shutdown.

Do not add a new cloud service, dependency, telemetry, scheduler, paid API or integration without discussing scope and authorization. A new tool adapter needs verifiable ownership, complete work-state coverage and a supported normal close method. Existing unknown processes and shared browsers are outside scope.

## Local validation

Use Node 24 and PowerShell 7 for the currently tested Windows path. There is no package installation step. From the repository root:

```powershell
node --test --test-concurrency=1 .\tests\owned-resource.test.mjs .\tests\cli.test.mjs .\tests\metadata.test.mjs .\tests\registered-cleanup.test.mjs
```

Read the fixture before running it. The integration test starts its own synthetic children and confirms they exit normally. Never substitute real credentials, production tools or another session's services. Do not introduce a force-kill fallback when teardown fails; preserve the evidence and report unconfirmed release.

For a focused change, run the smallest relevant checks. Before a release, run the complete command above on Windows and inspect the working differences. A skipped Windows integration test on another OS is not a Windows pass.

## Reporting and reviewing changes

Describe the trigger, expected behavior, actual result and a synthetic reproduction. Include OS/runtime versions and meaningful test output; remove personal paths and identifiers. Never attach `.task-resource-guard`, a real registration, capability, .env, cookie/profile or private logs.

Security-sensitive reports follow [SECURITY.md](SECURITY.md); do not expose vulnerabilities or personal email in public Issues.

Contributors must have permission to share their material under the project's MIT license. Keep upstream notices where required; undocumented local source is not automatically available for relicensing. Do not add a CLA or make licensing promises on behalf of the maintainer.

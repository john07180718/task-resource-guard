# Task Resource Guard v0.1.0-alpha.1

**Prepared release notes. This file does not mean a tag or release has been published.**

Task Resource Guard helps task-owned development tools close normally when their work is done. This first alpha is intended for developers evaluating a cooperative lifecycle helper and an opt-in Windows Node.js service adapter.

## Included

- `withOwnedResource`: await the work and its normal close, including failure handling that retains both errors when needed.
- Opt-in registration for private Windows Node.js development services, with identity checks, work tracking, expiry/idleness conditions and a synchronous safety callback.
- A cleanup CLI that defaults to inspection and requests normal shutdown only with explicit apply.
- An isolated registered-service walkthrough showing an idle HTTP service closing while a busy HTTP service is preserved.
- English and Traditional Chinese quickstarts, project artwork and guided feedback forms.
- CI definitions for portable checks and Windows integration. Check the actual [CI run](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml) for the commit selected for release; the presence of a workflow alone is not evidence of success.

## Try it

Read the [English quickstart](https://github.com/john07180718/task-resource-guard/blob/codex/initial-publication/docs/QUICKSTART.md) or [繁體中文快速開始](https://github.com/john07180718/task-resource-guard/blob/codex/initial-publication/docs/QUICKSTART.zh-TW.md). Use a local Windows environment with Node.js 24 and PowerShell 7 for the registered-service demo. No npm install, cloud account or API key is needed.

Running a demo is separate from installing the Skill or integrating a real development service. The demos create their own resources and do not adopt existing processes.

## Known limits

- Registered-service cleanup is Windows-only and requires access to the required CIM identity queries and private local state.
- Every real work/queue/write/download/login entry point must be correctly covered by the service's adapter. The toolkit cannot infer a service's unfinished work automatically.
- There is no force termination, existing-process adoption, production/shared-service management, universal MCP integration or Codex memory-leak fix.
- The optional scheduler's actual installation, triggering and removal are not covered by this release's automated tests unless the validation record explicitly states otherwise.
- No measured RAM, speed, cost or Token savings, independent user count or production-readiness claim is made.

See [VALIDATION.md](https://github.com/john07180718/task-resource-guard/blob/codex/initial-publication/VALIDATION.md) for dated evidence, environments and remaining gaps, and [SECURITY.md](https://github.com/john07180718/task-resource-guard/blob/codex/initial-publication/SECURITY.md) for reporting boundaries. Please use [Issues](https://github.com/john07180718/task-resource-guard/issues/new/choose) for synthetic bug reports and voluntary usage feedback.

MIT licensed. Independent project; no affiliation with or endorsement by OpenAI, Codex or any other tool vendor is claimed.

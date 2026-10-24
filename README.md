# Task Resource Guard

Help task-private development tools finish their work and close their own resources normally.

[繁體中文](README.zh-TW.md) · [Installation](INSTALL.md) · [Integration](skills/task-resource-guard/references/usage.md) · [Test evidence](VALIDATION.md)

**MIT licensed. Initial source candidate; no tagged release yet.** See [LICENSE](LICENSE) and [PROVENANCE.md](PROVENANCE.md). This is an independent project, with no claimed affiliation or endorsement by OpenAI, Codex or any other tool vendor.

## The problem

An AI-assisted development session can create preview servers, test workers and automation tools. If their lifecycle is unclear, they may remain after the job finishes. Closing everything called `node` or a browser name can interrupt another project, a pending write or a login.

Task Resource Guard makes ownership and unfinished work explicit. It offers a small lifecycle helper and an opt-in service adapter, plus a Skill that tells an agent when each is appropriate.

## What you get

| Component | What it does |
| --- | --- |
| `withOwnedResource` | Awaits work, then awaits one normal close. Failed work still triggers close; two failures retain both errors. |
| Cooperative service registration | A Windows Node development service registers itself, exposes its real work state and supplies its normal shutdown callback. |
| Cleanup CLI | Defaults to dry-run. Apply requires verified identity, expiration, idleness and a synchronous safety check, with checks repeated before shutdown. |
| Skill | Guides task-private ownership, busy-work protection, verification and honest reporting. |

This can make resource lifetimes predictable and reduce the need to guess which development processes are disposable. There is no measured promise of RAM, speed, cost or token savings.

## Try the isolated example

From the package root, using an existing Node installation:

```powershell
node .\examples\scoped-resource.mjs
```

It creates a new private loopback listener, performs synthetic work and awaits normal close. It does not connect to external services, install anything or adopt existing processes.

Run the relevant offline tests:

```powershell
node --test --test-concurrency=1 .\tests\owned-resource.test.mjs .\tests\cli.test.mjs .\tests\metadata.test.mjs .\tests\registered-cleanup.test.mjs
```

The Windows integration test creates only its own synthetic children and private registry, exercises failure cases, then confirms normal exit. It uses CIM for the selected PIDs. Read [VALIDATION.md](VALIDATION.md) for results and untested conditions.

## Preview registered services

Registration is opt-in; downloading this project does not register or close your tools. First review the [adapter contract](skills/task-resource-guard/references/usage.md). Only integrate a development service you own and are authorized to modify.

These example paths must be replaced with an existing local workspace containing that service's entry point:

```powershell
$tool = '.\skills\task-resource-guard\scripts\cli.mjs'
$work = 'C:\Work\my-private-dev-tool'
$psExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source

# Explicit setup of a new private registry. Existing directories are not adopted.
node $tool --workspace $work --powershell $psExe --init

# Default: inspect only, with no shutdown request, registry writes or logs.
node $tool --workspace $work --powershell $psExe
```

An empty result is expected until an eligible service registers itself. A synthetic example of a preview result is:

```json
{"mode":"dry-run","counts":{"would-request-shutdown":1}}
```

This reports a candidate, not an exited process. Only after reviewing scope and authorizing cleanup should you add `--apply`. A service's TTL is a minimum eligibility condition, not a forced termination deadline.

Exit codes: `0` means the pass completed, including zero eligible services; `1` means it could not run safely; `2` means an invalid registration, identity mismatch, failed/blocked close or unconfirmed exit requires review. Output contains mode and event counts, not capabilities or command lines.

## Requirements and limits

- Registered cleanup: Windows, local disk, an existing Node installation and PowerShell 7, plus access to the required CIM identity queries. Tested on Windows build 26300, Node 24.16.0 and PowerShell 7.6.5. Other combinations are unverified.
- The scoped helper uses JavaScript only; cross-platform operation has not been tested. Python should use its native context managers; no Python wrapper is included.
- No extra npm packages, paid APIs, credentials, global configuration or background polling are required. Scheduled cleanup is a separate, optional choice; its manager defaults to preview.
- Every queue, download, write, login and work entry point must be protected by a correct adapter. The safety callback must be synchronous and side-effect-free. Invalid asynchronous results block cleanup, including rejected Promises.
- Identity/permission uncertainty, busy work or a failed close preserves the service. Successful shutdown acknowledgment is checked against OS identity; missing exit confirmation never triggers force termination.
- Registries contain private capabilities, SIDs and paths. They stay in the selected workspace's `.task-resource-guard` directory with restricted ACLs, and must not be uploaded. Stale records are retained; the current limit is 256 registrations.

The toolkit does not adopt arbitrary PIDs, kill by name, terminate process trees, delete files or browser data, or automatically restart services. It does not manage production/shared resources, automatically unload every MCP server, fix Codex memory leaks or protect against malicious software running as the same user. A crash or power loss may prevent finally from running.

## Project status

See [installation and removal](INSTALL.md), [security boundaries](SECURITY.md), [contributing](CONTRIBUTING.md), [roadmap](docs/ROADMAP.md), [release checklist](docs/RELEASE-CHECKLIST.md) and [unreleased changes](CHANGELOG.md).

Source repository: [john07180718/task-resource-guard](https://github.com/john07180718/task-resource-guard). General questions and reproducible bugs belong in [Issues](https://github.com/john07180718/task-resource-guard/issues); sensitive reports follow [SECURITY.md](SECURITY.md). No verified public adoption, tagged release or executed GitHub CI run is claimed. Support-program applications and benefits are separate from publishing this source.

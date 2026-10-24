# Continuous integration

The [CI workflow](../.github/workflows/ci.yml) runs on branch pushes, pull requests and manual dispatch. It has read-only repository permissions and does not publish releases, install a Skill, create schedules or contact real development services.

| Job | Scope |
| --- | --- |
| Ubuntu 24.04 / Node 24 | JavaScript syntax, scoped helper and CLI unit tests, Skill metadata, unsupported-platform handling, and the scoped-resource example. The Windows integration case is skipped. |
| Windows Server 2022 / Node 24 / runner-provided PowerShell 7 | Unit tests, isolated registered-cleanup integration, the complete registered-service demo, PowerShell syntax and the scoped-resource example. |

The workflow selects the actual `pwsh.exe` path for `TRG_TEST_POWERSHELL`. Windows tests create only their own synthetic children and registry. Passing them does not establish compatibility with every Windows version, permission setup or third-party adapter. Optional scheduled-task installation and real product integrations are outside this workflow.

## Check actual results

Open [Actions → CI](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml), choose a run for the commit you are reviewing, and inspect both jobs. The logs record the selected runtime versions. A workflow file or badge alone is not a claim that a run passed; current evidence belongs in [VALIDATION.md](../VALIDATION.md).

The Linux job has a five-minute limit and the Windows job ten minutes. Running jobs are not automatically cancelled by a newer commit, so a normal test teardown can finish. A hosted runner timeout is still a CI failure, not evidence of successful resource cleanup.

## Pinned actions

The following official action refs were resolved on 2026-10-24 and pinned to their immutable commit IDs:

- [`actions/checkout` v5](https://github.com/actions/checkout/commit/fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09): `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`.
- [`actions/setup-node` v5](https://github.com/actions/setup-node/commit/a0853c24544627f65ddf259abe73b1d18a591444): `a0853c24544627f65ddf259abe73b1d18a591444`.

Checkout does not persist credentials. Node package-manager caching is disabled; the project has no npm dependencies to install. GitHub's hosted runner and Node setup may download their own tooling; that is separate from the tool's local-only runtime behavior.

Reference: [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

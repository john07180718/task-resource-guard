# Continuous integration

The [CI workflow](../.github/workflows/ci.yml) runs on branch pushes, pull requests and manual dispatch. It has read-only repository permissions and does not publish releases, install a Skill, create schedules or contact real development services.

| Job | Scope |
| --- | --- |
| Ubuntu 24.04 / Node 24 | JavaScript syntax, scoped helper and CLI unit tests, Skill metadata, unsupported-platform handling, and the scoped-resource example. Windows integration runs in the Windows job. |
| Windows Server 2022 / Node 24 / runner-provided PowerShell 7 | PowerShell syntax; then unit tests, isolated registered-cleanup integration, the complete registered-service demo and the scoped-resource example under one temporary standard user. |

The workflow selects the actual `pwsh.exe` path for `TRG_TEST_POWERSHELL`. Windows tests create only their own synthetic children and registry. Passing them does not establish compatibility with every Windows version, permission setup or third-party adapter. Optional scheduled-task installation and real product integrations are outside this workflow.

Before Windows tests run, CI resolves `RUNNER_TEMP` to its canonical path, verifies it with the toolkit's existing `noLinks` check, and creates a fresh job-owned child directory. It verifies that child too, then sets `TEMP` and `TMP` for subsequent steps through `GITHUB_ENV`. This avoids a runner's short-path temporary-directory alias without weakening the toolkit's rejection of linked or redirected workspaces. Diagnostics report whether the previous default temporary path differed from its canonical path, and whether the runner path was canonical or an alias; they do not print either path. Test teardown continues to close its synthetic children normally and remove only its own temporary workspace; the enclosing job directory belongs to the disposable hosted runner.

## Standard-user Windows execution

GitHub's Windows hosted runners run as administrators with UAC disabled. In that environment, newly created child directories and files can be owned by the Administrators group, while this toolkit requires the current user's SID as owner. The CI setup keeps those owner checks intact.

The guarded [Windows test launcher](../.github/scripts/run-windows-tests.ps1) creates a uniquely named local account in the built-in Users group on the disposable hosted VM. Its cryptographically generated password stays in memory and is masked; it is never written to a file, environment variable or command line. The new account receives full control of only a fresh job-owned temp/log directory and read/execute access to the checkout. The launcher does not alter generated registry ownership or permissions.

`Start-Process -Credential -LoadUserProfile -Wait -PassThru` runs the whole Windows Node suite and scoped example as that account, using explicit Node and PowerShell executable paths. Before testing, the child verifies that it is not an administrator, checks that a directory it creates is owned by its current user, and applies the original `noLinks` check. Only boolean preflight results are printed, not SIDs. Captured test output and the actual process exit code determine CI success. After normal process-tree completion, only the newly created account is removed; no process is force-terminated. If completion is uncertain, the account is left for disposal with the ephemeral VM.

This validates standard-user behavior when the run passes. It does not establish support for elevated-administrator execution.

## Check actual results

Open [Actions → CI](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml), choose a run for the commit you are reviewing, and inspect both jobs. The logs record the selected runtime versions. A workflow file or badge alone is not a claim that a run passed; current evidence belongs in [VALIDATION.md](../VALIDATION.md).

The Linux job has a five-minute limit and the Windows job ten minutes. Running jobs are not automatically cancelled by a newer commit, so a normal test teardown can finish. A hosted runner timeout is still a CI failure, not evidence of successful resource cleanup.

## Pinned actions

The following official action refs were resolved on 2026-10-24 and pinned to their immutable commit IDs:

- [`actions/checkout` v5](https://github.com/actions/checkout/commit/fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09): `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`.
- [`actions/setup-node` v5](https://github.com/actions/setup-node/commit/a0853c24544627f65ddf259abe73b1d18a591444): `a0853c24544627f65ddf259abe73b1d18a591444`.

Checkout does not persist credentials. Node package-manager caching is disabled; the project has no npm dependencies to install. GitHub's hosted runner and Node setup may download their own tooling; that is separate from the tool's local-only runtime behavior.

Reference: [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

Windows references: [GitHub-hosted runner privileges](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process), [New-LocalUser](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.localaccounts/new-localuser).

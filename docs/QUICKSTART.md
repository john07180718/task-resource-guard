# Quick start

[繁體中文](QUICKSTART.zh-TW.md) · [Back to the project](../README.md)

Start with the examples, then choose whether to install the Skill or integrate a service. These are separate steps: running a demo does not modify your agent configuration or register an existing tool.

## 1. Prepare the Windows walkthrough

Use a normal PowerShell terminal and a local directory you own.

| Requirement | Why it is needed |
| --- | --- |
| Windows and a local, non-redirected workspace | Registered cleanup uses Windows process identity and named pipes |
| Node.js 24 | Runs the JavaScript tools and examples |
| PowerShell 7, available as `pwsh.exe` | Queries the selected processes and verifies private registry permissions |
| Git | Downloads the source using the commands below |
| Access to the required CIM identity queries | Lets the tool verify the services it created |

Check the tools already installed on your computer:

```powershell
node --version
pwsh --version
git --version
```

The walkthrough does not install these tools, change PowerShell execution policy, or elevate permissions. There are no extra npm packages, API keys, or paid services. See [validation](../VALIDATION.md) for actual test environments; this guide does not certify every version combination.

Download the project into a directory that does not already contain a `task-resource-guard` checkout:

```powershell
git clone https://github.com/john07180718/task-resource-guard.git
cd task-resource-guard
```

Run the remaining commands from this repository root. A source download from GitHub's **Code → Download ZIP** is an alternative to Git; extract it before continuing.

## 2. See a resource close after its work

```powershell
node examples/scoped-resource.mjs
```

The example creates its own listener on `127.0.0.1`, completes synthetic work, and waits for the supported close method. It does not connect to an external service.

On success, the output is:

```text
Private example resource closed normally.
```

This demonstrates the `withOwnedResource` helper. A normal close is attempted even if the work throws; when both fail, both errors are retained. The result concerns only the resource created by this example.

## 3. See busy work protected during registered cleanup

**Windows only.** This example creates a fresh temporary workspace and two private HTTP child services. It deliberately runs preview and apply against those services so you can see the complete workflow.

```powershell
node examples/registered-demo.mjs
```

If PowerShell 7 is not on `PATH`, pass the trusted executable's full path, replacing this example path:

```powershell
node examples/registered-demo.mjs --powershell 'C:\Program Files\PowerShell\7\pwsh.exe'
```

The walkthrough checks these stages:

| Stage | What to look for |
| --- | --- |
| Create | Two private services start; one has a real HTTP request still in progress |
| Preview | The idle service is eligible; both services remain running |
| First apply | The idle service closes normally; the busy service remains running |
| Finish work | The held request completes, then a second apply closes the remaining service |
| Teardown | Both child exits are verified and the demo's temporary workspace is removed |

The demo uses short eligibility timings for its synthetic services. Those are demonstration settings, not recommendations for your own tools. The general cleanup CLI defaults to dry-run; `--apply` is always an explicit choice there.

Successful completion demonstrates this isolated scenario. It does not certify a real MCP server, browser, production service, or your own adapter. Normal teardown cannot be guaranteed after a crash or power loss. If an exit cannot be confirmed, the tool reports the condition instead of force-killing a process.

## 4. Choose your next step

### Use the resource helper in code

Import `withOwnedResource` from `skills/task-resource-guard/scripts/owned-resource.mjs`. Supply a creator for a **new task-private resource**, a function that awaits the full task, and the resource's normal close method. Use the [scoped example](../examples/scoped-resource.mjs) as the small reference implementation.

### Install the AI Skill

Follow [installation and removal](../INSTALL.md) to copy the complete `skills/task-resource-guard` folder to the selected Codex home. Keep its scripts, references, and license together. Compare an existing destination before making changes.

This makes the instructions and scripts available to the agent. It does not automatically register your services, create a cleanup schedule, or change global rules. Scheduled cleanup is a separate optional step described in that guide.

### Integrate your own development service

Use the [adapter contract](../skills/task-resource-guard/references/usage.md). Each service must explicitly register, track its full work lifecycle, synchronously confirm that it can stop, and provide its own normal shutdown callback. Include queued work, downloads, writes, and logins in that design.

Use only an independent task-private development service you own and are authorized to modify. Do not integrate production or shared services. The service entry point must be inside the selected local workspace.

With `C:\Work\my-private-dev-tool` replaced by that existing workspace, initialize a **new** private registry:

```powershell
$workspace = 'C:\Work\my-private-dev-tool'
$tool = '.\skills\task-resource-guard\scripts\cli.mjs'
$powerShellExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source
node $tool --workspace $workspace --powershell $powerShellExe --init
```

Initialization refuses an existing directory. Start your integrated service so that it can register itself, then preview:

```powershell
node $tool --workspace $workspace --powershell $powerShellExe
```

The preview makes no shutdown request, registry modification, or persistent log. An empty result is expected until a service registers and meets all eligibility conditions. After reviewing the scope, request cleanup only when you intend to close eligible services:

```powershell
node $tool --workspace $workspace --powershell $powerShellExe --apply
```

The service is checked again before shutdown. TTL expiration is a minimum condition for inspection, not a forced-stop deadline. The current registration defaults are six hours before eligibility and fifteen minutes of idleness; adapters can select their own values.

## If something does not work

| Result | Next check |
| --- | --- |
| `node`, `pwsh`, or `git` is not found | Check your existing installation and terminal `PATH`; the project does not install prerequisites |
| Registered demo reports an unsupported platform | Run this walkthrough on Windows; check the separate platform evidence for the scoped helper |
| No eligible services | Confirm the service opted in, its work is tracked, its TTL passed, and it has been idle long enough |
| CLI stops safely | Check the explicit workspace, existing private registry, PowerShell path, CIM access, and filesystem permissions |
| Close failed or exit not confirmed | Inspect the service's normal shutdown behavior; there is no force-termination fallback |

CLI exit codes: **0** means the pass completed, including no eligible services; **1** means it could not run safely; **2** means a registration, identity, close, or exit-confirmation result requires review. These are CLI codes; the examples report their own success or failure.

Keep `.task-resource-guard` private. It contains control capabilities, user identifiers, and local paths; do not commit it or attach it to an Issue. Old registration records are retained for review, rather than automatically deleted by the cleanup CLI.

Questions or a reproducible failure? Open an [Issue](https://github.com/john07180718/task-resource-guard/issues) with your OS, Node and PowerShell versions, command, and sanitized output. Sensitive reports should follow [SECURITY.md](../SECURITY.md).

[Validation](../VALIDATION.md) · [Contributing](../CONTRIBUTING.md) · [Release status](https://github.com/john07180718/task-resource-guard/releases)

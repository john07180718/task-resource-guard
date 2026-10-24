param(
    [switch]$Worker,
    [string]$NodeExe,
    [string]$PowerShellExe,
    [string]$Repository,
    [string]$JobDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This account setup is only for the disposable GitHub-hosted Windows VM.
if (-not $IsWindows -or $env:GITHUB_ACTIONS -ne 'true' -or
    $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'This script requires a disposable GitHub-hosted Windows runner.'
}
if (-not $Repository) { $Repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
if (-not $NodeExe) { $NodeExe = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source }
if (-not $PowerShellExe) { $PowerShellExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source }
foreach ($executable in @($NodeExe, $PowerShellExe)) {
    if (-not [IO.Path]::IsPathRooted($executable) -or -not (Test-Path -LiteralPath $executable -PathType Leaf)) {
        throw 'An explicit installed Node or PowerShell executable is unavailable.'
    }
}
Set-Location -LiteralPath $Repository

if ($Worker) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'The test worker must be a standard user.'
    }
    if (-not $JobDirectory -or -not (Test-Path -LiteralPath $JobDirectory -PathType Container)) {
        throw 'The dedicated CI job directory is unavailable.'
    }
    $temporary = Join-Path $JobDirectory 'temp'
    if (Test-Path -LiteralPath $temporary) { throw 'Refusing to adopt an existing test temporary directory.' }
    New-Item -ItemType Directory -Path $temporary | Out-Null
    $owner = (Get-Acl -LiteralPath $temporary).GetOwner([Security.Principal.SecurityIdentifier])
    if ($owner.Value -ne $identity.User.Value) { throw 'Standard-user ownership preflight failed.' }
    $env:TEMP = $temporary
    $env:TMP = $temporary
    $env:TRG_TEST_POWERSHELL = $PowerShellExe
    & $NodeExe --input-type=module -e "import { noLinks } from './skills/task-resource-guard/scripts/common.mjs'; await noLinks(process.argv[1]);" $temporary
    if ($LASTEXITCODE -ne 0) { throw 'Standard-user temporary path verification failed.' }
    Write-Output 'Standard-user preflight: non-admin=true; created-directory owner matches current user=true.'
    & $NodeExe --test --test-concurrency=1 tests/owned-resource.test.mjs tests/cli.test.mjs tests/metadata.test.mjs tests/registered-cleanup.test.mjs tests/registered-demo.test.mjs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $NodeExe examples/scoped-resource.mjs
    exit $LASTEXITCODE
}

$runnerIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ([Security.Principal.WindowsPrincipal]::new($runnerIdentity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'The hosted-runner setup process requires its normal administrator privileges.'
}
$userName = 'trg' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$createdUser = $null
$launchAttempted = $false
$completed = $false
$resultCode = 1
$JobDirectory = Join-Path $env:TEMP ('standard-user-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $JobDirectory | Out-Null
& $NodeExe --input-type=module -e "import { noLinks } from './skills/task-resource-guard/scripts/common.mjs'; await noLinks(process.argv[1]);" $JobDirectory
if ($LASTEXITCODE -ne 0) { throw 'Job-owned temporary path verification failed.' }
$stdoutFile = Join-Path $JobDirectory 'stdout.log'
$stderrFile = Join-Path $JobDirectory 'stderr.log'

try {
    if (Get-LocalUser -Name $userName -ErrorAction SilentlyContinue) { throw 'Refusing to adopt an existing local account.' }
    $randomPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)) + '!a7'
    Write-Output "::add-mask::$randomPassword"
    $securePassword = ConvertTo-SecureString $randomPassword -AsPlainText -Force
    $randomPassword = $null
    $createdUser = New-LocalUser -Name $userName -Password $securePassword -Description 'Disposable Task Resource Guard CI test account'
    $usersGroup = Get-LocalGroup -SID 'S-1-5-32-545'
    if (-not (Get-LocalGroupMember -Group $usersGroup | Where-Object { $_.SID -eq $createdUser.SID })) {
        Add-LocalGroupMember -Group $usersGroup -Member $createdUser
    }

    # Full control is granted only on the fresh temp/log root. The checkout
    # needs read/execute access; generated registries keep their original ACLs.
    foreach ($target in @(
        @{ Path = $JobDirectory; Rights = 'FullControl' },
        @{ Path = $Repository; Rights = 'ReadAndExecute' }
    )) {
        $acl = Get-Acl -LiteralPath $target.Path
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($createdUser.SID, $target.Rights, 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
        Set-Acl -LiteralPath $target.Path -AclObject $acl
    }
    $credential = [Management.Automation.PSCredential]::new(($env:COMPUTERNAME + '\' + $userName), $securePassword)
    # Windows paths cannot contain a quote; reject it rather than building an
    # ambiguous native argument string. No credentials enter this string.
    foreach ($value in @($PSCommandPath, $NodeExe, $PowerShellExe, $Repository, $JobDirectory)) {
        if ($value.Contains('"') -or $value.Contains("`n") -or $value.Contains("`r")) { throw 'Invalid CI argument path.' }
    }
    $arguments = '-NoLogo -NoProfile -NonInteractive -File "' + $PSCommandPath + '" -Worker -NodeExe "' + $NodeExe + '" -PowerShellExe "' + $PowerShellExe + '" -Repository "' + $Repository + '" -JobDirectory "' + $JobDirectory + '"'
    Write-Output 'Launching the Windows suite under a fresh standard user.'
    $launchAttempted = $true
    $process = Start-Process -FilePath $PowerShellExe -ArgumentList $arguments -Credential $credential -LoadUserProfile -WorkingDirectory $Repository -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile -Wait -PassThru
    $process.Refresh()
    $completed = $process.HasExited
    if (-not $completed -or $null -eq $process.ExitCode) { throw 'The test process completion or exit code was not confirmed.' }
    $resultCode = [int]$process.ExitCode
} finally {
    try {
        if (Test-Path -LiteralPath $stdoutFile) { Get-Content -LiteralPath $stdoutFile }
        if (Test-Path -LiteralPath $stderrFile) { Get-Content -LiteralPath $stderrFile | ForEach-Object { [Console]::Error.WriteLine($_) } }
    } finally {
        if ($createdUser -and ($completed -or -not $launchAttempted)) {
            # Remove only the new account, after the process tree has returned.
            # The hosted VM owns the enclosing temp/log directory and user profile.
            Remove-LocalUser -SID $createdUser.SID
            Write-Output 'The temporary standard-user account was removed; no processes were force-terminated.'
        } elseif ($createdUser) {
            Write-Output 'Process completion was not confirmed; the temporary account is left for disposal with the hosted runner.'
        }
    }
}
exit $resultCode

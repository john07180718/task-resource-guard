[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^TaskResourceGuard-[A-Za-z0-9-]{1,40}$')][string]$TaskName,
    [Parameter(Mandatory)][string]$Workspace,
    [Parameter(Mandatory)][string]$NodeExe,
    [Parameter(Mandatory)][string]$PowerShellExe,
    [ValidateSet('Install','Remove')][string]$Action = 'Install',
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
function Resolve-LocalPath([string]$Value, [bool]$Directory) {
    if ($Value -notmatch '^[A-Za-z]:[\\/]' -or $Value.Substring(2).Contains(':')) { throw 'Use an absolute local path' }
    $full = [IO.Path]::GetFullPath($Value)
    $item = Get-Item -LiteralPath $full -Force
    if ($item.PSIsContainer -ne $Directory) { throw 'Wrong path type' }
    $cursor = $full
    while ($cursor) {
        if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected paths are not allowed' }
        $cursor = Split-Path -Parent $cursor
    }
    return $full
}
$workspacePath = Resolve-LocalPath $Workspace $true
if ($workspacePath -eq [IO.Path]::GetPathRoot($workspacePath)) { throw 'Do not use a drive root' }
$nodePath = Resolve-LocalPath $NodeExe $false
$psPath = Resolve-LocalPath $PowerShellExe $false
$cliPath = Resolve-LocalPath (Join-Path $PSScriptRoot 'cli.mjs') $false
$arguments = '"{0}" --workspace "{1}" --powershell "{2}" --apply' -f $cliPath, $workspacePath, $psPath
$marker = 'Task Resource Guard cooperative cleanup v0.1-local. Opt-in current-user task.'
if (-not $Apply) {
    [pscustomobject]@{ Mode='Preview'; Action=$Action; TaskName=$TaskName; Execute=$nodePath; Arguments=$arguments; IntervalHours=6; Changed=$false } | ConvertTo-Json -Compress
    return
}
$existing = Get-ScheduledTask -TaskPath '\' -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Action -eq 'Install') {
    if ($existing) { throw 'Task exists; refusing to replace it' }
    if (-not (Test-Path -LiteralPath (Join-Path $workspacePath '.task-resource-guard\services') -PathType Container)) { throw 'Initialize and review the private registry first' }
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $principal = New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Limited
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(10) -RepetitionInterval (New-TimeSpan -Hours 6)
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
    $taskAction = New-ScheduledTaskAction -Execute $nodePath -Argument $arguments -WorkingDirectory $workspacePath
    Register-ScheduledTask -TaskPath '\' -TaskName $TaskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Description $marker | Out-Null
} else {
    if (-not $existing) { throw 'No matching task exists; nothing removed' }
    $actions = @($existing.Actions)
    if ($existing.Description -ne $marker -or $actions.Count -ne 1 -or $actions[0].Execute -ne $nodePath -or $actions[0].Arguments -ne $arguments) { throw 'Task identity differs; nothing removed' }
    Unregister-ScheduledTask -TaskPath '\' -TaskName $TaskName -Confirm:$false
}
[pscustomobject]@{ Mode='Apply'; Action=$Action; TaskName=$TaskName; Changed=$true } | ConvertTo-Json -Compress

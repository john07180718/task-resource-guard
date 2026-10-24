param([Parameter(Mandatory)][string]$Ids)
$ErrorActionPreference = 'Stop'
if ($Ids -notmatch '^\d+(,\d+)*$') { throw 'Invalid PID list' }
$wanted = @($Ids.Split(',') | ForEach-Object { [int]$_ })
$filter = ($wanted | ForEach-Object { "ProcessId = $_" }) -join ' OR '
$services = @(Get-CimInstance Win32_Service -Filter $filter)
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$result = @(Get-CimInstance Win32_Process -Filter $filter | ForEach-Object {
    $targetId = $_.ProcessId
    $owner = Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid
    if ($owner.ReturnValue -ne 0 -or -not $_.ExecutablePath -or -not $_.CreationDate) { throw 'Identity unavailable' }
    [pscustomobject]@{
        pid = [int]$_.ProcessId
        name = $_.Name
        path = $_.ExecutablePath
        started = $_.CreationDate.ToUniversalTime().ToString('o')
        ownerSid = $owner.Sid
        currentUser = ($owner.Sid -eq $currentSid)
        systemService = [bool]($services | Where-Object ProcessId -EQ $targetId)
    }
})
ConvertTo-Json -InputObject $result -Compress

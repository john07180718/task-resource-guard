param([Parameter(Mandatory)][string]$Path, [switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$full = [IO.Path]::GetFullPath($Path)
$cursor = $full
while ($cursor) {
    $item = Get-Item -LiteralPath $cursor -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked state path rejected' }
    $cursor = Split-Path -Parent $cursor
}
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
if (-not $VerifyOnly) {
    if ((Split-Path -Leaf $full) -ne '.task-resource-guard') { throw 'Only a new registry root can be protected' }
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($who in @($sid, $system)) {
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($who, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $full -AclObject $acl
}
$actual = Get-Acl -LiteralPath $full
if ($actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'Registry owner mismatch' }
$rules = @($actual.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
$ownFullControl = $false
foreach ($rule in $rules) {
    if ($rule.AccessControlType -eq 'Allow') {
        if ($rule.IdentityReference.Value -notin @($sid.Value, $system.Value)) { throw 'Registry allows another principal' }
        if ($rule.IdentityReference.Value -eq $sid.Value -and ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl) { $ownFullControl = $true }
    }
}
if (-not $ownFullControl) { throw 'Registry permissions unavailable' }

param(
    [Parameter(Mandatory)]
    [ValidateSet('Save', 'Copy')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'This password store requires Windows.'
}

$store = Join-Path (Split-Path -Parent $PSScriptRoot) '.local-secrets'
$file = Join-Path $store 'database-password.dpapi'

if ($Action -eq 'Copy') {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw 'No saved password. Run this script with -Action Save first.'
    }
    $encrypted = [IO.File]::ReadAllText($file)
    $password = ConvertTo-SecureString -String $encrypted
    try {
        Set-Clipboard -Value ([Net.NetworkCredential]::new('', $password).Password)
    } finally {
        $password.Dispose()
    }
    Write-Host 'Password copied to the clipboard.'
    return
}

if ((Test-Path -LiteralPath $file) -and (Read-Host 'Replace the saved password? [y/N]') -ne 'y') {
    return
}

$password = Read-Host 'Enter the Supabase database password' -AsSecureString
try {
    if ($password.Length -eq 0) {
        throw 'Password is empty.'
    }
    $encrypted = ConvertFrom-SecureString -SecureString $password
} finally {
    $password.Dispose()
}

[void][IO.Directory]::CreateDirectory($store)
$temporary = Join-Path $store ([Guid]::NewGuid().ToString('N') + '.tmp')
try {
    [IO.File]::WriteAllText($temporary, $encrypted)
    Move-Item -LiteralPath $temporary -Destination $file -Force
} finally {
    if (Test-Path -LiteralPath $temporary) {
        Remove-Item -LiteralPath $temporary
    }
}
Write-Host 'Password encrypted and saved for this Windows user.'

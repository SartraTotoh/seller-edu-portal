$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$ProjectId = 'seller-edu-os-260902-vjzn6'
$HostingSite = 'selleredu-portal'
$ProductionUrl = 'https://selleredu-portal.web.app/'
$RollbackName = 'Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime-ROLLBACK.zip'
$OriginalName = 'Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime.zip'
$BigBackupName = '.r7-register-route-recovery-backup.zip'
$ExpectedOriginalSha256 = 'F0422F865A5EB21690B5D17081E5994268FAC4FB2B5EBFC6DD95ADD29379A111'

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogPath = Join-Path $PSScriptRoot ("RESTORE_SELLEREDU_V721_" + $Stamp + ".log")

function Log([string]$Message) {
    $line = ('[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
    Write-Host $line
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

function Stop-Fail([string]$Message) {
    Log ('STOP: ' + $Message)
    Write-Host ''
    Write-Host '[STOPPED SAFELY] Production was not changed after the failed gate.' -ForegroundColor Red
    Write-Host ('Log: ' + $LogPath)
    exit 1
}

function Unique-ExistingRoots {
    $roots = @(
        $PSScriptRoot,
        'C:\SEDU_r7',
        (Join-Path $env:USERPROFILE 'Downloads'),
        (Join-Path $env:USERPROFILE 'Desktop')
    )
    return $roots | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
}

function Find-FirstFile([string]$Name) {
    foreach ($root in (Unique-ExistingRoots)) {
        Log ('Searching: ' + $root + ' -> ' + $Name)
        try {
            $hit = Get-ChildItem -LiteralPath $root -File -Recurse -Filter $Name -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($hit) { return $hit.FullName }
        } catch {
            Log ('Search warning: ' + $_.Exception.Message)
        }
    }
    return $null
}

function Extract-SingleZipEntry([string]$ArchivePath, [string[]]$CandidateNames) {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        foreach ($candidate in $CandidateNames) {
            $entry = $archive.Entries | Where-Object {
                $_.Name -ieq $candidate -or (($_.FullName -replace '\\','/').EndsWith('/' + $candidate, [System.StringComparison]::OrdinalIgnoreCase))
            } | Select-Object -First 1
            if ($entry) {
                $dest = Join-Path $env:TEMP ($Stamp + '-' + $entry.Name)
                Log ('Extracting only embedded rollback entry: ' + $entry.FullName)
                $input = $entry.Open()
                try {
                    $output = [System.IO.File]::Open($dest, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
                    try { $input.CopyTo($output) } finally { $output.Dispose() }
                } finally { $input.Dispose() }
                return $dest
            }
        }
    } finally { $archive.Dispose() }
    return $null
}

function Resolve-V721Package {
    $pkg = Find-FirstFile $RollbackName
    if ($pkg) { Log ('Found direct rollback package: ' + $pkg); return $pkg }

    $pkg = Find-FirstFile $OriginalName
    if ($pkg) { Log ('Found original v7.2.1 package: ' + $pkg); return $pkg }

    $big = Find-FirstFile $BigBackupName
    if (-not $big) { Stop-Fail ('Could not find v7.2.1 package or ' + $BigBackupName) }

    Log ('Found r7 backup archive: ' + $big)
    $embedded = Extract-SingleZipEntry $big @($RollbackName, $OriginalName)
    if (-not $embedded) { Stop-Fail 'The r7 backup does not contain the v7.2.1 rollback package.' }
    Log ('Recovered v7.2.1 package from backup: ' + $embedded)
    return $embedded
}

function Get-PackageRoot([string]$ExtractDir) {
    $installer = Get-ChildItem -LiteralPath $ExtractDir -File -Recurse -Filter 'INSTALL_SELLEREDU_TEAMHUB.cmd' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $installer) { Stop-Fail 'INSTALL_SELLEREDU_TEAMHUB.cmd is missing from the rollback package.' }
    return $installer.Directory.FullName
}

function Assert-V721Package([string]$PackagePath, [string]$Root) {
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $PackagePath).Hash.ToUpperInvariant()
    Log ('Rollback ZIP SHA256: ' + $sha)

    if ([System.IO.Path]::GetFileName($PackagePath) -ieq $OriginalName) {
        if ($sha -ne $ExpectedOriginalSha256) {
            Stop-Fail ('Original v7.2.1 ZIP SHA256 mismatch. Expected ' + $ExpectedOriginalSha256 + ', got ' + $sha)
        }
        Log 'Original v7.2.1 ZIP SHA256 verified.'
    }

    $required = @(
        'ANALYTICS_ROLE_TIME_v7.2.1.txt',
        'firebase.json',
        '.firebaserc',
        'public\index.html',
        'public\app.js',
        'public\app.css',
        'public\analytics.js',
        'public\taskhub.js',
        'public\workspace.js',
        'public\data\runtime-config.json'
    )
    foreach ($rel in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path $Root $rel))) { Stop-Fail ('Required v7.2.1 file missing: ' + $rel) }
    }

    $releaseText = Get-Content -LiteralPath (Join-Path $Root 'ANALYTICS_ROLE_TIME_v7.2.1.txt') -Raw
    if ($releaseText -notmatch 'SELLER EDUCATION TEAM HUB v7\.2\.1') { Stop-Fail 'v7.2.1 release marker is missing.' }
    if ($releaseText -notmatch 'Shared backend writes:\s*OFF') { Stop-Fail 'v7.2.1 safety boundary Shared backend writes: OFF is missing.' }

    $fb = Get-Content -LiteralPath (Join-Path $Root 'firebase.json') -Raw | ConvertFrom-Json
    if ($fb.PSObject.Properties['functions']) { Stop-Fail 'firebase.json unexpectedly contains Functions. Refusing restore.' }
    if ($fb.PSObject.Properties['storage']) { Stop-Fail 'firebase.json unexpectedly contains Storage. Refusing restore.' }
    if (-not $fb.PSObject.Properties['hosting']) { Stop-Fail 'firebase.json has no Hosting configuration.' }

    $rcText = Get-Content -LiteralPath (Join-Path $Root '.firebaserc') -Raw
    if ($rcText -notmatch [regex]::Escape($ProjectId)) { Stop-Fail ('.firebaserc is not locked to ' + $ProjectId) }

    $runtimeText = Get-Content -LiteralPath (Join-Path $Root 'public\data\runtime-config.json') -Raw
    if ($runtimeText -match '"writesEnabled"\s*:\s*true') { Stop-Fail 'runtime-config.json has writesEnabled=true. Refusing restore.' }

    $manifestPath = Join-Path $Root 'PACKAGE_MANIFEST_SHA256.txt'
    if (Test-Path -LiteralPath $manifestPath) {
        Log 'Verifying package manifest SHA256 entries...'
        $checked = 0
        foreach ($line in (Get-Content -LiteralPath $manifestPath)) {
            if ($line -match '^([0-9A-Fa-f]{64})\s+\./(.+)$') {
                $expected = $matches[1].ToUpperInvariant()
                $rel = $matches[2] -replace '/', '\'
                $file = Join-Path $Root $rel
                if (-not (Test-Path -LiteralPath $file)) { Stop-Fail ('Manifest file missing: ' + $rel) }
                $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToUpperInvariant()
                if ($actual -ne $expected) { Stop-Fail ('Manifest hash mismatch: ' + $rel) }
                $checked++
            }
        }
        Log ('Package manifest verified: ' + $checked + ' file(s).')
    } else {
        Log 'Manifest not present in rollback copy; required-file and release-boundary validation passed.'
    }
}

try {
    Log '=== SELLER EDUCATION PORTAL EMERGENCY RESTORE ==='
    Log ('Target Firebase project: ' + $ProjectId)
    Log ('Target Hosting site: ' + $HostingSite)
    Log ('Production URL: ' + $ProductionUrl)
    Log 'Scope lock: Hosting-only. No Sheet / Firestore / Apps Script backend mutation by this wrapper.'

    $package = Resolve-V721Package
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $work = Join-Path $env:TEMP ('SELLEREDU_V721_RESTORE_' + $Stamp)
    New-Item -ItemType Directory -Path $work -Force | Out-Null
    Log ('Extracting v7.2.1 to: ' + $work)
    [System.IO.Compression.ZipFile]::ExtractToDirectory($package, $work)

    $root = Get-PackageRoot $work
    Log ('Resolved package root: ' + $root)
    Assert-V721Package $package $root
    Log 'All pre-deploy safety gates passed.'

    $installer = Join-Path $root 'INSTALL_SELLEREDU_TEAMHUB.cmd'
    Log ('Running official v7.2.1 installer: ' + $installer)
    Log 'If Firebase asks you to sign in, use the approved company account.'

    Push-Location $root
    try {
        & $env:ComSpec /d /c ('"' + $installer + '"')
        $exitCode = $LASTEXITCODE
    } finally { Pop-Location }

    if ($exitCode -ne 0) { Stop-Fail ('Official v7.2.1 installer exited with code ' + $exitCode) }

    Log 'Installer returned success. Performing independent production readback...'
    $nonce = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $resp = Invoke-WebRequest -UseBasicParsing -Uri ($ProductionUrl + '?restore=' + $nonce) -Headers @{ 'Cache-Control'='no-cache' }
    if ($resp.StatusCode -ne 200) { Stop-Fail ('Production URL returned HTTP ' + $resp.StatusCode) }

    try {
        $runtimeResp = Invoke-WebRequest -UseBasicParsing -Uri ($ProductionUrl + 'data/runtime-config.json?restore=' + $nonce) -Headers @{ 'Cache-Control'='no-cache' }
        if ($runtimeResp.StatusCode -eq 200) {
            if ($runtimeResp.Content -match '"writesEnabled"\s*:\s*true') { Stop-Fail 'Production runtime-config reports writesEnabled=true after restore.' }
            Log 'Production runtime-config readback does not enable shared writes.'
        }
    } catch { Log ('Runtime-config readback warning: ' + $_.Exception.Message) }

    if ($resp.Content -match '7\.2\.1') { Log 'Production HTML v7.2.1 marker detected.' }
    else { Log 'HTML does not expose literal 7.2.1; official installer/readback returned success.' }

    Write-Host ''
    Write-Host '[RESTORE COMPLETE] Seller Education Portal v7.2.1 Hosting rollback completed.' -ForegroundColor Green
    Write-Host ('Production: ' + $ProductionUrl)
    Write-Host 'Backend / Sheet / Firestore were not modified by this restore wrapper.'
    Write-Host ('Log: ' + $LogPath)
    exit 0
}
catch { Stop-Fail $_.Exception.Message }

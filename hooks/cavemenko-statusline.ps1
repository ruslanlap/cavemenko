$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".cavemenko-active"
$StatsFile = Join-Path $ClaudeDir ".cavemenko-stats"
if (-not (Test-Path $Flag)) { exit 0 }

# Refuse reparse points (symlinks / junctions) and oversized files
try {
    $Item = Get-Item -LiteralPath $Flag -Force -ErrorAction Stop
    if ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { exit 0 }
    if ($Item.Length -gt 64) { exit 0 }
} catch {
    exit 0
}

$Mode = ""
try {
    $Raw = Get-Content -LiteralPath $Flag -TotalCount 1 -ErrorAction Stop
    if ($null -ne $Raw) { $Mode = ([string]$Raw).Trim() }
} catch {
    exit 0
}

# Strip non-alpha, whitelist validate
$Mode = $Mode.ToLowerInvariant()
$Mode = ($Mode -replace '[^a-z0-9-]', '')

$Valid = @('off','lite','full','ultra','commit','review','compress','translate')
if (-not ($Valid -contains $Mode)) { exit 0 }

# Read token savings counter
$Saved = ""
if ((Test-Path $StatsFile) -and -not ((Get-Item -LiteralPath $StatsFile -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    try {
        $RawSaved = (Get-Content -LiteralPath $StatsFile -TotalCount 1 -ErrorAction Stop)
        if ($null -ne $RawSaved) {
            $NumSaved = ($RawSaved -replace '[^0-9]', '')
            if ($NumSaved -match '^\d+$' -and [int]$NumSaved -gt 0) {
                if ([int]$NumSaved -ge 1000) {
                    $K = [math]::Floor([int]$NumSaved / 1000)
                    $Saved = " ↓${K}k"
                } else {
                    $Saved = " ↓${NumSaved}"
                }
            }
        }
    } catch {}
}

$Esc = [char]27
if ([string]::IsNullOrEmpty($Mode) -or $Mode -eq "full") {
    [Console]::Write("${Esc}[38;5;172m[CAVEMENKO${Saved}]${Esc}[0m")
} else {
    $Suffix = $Mode.ToUpperInvariant()
    [Console]::Write("${Esc}[38;5;172m[CAVEMENKO:${Suffix}${Saved}]${Esc}[0m")
}

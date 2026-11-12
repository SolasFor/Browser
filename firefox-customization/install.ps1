<#
.SYNOPSIS
    Автоматическая установка и обновление Firefox Customization (SolasFor/Browser).

.DESCRIPTION
    Находит активный профиль Firefox через profiles.ini (или использует -ProfilePath),
    создаёт резервную копию существующей папки chrome, устанавливает тему копированием
    или симлинком/junction (-Mode Link для автообновления через git pull) и при указании
    флага -WithUserJs подключает шаблон user.js с базовыми настройками about:config.

.EXAMPLE
    .\install.ps1
    Копирует папку chrome в основной профиль Firefox с резервной копией и записывает user.js.

.EXAMPLE
    .\install.ps1 -Mode Link -WithUserJs
    Подключает папку chrome через Junction (без прав администратора), чтобы git pull сразу обновлял тему.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProfilePath,

    [Parameter(Mandatory = $false)]
    [ValidateSet("Copy", "Link")]
    [string]$Mode = "Copy",

    [Parameter(Mandatory = $false)]
    [switch]$WithUserJs,

    [Parameter(Mandatory = $false)]
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SourceChrome = Join-Path $ScriptDir "chrome"
$SourceUserJs = Join-Path $ScriptDir "user.js"

if (-not (Test-Path -LiteralPath $SourceChrome)) {
    throw "Не найдена исходная папка темы: $SourceChrome"
}

function Get-FirefoxProfiles {
    $ffRoot = Join-Path $env:APPDATA "Mozilla\Firefox"
    $iniPath = Join-Path $ffRoot "profiles.ini"
    if (-not (Test-Path -LiteralPath $iniPath)) {
        return @()
    }

    $sections = @()
    $current = $null
    foreach ($rawLine in Get-Content -LiteralPath $iniPath -Encoding UTF8) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith(";") -or $line.StartsWith("#")) { continue }
        if ($line -match '^\[(.+)\]$') {
            if ($null -ne $current) { $sections += $current }
            $current = @{ Section = $Matches[1] }
            continue
        }
        if ($null -ne $current -and $line -match '^([^=]+)=(.*)$') {
            $current[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
    if ($null -ne $current) { $sections += $current }

    $installDefaultRel = $null
    foreach ($sec in $sections) {
        if ($sec.Section -like "Install*" -and $sec.ContainsKey("Default") -and $sec["Default"]) {
            $installDefaultRel = $sec["Default"]
            break
        }
    }

    $profiles = @()
    foreach ($sec in $sections) {
        if ($sec.Section -notlike "Profile*" -or -not $sec.ContainsKey("Path")) { continue }
        $rel = $sec["Path"]
        $isRel = ($sec["IsRelative"] -ne "0")
        $full = if ($isRel) { Join-Path $ffRoot ($rel -replace '/', '\') } else { $rel -replace '/', '\' }
        if (-not (Test-Path -LiteralPath $full)) { continue }

        $isPreferred = ($null -ne $installDefaultRel -and $rel -eq $installDefaultRel) -or
                       ($null -eq $installDefaultRel -and $sec["Default"] -eq "1") -or
                       ($full -like "*.default-release")

        $profiles += [PSCustomObject]@{
            Name        = if ($sec.ContainsKey("Name")) { $sec["Name"] } else { Split-Path -Leaf $full }
            Relative    = $rel
            FullPath    = (Resolve-Path -LiteralPath $full).Path
            IsPreferred = [bool]$isPreferred
        }
    }
    return $profiles
}

$TargetProfile = $null
if ($ProfilePath) {
    if (-not (Test-Path -LiteralPath $ProfilePath)) {
        throw "Указанная папка профиля не существует: $ProfilePath"
    }
    $TargetProfile = (Resolve-Path -LiteralPath $ProfilePath).Path
} else {
    $discovered = @(Get-FirefoxProfiles)
    if ($discovered.Count -eq 0) {
        throw "Профили Firefox не найдены в %APPDATA%\Mozilla\Firefox. Укажите путь вручную: .\install.ps1 -ProfilePath 'C:\путь\к\профилю'"
    }

    $preferred = $discovered | Where-Object { $_.IsPreferred } | Select-Object -First 1
    if (-not $preferred) { $preferred = $discovered[0] }

    if ($NonInteractive -or $discovered.Count -eq 1) {
        $TargetProfile = $preferred.FullPath
    } else {
        Write-Host "`nНайденные профили Firefox:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $discovered.Count; $i++) {
            $mark = if ($discovered[$i].FullPath -eq $preferred.FullPath) { " [рекомендуется]" } else { "" }
            Write-Host ("  [{0}] {1} — {2}{3}" -f ($i + 1), $discovered[$i].Name, $discovered[$i].FullPath, $mark)
        }
        $choice = Read-Host "`nВыберите номер профиля (Enter — по умолчанию $($preferred.Name))"
        if ([string]::IsNullOrWhiteSpace($choice)) {
            $TargetProfile = $preferred.FullPath
        } else {
            $idx = 0
            if (-not [int]::TryParse($choice, [ref]$idx) -or $idx -lt 1 -or $idx -gt $discovered.Count) {
                throw "Некорректный выбор профиля: $choice"
            }
            $TargetProfile = $discovered[$idx - 1].FullPath
        }
    }
}

$ffRunning = Get-Process -Name "firefox" -ErrorAction SilentlyContinue
if ($ffRunning) {
    Write-Warning "Обнаружен запущенный процесс Firefox. Изменения userChrome.css и user.js вступят в силу после перезапуска браузера."
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$DestChrome = Join-Path $TargetProfile "chrome"
$ResolvedSourceChrome = (Resolve-Path -LiteralPath $SourceChrome).Path

if (Test-Path -LiteralPath $DestChrome) {
    $item = Get-Item -LiteralPath $DestChrome -Force
    $alreadyLinkedHere = $false
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        $target = $item.Target
        if ($target -is [array]) { $target = $target[0] }
        if ($target -and ((Resolve-Path -LiteralPath $target -ErrorAction SilentlyContinue).Path -eq $ResolvedSourceChrome)) {
            $alreadyLinkedHere = $true
        }
    }

    if ($alreadyLinkedHere -and $Mode -eq "Link") {
        Write-Host "Папка chrome уже подключена ссылкой к этому репозиторию: $DestChrome" -ForegroundColor Green
    } else {
        $backupChrome = Join-Path $TargetProfile "chrome.backup-$Timestamp"
        Move-Item -LiteralPath $DestChrome -Destination $backupChrome -Force
        Write-Host "Создана резервная копия прежней папки chrome: $backupChrome" -ForegroundColor Yellow
    }
}

if (-not (Test-Path -LiteralPath $DestChrome)) {
    if ($Mode -eq "Link") {
        New-Item -ItemType Junction -Path $DestChrome -Target $ResolvedSourceChrome | Out-Null
        Write-Host "Создана связь (Junction) chrome -> $ResolvedSourceChrome" -ForegroundColor Green
    } else {
        Copy-Item -LiteralPath $ResolvedSourceChrome -Destination $DestChrome -Recurse -Force
        Write-Host "Файлы chrome скопированы в профиль: $DestChrome" -ForegroundColor Green
    }
}

$shouldInstallUserJs = $WithUserJs.IsPresent
if (-not $shouldInstallUserJs -and -not $NonInteractive -and (Test-Path -LiteralPath $SourceUserJs)) {
    $ans = Read-Host "Установить базовый user.js (включает поддержку таблиц стилей и SVG-иконок)? [Y/n]"
    if ([string]::IsNullOrWhiteSpace($ans) -or $ans -match '^(y|yes|д|да)$') {
        $shouldInstallUserJs = $true
    }
}

if ($shouldInstallUserJs -and (Test-Path -LiteralPath $SourceUserJs)) {
    $DestUserJs = Join-Path $TargetProfile "user.js"
    if (Test-Path -LiteralPath $DestUserJs) {
        $backupUserJs = Join-Path $TargetProfile "user.js.backup-$Timestamp"
        Copy-Item -LiteralPath $DestUserJs -Destination $backupUserJs -Force
        Write-Host "Сохранена резервная копия user.js: $backupUserJs" -ForegroundColor Yellow
    }
    Copy-Item -LiteralPath $SourceUserJs -Destination $DestUserJs -Force
    Write-Host "Установлен файл настроек: $DestUserJs" -ForegroundColor Green
}

Write-Host "`nГотово! Перезапустите Firefox, чтобы применить оформление." -ForegroundColor Cyan

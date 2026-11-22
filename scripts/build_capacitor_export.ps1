# StatXam Automated Capacitor Export & Android APK Compiler
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       StatXam Static Export & Native APK Build" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = (Get-Item -Path $PSScriptRoot\..).FullName
Set-Location $rootDir

# 1. Clean previous build caches
Write-Host "[1/6] Cleaning stale build caches..." -ForegroundColor Yellow
if (Test-Path "$rootDir\.next") {
    Remove-Item -Recurse -Force "$rootDir\.next"
}
if (Test-Path "$rootDir\out") {
    Remove-Item -Recurse -Force "$rootDir\out"
}

# 2. Temporarily isolate dynamic API routes during static HTML export
$apiDir = "$rootDir\app\api"
$tempApiDir = "$rootDir\api_temp"

try {
    if (Test-Path $apiDir) {
        Write-Host "[2/6] Shelving dynamic API routes for static HTML export..." -ForegroundColor Yellow
        Move-Item -Path $apiDir -Destination $tempApiDir -Force
    }

    # 3. Export Next.js static site to out/
    Write-Host "[3/6] Running Next.js static export (STATIC_EXPORT=true)..." -ForegroundColor Yellow
    $env:STATIC_EXPORT = "true"
    & npx next build

    if ($LASTEXITCODE -ne 0) {
        throw "Next.js build failed with exit code $LASTEXITCODE"
    }

} finally {
    # Always restore app/api directory
    if (Test-Path $tempApiDir) {
        Write-Host "--> Restoring dynamic API routes..." -ForegroundColor Cyan
        if (Test-Path $apiDir) {
            Remove-Item -Recurse -Force $apiDir
        }
        Move-Item -Path $tempApiDir -Destination $apiDir -Force
    }
}

if (-not (Test-Path "$rootDir\out\index.html")) {
    throw "Static export missing out\index.html!"
}
Write-Host "✓ Static export generated cleanly in out/" -ForegroundColor Green

# 4. Sync assets to Capacitor Android
Write-Host "[4/6] Syncing static web assets to Capacitor Android..." -ForegroundColor Yellow
& npx cap sync android

if ($LASTEXITCODE -ne 0) {
    throw "Capacitor sync failed with exit code $LASTEXITCODE"
}

# 5. Compile Native Debug APK with Gradle
Write-Host "[5/6] Compiling Native Android APK with Gradle..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\i.adil\AppData\Local\Android\Sdk"
$javaBin = Join-Path $env:JAVA_HOME "bin"
$env:PATH = "$javaBin;" + $env:PATH

$androidDir = Join-Path $rootDir "android"
Set-Location $androidDir
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -ne 0) {
    throw "Gradle assembleDebug failed with exit code $LASTEXITCODE"
}

Set-Location $rootDir

# 6. Copy compiled APK to public/ for instant download/testing
Write-Host "[6/6] Packaging and publishing APK..." -ForegroundColor Yellow
$apkSource = "$rootDir\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "$rootDir\public\statxam.apk"

if (Test-Path $apkSource) {
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    $apkInfo = Get-Item $apkDest
    $apkMb = [math]::Round($apkInfo.Length / 1MB, 2)

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "✓ Native APK compiled successfully!" -ForegroundColor Green
    Write-Host "  Location: $apkDest" -ForegroundColor White
    Write-Host "  Size:     $apkMb MB" -ForegroundColor White
    Write-Host "  Updated:  $($apkInfo.LastWriteTime)" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    throw "APK output not found at $apkSource"
}

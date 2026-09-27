# Script để test app locally với backup database
# Usage: .\tools\test-fixtures\test-local.ps1

param(
    [switch]$SkipRestore
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$CoreDir = Join-Path $RepoRoot "core"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Local Testing Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
$EnvFile = Join-Path $CoreDir ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create $EnvFile from .env.example" -ForegroundColor Red
    exit 1
}

# Check if DB_PASSWORD is set
$EnvContent = Get-Content $EnvFile -Raw
if ($EnvContent -match "DB_PASSWORD=\s*$") {
    Write-Host "WARNING: DB_PASSWORD is empty in .env" -ForegroundColor Yellow
    Write-Host "Please update core/.env with your MySQL password" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Step 1: Restore database (optional)
if (-not $SkipRestore) {
    Write-Host "Step 1: Restore database" -ForegroundColor Cyan
    Write-Host "Running restore-db.ps1..." -ForegroundColor Gray
    Write-Host ""
    
    & "$ScriptDir\restore-db.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Database restore failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
} else {
    Write-Host "Step 1: SKIPPED (using existing database)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Run migration
Write-Host "Step 2: Run migration" -ForegroundColor Cyan
Set-Location $CoreDir

npm run migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    Write-Host "Check your database connection in .env" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Run database structure check
Write-Host "Step 3: Check database structure" -ForegroundColor Cyan
Set-Location $RepoRoot

node core/scripts/check-db-structure.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database check failed or has warnings" -ForegroundColor Yellow
} else {
    Write-Host "✓ Database structure looks good" -ForegroundColor Green
}

Write-Host ""

# Step 4: Start server
Write-Host "Step 4: Start server" -ForegroundColor Cyan
Write-Host "Starting TCKT Activity Hub on port 3000..." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

Set-Location $CoreDir
npm start

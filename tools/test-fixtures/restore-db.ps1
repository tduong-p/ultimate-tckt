# Script để restore database từ backup
# Usage: .\tools\test-fixtures\restore-db.ps1

param(
    [string]$BackupFile = "backup_current.sql",
    [string]$DbName = "ultimate_tckt",
    [string]$DbUser = "root"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$BackupPath = Join-Path $ScriptDir "sql\mysql\$BackupFile"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Database Restore Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "Database: $DbName" -ForegroundColor Yellow
Write-Host "User: $DbUser" -ForegroundColor Yellow
Write-Host ""

# Check if backup file exists
if (-not (Test-Path $BackupPath)) {
    Write-Host "ERROR: Backup file not found!" -ForegroundColor Red
    Write-Host "Path: $BackupPath" -ForegroundColor Red
    exit 1
}

$FileSize = (Get-Item $BackupPath).Length / 1KB
Write-Host "Backup size: $([math]::Round($FileSize, 2)) KB" -ForegroundColor Green
Write-Host ""

# Prompt for password
Write-Host "Enter MySQL password for user '$DbUser':" -ForegroundColor Yellow
$SecurePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Step 1: Dropping and recreating database..." -ForegroundColor Cyan

# Drop and create database
$SqlCommands = @"
DROP DATABASE IF EXISTS $DbName;
CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"@

$SqlCommands | mysql -u $DbUser -p"$Password" 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to drop/create database" -ForegroundColor Red
    Write-Host "Check your password and MySQL connection" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database recreated successfully" -ForegroundColor Green
Write-Host ""

# Restore backup
Write-Host "Step 2: Restoring backup..." -ForegroundColor Cyan
Write-Host "This may take a few seconds..." -ForegroundColor Gray

Get-Content $BackupPath | mysql -u $DbUser -p"$Password" $DbName 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restore backup" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Backup restored successfully" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "Step 3: Verifying..." -ForegroundColor Cyan

$VerifyQuery = "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = '$DbName';"
$TableCount = echo $VerifyQuery | mysql -u $DbUser -p"$Password" -N 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Found $TableCount tables in database" -ForegroundColor Green
} else {
    Write-Host "⚠ Could not verify (but restore likely succeeded)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Database restored!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update core/.env with your MySQL password" -ForegroundColor White
Write-Host "2. Run: cd core && npm run migrate" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
Write-Host ""

# Reset Database Script
# This script drops and recreates the database to fix schema conflicts

Write-Host "🔄 Resetting database..." -ForegroundColor Yellow

# Load environment variables
$envPath = Join-Path $PSScriptRoot "..\..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$dbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "root" }
$dbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
$dbName = if ($env:DB_DATABASE) { $env:DB_DATABASE } else { "literature_review_db" }

# Try to find MySQL executable
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.x\bin\mysql.exe",
    "mysql"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path -ErrorAction SilentlyContinue) {
        $mysqlExe = $path
        break
    } elseif ($path -eq "mysql") {
        try {
            $null = Get-Command mysql -ErrorAction Stop
            $mysqlExe = "mysql"
            break
        } catch {
            continue
        }
    }
}

if (-not $mysqlExe) {
    Write-Host "❌ MySQL không tìm thấy trong PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vui lòng thực hiện thủ công:" -ForegroundColor Yellow
    Write-Host "1. Mở MySQL Workbench hoặc command line tool" -ForegroundColor Cyan
    Write-Host "2. Chạy lệnh sau:" -ForegroundColor Cyan
    Write-Host "   DROP DATABASE IF EXISTS $dbName;" -ForegroundColor White
    Write-Host "   CREATE DATABASE $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor White
    Write-Host ""
    Write-Host "Hoặc thêm MySQL vào PATH của Windows" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Tìm thấy MySQL: $mysqlExe" -ForegroundColor Green

# Drop database
Write-Host "🗑️  Dropping database '$dbName'..." -ForegroundColor Yellow
$dropCmd = "DROP DATABASE IF EXISTS ``$dbName``;"
if ($dbPass) {
    & $mysqlExe -u $dbUser -p$dbPass -h $dbHost -P $dbPort -e $dropCmd 2>&1 | Out-Null
} else {
    & $mysqlExe -u $dbUser -h $dbHost -P $dbPort -e $dropCmd 2>&1 | Out-Null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi drop database!" -ForegroundColor Red
    exit 1
}

# Create database
Write-Host "📦 Creating database '$dbName'..." -ForegroundColor Yellow
$createCmd = "CREATE DATABASE ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($dbPass) {
    & $mysqlExe -u $dbUser -p$dbPass -h $dbHost -P $dbPort -e $createCmd 2>&1 | Out-Null
} else {
    & $mysqlExe -u $dbUser -h $dbHost -P $dbPort -e $createCmd 2>&1 | Out-Null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi tạo database!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Database reset successfully!" -ForegroundColor Green
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Run npm run start:dev to create tables" -ForegroundColor Yellow

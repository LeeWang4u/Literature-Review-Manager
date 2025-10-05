#!/usr/bin/env pwsh
# Script để setup database code-first cho Literature Review Backend

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Literature Review - Database Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  File .env không tồn tại!" -ForegroundColor Yellow
    Write-Host "📝 Tạo file .env từ .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Đã tạo file .env" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  VUI LÒNG:" -ForegroundColor Yellow
    Write-Host "   1. Mở file .env" -ForegroundColor White
    Write-Host "   2. Cập nhật DB_PASSWORD với mật khẩu MySQL của bạn" -ForegroundColor White
    Write-Host "   3. Kiểm tra các thông số khác (DB_HOST, DB_PORT, DB_USERNAME)" -ForegroundColor White
    Write-Host "   4. Chạy lại script này" -ForegroundColor White
    Write-Host ""
    
    # Mở file .env bằng notepad
    $response = Read-Host "Bạn có muốn mở file .env ngay bây giờ? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        notepad .env
    }
    exit
}

Write-Host "✅ File .env đã tồn tại" -ForegroundColor Green
Write-Host ""

# Đọc cấu hình từ .env
Write-Host "📖 Đọc cấu hình database..." -ForegroundColor Cyan
Get-Content .env | Where-Object { $_ -match "^DB_" } | ForEach-Object {
    Write-Host "   $_" -ForegroundColor Gray
}
Write-Host ""

# Kiểm tra MySQL connection
Write-Host "🔌 Kiểm tra kết nối MySQL..." -ForegroundColor Cyan
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
$mysqlCheck = Get-Command mysql -ErrorAction SilentlyContinue

if (-not $mysqlCheck) {
    Write-Host "❌ Không tìm thấy MySQL client!" -ForegroundColor Red
    Write-Host "   Vui lòng cài đặt MySQL hoặc thêm vào PATH" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Bạn có muốn tiếp tục (bỏ qua kiểm tra MySQL)? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        exit
    }
} else {
    Write-Host "✅ MySQL client đã sẵn sàng" -ForegroundColor Green
}
Write-Host ""

# Menu lựa chọn
Write-Host "Chọn hành động:" -ForegroundColor Cyan
Write-Host "  1. Tạo database + Chạy app (Recommended)" -ForegroundColor White
Write-Host "  2. Chỉ tạo database" -ForegroundColor White
Write-Host "  3. Chỉ chạy app (tự động tạo DB nếu chưa có)" -ForegroundColor White
Write-Host "  4. Reset database (XÓA toàn bộ data)" -ForegroundColor Red
Write-Host "  5. Thoát" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Nhập lựa chọn (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Tạo database + Chạy app..." -ForegroundColor Green
        Write-Host ""
        npm run db:setup
    }
    "2" {
        Write-Host ""
        Write-Host "🗄️  Tạo database..." -ForegroundColor Green
        Write-Host ""
        npm run db:create
        Write-Host ""
        Write-Host "✅ Hoàn tất! Chạy 'npm run start:dev' để start app" -ForegroundColor Green
    }
    "3" {
        Write-Host ""
        Write-Host "🚀 Chạy app..." -ForegroundColor Green
        Write-Host ""
        npm run start:dev
    }
    "4" {
        Write-Host ""
        Write-Host "⚠️  CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ DỮ LIỆU!" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Bạn có chắc chắn muốn tiếp tục? Nhập 'DELETE' để xác nhận"
        
        if ($confirm -eq "DELETE") {
            Write-Host ""
            Write-Host "🗑️  Đang reset database..." -ForegroundColor Yellow
            
            # Đọc DB config từ .env
            $envContent = Get-Content .env | Out-String
            $dbHost = if ($envContent -match 'DB_HOST=(.+)') { $matches[1].Trim() } else { "localhost" }
            $dbUser = if ($envContent -match 'DB_USERNAME=(.+)') { $matches[1].Trim() } else { "root" }
            $dbName = if ($envContent -match 'DB_DATABASE=(.+)') { $matches[1].Trim() } else { "literature_review_db" }
            $dbPassword = if ($envContent -match 'DB_PASSWORD=(.+)') { $matches[1].Trim() } else { "" }
            
            # Drop database
            $dropCmd = "DROP DATABASE IF EXISTS ``$dbName``;"
            
            if ($dbPassword) {
                mysql -h $dbHost -u $dbUser -p$dbPassword -e $dropCmd 2>$null
            } else {
                mysql -h $dbHost -u $dbUser -e $dropCmd 2>$null
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Database đã được xóa" -ForegroundColor Green
                Write-Host ""
                Write-Host "🗄️  Tạo lại database..." -ForegroundColor Cyan
                npm run db:create
                Write-Host ""
                Write-Host "✅ Database đã được reset! Chạy 'npm run start:dev' để tạo lại tables" -ForegroundColor Green
            } else {
                Write-Host "❌ Không thể xóa database. Vui lòng kiểm tra lại cấu hình." -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Hủy bỏ reset database" -ForegroundColor Yellow
        }
    }
    "5" {
        Write-Host ""
        Write-Host "👋 Tạm biệt!" -ForegroundColor Cyan
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ Lựa chọn không hợp lệ!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Hoàn tất!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Xem thêm hướng dẫn tại: CODE-FIRST-DB.md" -ForegroundColor Gray
Write-Host ""

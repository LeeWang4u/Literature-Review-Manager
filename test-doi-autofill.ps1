# Test DOI Auto-fill API - PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DOI Auto-fill API Test - Live Demo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test DOIs
$testDOIs = @(
    @{
        name = "Transformer Paper (ArXiv)"
        input = "https://arxiv.org/abs/1706.03762"
        expectedTitle = "Attention Is All You Need"
    },
    @{
        name = "Nature Paper"
        input = "10.1038/nature12373"
        expectedTitle = "Observational Evidence"
    },
    @{
        name = "DOI URL Format"
        input = "https://doi.org/10.1038/nature12373"
        expectedTitle = "Observational Evidence"
    }
)

Write-Host "Testing DOI Auto-fill Feature..." -ForegroundColor Yellow
Write-Host ""

# Test if backend is running
Write-Host "1. Checking if backend is running..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running. Please start with: npm run start:dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Note: You need to login first to get JWT token" -ForegroundColor Yellow
Write-Host "   Login at: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

# Prompt for JWT token
$token = Read-Host "Enter your JWT token (or press Enter to skip API test)"

if ($token) {
    Write-Host ""
    Write-Host "3. Testing DOI extraction..." -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($test in $testDOIs) {
        Write-Host "   Testing: $($test.name)" -ForegroundColor Yellow
        Write-Host "   Input: $($test.input)" -ForegroundColor Gray
        
        try {
            $body = @{
                input = $test.input
            } | ConvertTo-Json
            
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            $startTime = Get-Date
            
            $response = Invoke-RestMethod -Uri "http://localhost:3000/papers/extract-metadata" `
                -Method POST `
                -Headers $headers `
                -Body $body `
                -TimeoutSec 15
            
            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds
            
            Write-Host "   ✅ Success! ($([math]::Round($duration, 2))s)" -ForegroundColor Green
            Write-Host "   📄 Title: $($response.title.Substring(0, [Math]::Min(60, $response.title.Length)))..." -ForegroundColor White
            Write-Host "   👥 Authors: $($response.authors.Substring(0, [Math]::Min(50, $response.authors.Length)))..." -ForegroundColor White
            Write-Host "   📅 Year: $($response.publicationYear)" -ForegroundColor White
            
            if ($response.journal) {
                Write-Host "   📚 Journal: $($response.journal)" -ForegroundColor White
            }
            
            Write-Host ""
            
        } catch {
            Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
        }
        
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host ""
    Write-Host "Skipping API test. To test:" -ForegroundColor Yellow
    Write-Host "1. Login at: http://localhost:5173" -ForegroundColor White
    Write-Host "2. Open DevTools (F12) → Application → Local Storage" -ForegroundColor White
    Write-Host "3. Copy the 'access_token' value" -ForegroundColor White
    Write-Host "4. Run this script again and paste the token" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "4. Manual Testing Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Step 1: Open http://localhost:5173" -ForegroundColor White
Write-Host "✅ Step 2: Login with your account" -ForegroundColor White
Write-Host "✅ Step 3: Click 'Papers' → 'Add Paper'" -ForegroundColor White
Write-Host "✅ Step 4: Enter DOI in the 'DOI or URL' field:" -ForegroundColor White
Write-Host "           https://arxiv.org/abs/1706.03762" -ForegroundColor Yellow
Write-Host "✅ Step 5: Click 'Auto-fill' button" -ForegroundColor White
Write-Host "✅ Step 6: Watch the magic! 🪄" -ForegroundColor Magenta
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Loading spinner appears" -ForegroundColor White
Write-Host "- After 2-5 seconds: Success toast" -ForegroundColor White
Write-Host "- All form fields populated automatically" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Alternative: Test with Swagger UI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open: http://localhost:3000/api/docs" -ForegroundColor Yellow
Write-Host "Find: POST /papers/extract-metadata" -ForegroundColor White
Write-Host "Try it out with: https://arxiv.org/abs/1706.03762" -ForegroundColor White
Write-Host ""
Write-Host "Happy testing! 🎉" -ForegroundColor Green
Write-Host ""

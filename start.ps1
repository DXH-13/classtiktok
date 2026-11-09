# Khởi động ClassTikTok
Write-Host "🏫 Khởi động ClassTikTok..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '🚀 Backend đang chạy...' -ForegroundColor Green; npm run dev"

Start-Sleep 2

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host '🎨 Frontend đang chạy...' -ForegroundColor Blue; npm run dev"

Start-Sleep 3
Write-Host ""
Write-Host "✅ Đã khởi động!" -ForegroundColor Green
Write-Host "   Dashboard:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "   Backend API: http://localhost:3001/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Mở Dashboard và bắt đầu buổi học!" -ForegroundColor Cyan

# Khoi dong ClassTikTok
# (Khong dau + khong emoji: ban cu dung Write-Host co emoji ben trong lenh
# -Command cua Start-Process nen PowerShell 5.1 parse sai chuoi dan den loi
# "The string is missing the terminator" o 2 cua so con. Ban nay dung
# -WorkingDirectory thay cho cd '...' va lenh con chi con "npm run dev".)
Write-Host "Khoi dong ClassTikTok..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PSScriptRoot\backend"

Start-Sleep 2

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Start-Sleep 3
Write-Host ""
Write-Host "Da khoi dong!" -ForegroundColor Green
Write-Host "   Dashboard:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "   Backend API: http://localhost:3001/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Mo Dashboard va bat dau buoi hoc!" -ForegroundColor Cyan

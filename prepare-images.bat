@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to optimize the portfolio images.
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\sharp (
  echo Installing image optimizer...
  call npm install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
echo Optimizing portfolio images...
call npm run images
if errorlevel 1 exit /b 1
echo.
echo Done. Optimized WebP images and images.json manifests are ready in assets\.
pause

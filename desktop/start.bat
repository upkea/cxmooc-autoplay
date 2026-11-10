@echo off
title cxmooc-desktop
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo [ERROR] electron.exe not found. Run: node get-electron-bin.js
  pause
  exit /b 1
)
set CX_USER_DATA=D:\work\cxmooc-desktop\userdata
set CX_SOFT_RENDER=1
if not exist "%CX_USER_DATA%" mkdir "%CX_USER_DATA%"
echo Starting app...
"node_modules\electron\dist\electron.exe" . --no-sandbox --no-zygote --disable-gpu-compositing --use-angle=d3d11-warp-webgl --disable-crash-reporter --disable-features=NetworkServiceSandbox --user-data-dir="%CX_USER_DATA%" --enable-logging=file --log-file=D:\work\cxmooc-desktop\chromium.log --v=0
if errorlevel 1 (
  echo.
  echo [FAILED] exit code = %errorlevel%
  echo - If another instance is running: kill all electron.exe in Task Manager, then retry
  echo - Send me everything printed above
  pause
)
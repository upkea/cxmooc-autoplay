@echo off
title cxmooc-desktop (GPU mode)
cd /d "D:\work\cxmooc-desktop"
if not exist "node_modules\electron\dist\electron.exe" (
  echo [ERROR] electron.exe not found
  pause
  exit /b 1
)
set CX_USER_DATA=D:\work\cxmooc-desktop\userdata
set CX_SOFT_RENDER=0
if not exist "%CX_USER_DATA%" mkdir "%CX_USER_DATA%"
echo Starting app with default rendering (hardware video decode)...
del /q "D:\work\cxmooc-desktop\chromium.log" 2>nul
"node_modules\electron\dist\electron.exe" . --no-sandbox --no-zygote --user-data-dir="%CX_USER_DATA%" --enable-logging=file --log-file=D:\work\cxmooc-desktop\chromium.log --v=0
if errorlevel 1 (
  echo [FAILED] exit=%errorlevel% - this machine needs software rendering, use the normal launcher bat
  pause
)
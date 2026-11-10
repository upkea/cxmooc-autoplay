@echo off
set LOG=D:\work\cxmooc-desktop\launch.log
set UD=D:\work\cxmooc-desktop\userdata
echo ======================================>> "%LOG%"
echo %date% %time%>> "%LOG%"
cd /d "D:\work\cxmooc-desktop"
if not exist "node_modules\electron\dist\electron.exe" (
  echo [ERROR] electron.exe not found>> "%LOG%"
  echo [ERROR] electron.exe not found
  pause
  exit /b 1
)
if not exist "%UD%" mkdir "%UD%"
del /q "D:\work\cxmooc-desktop\chromium.log" 2>nul
echo launching now (will wait 12s)...
"node_modules\electron\dist\electron.exe" . --no-sandbox --no-zygote --disable-gpu-compositing --use-angle=d3d11-warp-webgl --disable-crash-reporter --disable-features=NetworkServiceSandbox --user-data-dir="%UD%" --enable-logging=file --log-file=D:\work\cxmooc-desktop\chromium.log --v=0
set EL=%errorlevel%
echo launch-return=%EL%>> "%LOG%"
timeout /t 12 /nobreak >nul
echo ---- electron processes after 12s ---- >> "%LOG%"
tasklist /fi "imagename eq electron.exe" >> "%LOG%" 2>&1
echo ---- end ---- >> "%LOG%"
echo.
echo return-code=%EL%
echo electron.exe processes:
tasklist /fi "imagename eq electron.exe"
echo.
echo [A] a NEW electron.exe (start time = now) = APP IS RUNNING, check taskbar/tray
echo [B] still no new one = reply "done3" and keep this window open
pause
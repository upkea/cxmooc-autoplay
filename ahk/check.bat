@echo off
setlocal
cd /d "%~dp0"
set "AHK64=%ProgramFiles%\AutoHotkey\AutoHotkey64.exe"
if not exist "%AHK64%" set "AHK64=%ProgramFiles%\AutoHotkey\AutoHotkey.exe"
if not exist "%AHK64%" (
    echo AutoHotkey v2 not found. Download: https://www.autohotkey.com/
    pause
    exit /b 1
)
start "" "%AHK64%" "%~dp0cxmooc-autoclick.ahk" --dry
timeout /t 3 >nul
type "%~dp0cxmooc-autoclick.log"
pause

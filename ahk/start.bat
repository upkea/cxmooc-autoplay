@echo off
setlocal
cd /d "%~dp0"
set "AHK64=%ProgramFiles%\AutoHotkey\AutoHotkey64.exe"
set "AHK32=%ProgramFiles%\AutoHotkey\AutoHotkey.exe"
if exist "%AHK64%" (
    start "" "%AHK64%" "%~dp0cxmooc-autoclick.ahk"
    exit /b 0
)
if exist "%AHK32%" (
    start "" "%AHK32%" "%~dp0cxmooc-autoclick.ahk"
    exit /b 0
)
echo AutoHotkey v2 not found.
echo Download: https://www.autohotkey.com/
pause

@echo off
REM ============================================
REM School Hub - Unblock Files (Batch Wrapper)
REM This script removes the "Mark of the Web" from downloaded files
REM ============================================

echo.
echo ============================================
echo School Hub - Unblocking Files
echo ============================================
echo.
echo This will remove Windows security blocks from downloaded files.
echo This is needed when you download the project as ZIP from GitHub.
echo.
echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

REM Get the script directory
set "SCRIPT_DIR=%~dp0"

REM Run PowerShell script to unblock files
powershell.exe -ExecutionPolicy Bypass -File "%SCRIPT_DIR%unblock-files.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to unblock files.
    echo.
    echo Alternative method:
    echo 1. Right-click each .bat and .vbs file
    echo 2. Select "Properties"
    echo 3. Check "Unblock" at the bottom
    echo 4. Click "OK"
    echo.
    pause
    exit /b 1
)

exit /b 0

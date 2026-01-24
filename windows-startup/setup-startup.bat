@echo off
REM ============================================
REM School Hub - Windows Startup Setup Helper
REM This script helps you set up automatic startup
REM ============================================

echo.
echo ============================================
echo School Hub - Windows Startup Setup
echo ============================================
echo.

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo This script will create a shortcut in your Windows Startup folder.
echo.
echo Startup folder location:
echo %STARTUP_DIR%
echo.
echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

REM Check if VBScript exists
if not exist "%SCRIPT_DIR%start-school-hub-silent.vbs" (
    echo ERROR: Could not find start-school-hub-silent.vbs
    echo Please make sure you're running this from the windows-startup folder.
    pause
    exit /b 1
)

REM Create shortcut using PowerShell
echo Creating shortcut in Startup folder...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTUP_DIR%\School Hub Startup.lnk'); $Shortcut.TargetPath = '%SCRIPT_DIR%start-school-hub-silent.vbs'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Description = 'Starts School Hub application on Windows startup'; $Shortcut.Save()"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create shortcut.
    echo Please create it manually by following the instructions in README.md
    pause
    exit /b 1
)

echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo A shortcut has been created in your Windows Startup folder.
echo The School Hub application will now start automatically when Windows boots.
echo.
echo To test:
echo 1. Restart your computer
echo 2. Wait 30-60 seconds for the application to start
echo 3. Open your browser and go to: http://localhost:3000
echo.
echo To remove automatic startup:
echo 1. Press Win+R, type: shell:startup
echo 2. Delete the "School Hub Startup" shortcut
echo.
pause

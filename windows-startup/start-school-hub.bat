@echo off
REM ============================================
REM School Hub - Windows Startup Script
REM This script starts the backend and frontend servers
REM ============================================

REM Set the project root directory
REM Update this path to match your actual project location
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

REM Set paths (adjust these if your Python/Node are in different locations)
REM You can find Python path by running: where python
REM You can find Node path by running: where node
set "PYTHON_PATH=python"
set "NODE_PATH=node"
set "NPM_PATH=npm"

REM Colors for output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

echo.
echo ============================================
echo Starting School Hub Application...
echo ============================================
echo.

REM Check if Python is available
%PYTHON_PATH% --version >nul 2>&1
if errorlevel 1 (
    echo %RED%ERROR: Python is not installed or not in PATH%NC%
    echo Please install Python or add it to your system PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
%NODE_PATH% --version >nul 2>&1
if errorlevel 1 (
    echo %RED%ERROR: Node.js is not installed or not in PATH%NC%
    echo Please install Node.js or add it to your system PATH
    pause
    exit /b 1
)

REM Wait a bit for system to fully boot (optional, remove if not needed)
timeout /t 5 /nobreak >nul

REM Start PostgreSQL service (if running as Windows service)
REM Uncomment the next line if PostgreSQL is installed as a Windows service
REM net start postgresql-x64-15 >nul 2>&1

REM Start Redis service (if running as Windows service)
REM Uncomment the next line if Redis is installed as a Windows service
REM net start redis >nul 2>&1

REM Start Backend Server
echo %GREEN%Starting Backend Server...%NC%
REM Check if virtual environment exists and activate it, otherwise use system Python
if exist "%PROJECT_ROOT%\backend\venv\Scripts\activate.bat" (
    start "School Hub Backend" cmd /k "cd /d %PROJECT_ROOT%\backend && call venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:8000"
) else (
    start "School Hub Backend" cmd /k "cd /d %PROJECT_ROOT%\backend && %PYTHON_PATH% manage.py runserver 0.0.0.0:8000"
)
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo %GREEN%Starting Frontend Server...%NC%
start "School Hub Frontend" cmd /k "cd /d %PROJECT_ROOT%\frontend && %NPM_PATH% run dev"
timeout /t 3 /nobreak >nul

echo.
echo %GREEN%============================================%NC%
echo %GREEN%School Hub is starting up!%NC%
echo %GREEN%============================================%NC%
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:8000/admin
echo.
echo The application windows will open automatically.
echo You can close this window - the servers will continue running.
echo.
echo To stop the servers, close the "School Hub Backend" and "School Hub Frontend" windows.
echo.

REM Keep window open for a moment to show messages
timeout /t 5 /nobreak >nul

REM Optionally minimize this window (uncomment if desired)
REM if not "%1"=="min" start /min cmd /c "%~0" min

exit /b 0

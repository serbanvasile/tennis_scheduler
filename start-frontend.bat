@echo off
REM Tennis Scheduler - Start Frontend Only
REM This script starts only the frontend UI server

echo ================================
echo Tennis Scheduler - Frontend Only
echo ================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo Project Root: %PROJECT_ROOT%
echo.

echo Starting Frontend UI Server...
cd /d "%PROJECT_ROOT%\Code\frontend"
if not exist package.json (
    echo ERROR: Frontend package.json not found
    pause
    exit /b 1
)

echo Frontend Path: %PROJECT_ROOT%\Code\frontend
npm run restart

pause
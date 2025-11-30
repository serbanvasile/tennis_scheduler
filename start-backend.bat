@echo off
REM Tennis Scheduler - Start Backend Only
REM This script starts only the backend API server

echo ================================
echo Tennis Scheduler - Backend Only
echo ================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo Project Root: %PROJECT_ROOT%
echo.

echo Starting Backend API Server...
cd /d "%PROJECT_ROOT%\Code\backend"
if not exist package.json (
    echo ERROR: Backend package.json not found
    pause
    exit /b 1
)

echo Backend Path: %PROJECT_ROOT%\Code\backend
npm run restart

pause
@echo off
REM Tennis Scheduler - Restart Both API and UI Servers
REM This script auto-detects the project folder and uses relative paths

echo ================================
echo Tennis Scheduler Server Manager
echo ================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo Project Root: %PROJECT_ROOT%
echo.

REM Stop any existing processes
echo [1/4] Stopping existing servers...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im expo.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Starting Backend API Server...
echo Backend Path: %PROJECT_ROOT%\Code\backend
cd /d "%PROJECT_ROOT%\Code\backend"
if not exist package.json (
    echo ERROR: Backend package.json not found in %PROJECT_ROOT%\Code\backend
    pause
    exit /b 1
)
start "Tennis API Server" cmd /k "npm run restart"

echo [3/4] Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend UI Server...
echo Frontend Path: %PROJECT_ROOT%\Code\frontend
cd /d "%PROJECT_ROOT%\Code\frontend"
if not exist package.json (
    echo ERROR: Frontend package.json not found in %PROJECT_ROOT%\Code\frontend
    pause
    exit /b 1
)
start "Tennis UI Server" cmd /k "npm run restart"

cd /d "%PROJECT_ROOT%"

echo.
echo ================================
echo Both servers are starting...
echo ================================
echo.
echo Backend API: http://localhost:3001
echo Frontend UI: http://localhost:8082 (or 8081)
echo.
echo Press any key to close this window...
pause >nul
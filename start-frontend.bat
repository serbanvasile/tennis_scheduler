@echo off
REM Tennis Scheduler - Start Frontend Only
REM This script starts only the frontend UI server
REM Usage: start-frontend.bat [web|metro]
REM   web   - (default) Starts frontend in web mode with LAN IP for browser testing
REM   metro - Starts frontend in metro/tunnel mode for Expo Go testing

echo ================================
echo Tennis Scheduler - Frontend Only
echo ================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

REM Set frontend mode (default: web)
set "FRONTEND_MODE=%~1"
if "%FRONTEND_MODE%"=="" set "FRONTEND_MODE=web"

REM Validate the mode parameter
if /i not "%FRONTEND_MODE%"=="web" if /i not "%FRONTEND_MODE%"=="metro" (
    echo ERROR: Invalid mode '%FRONTEND_MODE%'. Use 'web' or 'metro'.
    pause
    exit /b 1
)

REM Auto-detect LAN IP address for web mode
set "LAN_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "LAN_IP=%%a"
)
REM Trim leading space
set "LAN_IP=%LAN_IP: =%"

echo Project Root: %PROJECT_ROOT%
echo Frontend Mode: %FRONTEND_MODE%
if /i "%FRONTEND_MODE%"=="web" echo LAN IP: %LAN_IP%
echo.

echo Starting Frontend UI Server (%FRONTEND_MODE% mode)...
cd /d "%PROJECT_ROOT%\Code\frontend"
if not exist package.json (
    echo ERROR: Frontend package.json not found
    pause
    exit /b 1
)

echo Frontend Path: %PROJECT_ROOT%\Code\frontend

REM Start frontend based on mode
if /i "%FRONTEND_MODE%"=="web" (
    REM Pass LAN IP to frontend so it can connect to backend from mobile browser
    set EXPO_PUBLIC_API_HOST=%LAN_IP%
    npm run web
) else (
    npm run restart
)

pause
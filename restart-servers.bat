@echo off
setlocal enabledelayedexpansion
REM Tennis Scheduler - Restart Both API and UI Servers
REM This script auto-detects the project folder and uses relative paths
REM Usage: restart-servers.bat [web|metro] [--reset] [LAN_IP]
REM   web     - (default) Starts frontend in web mode with LAN IP for browser testing
REM   metro   - Starts frontend in metro/tunnel mode for Expo Go testing
REM   --reset - Resets the database on next app load (clears all data)
REM   LAN_IP  - Optional: manually specify your LAN IP (e.g., 192.168.0.103)

echo ================================
echo Tennis Scheduler Server Manager
echo ================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

REM Parse arguments - check for --reset flag
set "FRONTEND_MODE="
set "RESET_DB=false"
set "LAN_IP="

for %%a in (%*) do (
    if /i "%%a"=="--reset" (
        set "RESET_DB=true"
    ) else if /i "%%a"=="web" (
        set "FRONTEND_MODE=web"
    ) else if /i "%%a"=="metro" (
        set "FRONTEND_MODE=metro"
    ) else (
        REM Assume it's an IP address if not a known flag/mode
        set "LAN_IP=%%a"
    )
)

REM Default frontend mode to web
if "%FRONTEND_MODE%"=="" set "FRONTEND_MODE=web"

REM Validate the mode parameter
if /i not "%FRONTEND_MODE%"=="web" if /i not "%FRONTEND_MODE%"=="metro" (
    echo ERROR: Invalid mode '%FRONTEND_MODE%'. Use 'web' or 'metro'.
    echo Usage: restart-servers.bat [web^|metro] [--reset] [LAN_IP]
    echo   Example: restart-servers.bat metro --reset 192.168.0.103
    pause
    exit /b 1
)

REM Set LAN IP - if not provided by argument, auto-detect
if "%LAN_IP%"=="" (
    REM Auto-detect LAN IP address (takes last IPv4 which is often the WiFi)
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        set "LAN_IP=%%a"
    )
    REM Trim leading space
    set "LAN_IP=!LAN_IP: =!"
)

echo Project Root: %PROJECT_ROOT%
echo Frontend Mode: %FRONTEND_MODE%
echo LAN IP: %LAN_IP%
if "%RESET_DB%"=="true" (
    echo.
    echo *** DATABASE RESET REQUESTED ***
    echo The database will be cleared on next page load.
)
echo.

REM Stop any existing processes
echo [1/2] Stopping existing servers...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im expo.exe >nul 2>&1
timeout /t 2 /nobreak >nul

@REM echo [2/4] Starting Backend API Server...
@REM echo Backend Path: %PROJECT_ROOT%\Code\backend
@REM cd /d "%PROJECT_ROOT%\Code\backend"
@REM if not exist package.json (
@REM     echo ERROR: Backend package.json not found in %PROJECT_ROOT%\Code\backend
@REM     pause
@REM     exit /b 1
@REM )
@REM start "Tennis API Server" cmd /k "npm run restart"

@REM echo [3/4] Waiting for backend to initialize...
@REM timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend UI Server (%FRONTEND_MODE% mode)...
echo Frontend Path: %PROJECT_ROOT%\Code\frontend
cd /d "%PROJECT_ROOT%\Code\frontend"
if not exist package.json (
    echo ERROR: Frontend package.json not found in %PROJECT_ROOT%\Code\frontend
    pause
    exit /b 1
)

REM Start frontend based on mode
REM Note: Both modes need EXPO_PUBLIC_API_HOST so the phone app can reach the backend
if /i "%FRONTEND_MODE%"=="web" (
    start "Tennis UI Server" cmd /k "set EXPO_PUBLIC_API_HOST=%LAN_IP%&& set EXPO_PUBLIC_RESET_DATABASE=%RESET_DB%&& npm run web"
) else (
    REM Metro mode: API still needs to be reachable via LAN IP
    start "Tennis UI Server" cmd /k "set EXPO_PUBLIC_API_HOST=%LAN_IP%&& set EXPO_PUBLIC_RESET_DATABASE=%RESET_DB%&& npm run restart"
)

cd /d "%PROJECT_ROOT%"

echo.
echo ================================
echo Both servers are starting...
echo ================================
echo.
echo Backend API: http://%LAN_IP%:3001 (phone must be on same WiFi)
if /i "%FRONTEND_MODE%"=="web" (
    echo Frontend UI: http://%LAN_IP%:8081
    echo.
    echo Open this URL on your phone's browser:
    echo   http://%LAN_IP%:8081
) else (
    echo Frontend UI: Tunnel URL will appear in Metro console
    echo              Scan QR code with Expo Go
    echo.
    echo NOTE: Phone must be on same WiFi to reach the backend API!
)
echo.
echo Press any key to close this window...
pause >nul
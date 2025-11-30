@echo off
REM Tennis Scheduler - Stop All Servers
REM This script stops all tennis-related Node.js and Expo processes

echo ================================
echo Tennis Scheduler - Stop Servers
echo ================================
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo Stopping all Expo processes...
taskkill /f /im expo.exe >nul 2>&1

echo Stopping any remaining npm processes...
taskkill /f /im npm.exe >nul 2>&1

echo.
echo All servers stopped.
echo.
pause
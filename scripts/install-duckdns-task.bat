@echo off
:: Selbst-Elevation - startet sich als Administrator neu wenn noetig
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Starte als Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs -Wait"
    exit /b
)

:: Als Administrator: setup-duckdns-task.ps1 ausfuehren
echo DuckDNS Task Scheduler wird eingerichtet...
powershell -NonInteractive -ExecutionPolicy Bypass -File "%~dp0setup-duckdns-task.ps1"

echo.
echo Druecke eine Taste zum Schliessen...
pause >nul

@echo off
echo Check for admin privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
) else (
    echo ERROR: You must run this script as Administrator.
    echo Please right-click VS Code (or CMD) and select "Run as Administrator".
    pause
    exit /b
)

echo Stopping WinNAT service (releases reserved ports)...
net stop winnat

echo.
echo Starting WinNAT service...
net start winnat

echo.
echo WinNAT reset complete.
echo now try running: force_restart_supabase.bat

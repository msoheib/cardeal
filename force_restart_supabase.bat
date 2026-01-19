@echo off
echo Killing potentially stuck processes...
taskkill /F /IM supabase.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Forcing Supabase stop (clears lock files)...
call npx supabase stop --no-backup

echo.
echo Removing temp directory if exists...
if exist "supabase\.temp" (
    echo Removing supabase\.temp...
    rmdir /s /q "supabase\.temp"
)

echo.
echo Starting Supabase...
call npx supabase start

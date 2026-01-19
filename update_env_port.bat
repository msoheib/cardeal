@echo off
echo Updating .env.local port...
powershell -Command "(Get-Content .env.local) -replace '54322', '54422' | Set-Content .env.local"

echo Updating .env port...
if exist .env (
    powershell -Command "(Get-Content .env) -replace '54322', '54422' | Set-Content .env"
)

echo Ports updated to 54422.

@echo off
taskkill /F /IM node.exe
start /B "Supabase" npx supabase start > supabase.log 2>&1
echo Supabase started in background
timeout /t 10
start /B "Next" npm run dev > next.log 2>&1
echo Next started in background

@echo off
echo Starting cleanup... > debug_startup.log
taskkill /F /IM node.exe >> debug_startup.log 2>&1
echo Starting Supabase... >> debug_startup.log
npx supabase start >> debug_startup.log 2>&1
echo Starting Next.js... >> debug_startup.log
npm run dev >> debug_startup.log 2>&1

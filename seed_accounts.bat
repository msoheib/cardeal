@echo off
set NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
set SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
node scripts/seed-test-accounts.js
pause

@echo off
setlocal
chcp 65001 >nul
set "ROOT=C:\SEDU_r7"
set "HERE=%~dp0"
echo ============================================================
echo Seller Education Team Hub v8.0.0r8 R3
echo X Login Hotfix - DOMAIN route + CSP iframe fix
echo ============================================================
echo.
where node >nul 2>&1 || (
  echo [STOPPED SAFELY] Node.js was not found.
  pause
  exit /b 1
)
node "%HERE%tools\apply-x-login-hotfix-r3.js" "%ROOT%"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" (
  echo [STOPPED SAFELY] R3 login hotfix did not complete.
  echo Existing Keep to backup content was not overwritten.
  pause
  exit /b %RC%
)
echo [DONE] R3 login hotfix deployed. Browser acceptance is still required.
pause
exit /b 0

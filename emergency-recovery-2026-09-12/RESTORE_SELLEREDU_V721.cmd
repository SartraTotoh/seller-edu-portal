@echo off
setlocal
title Seller Education Portal - Emergency Restore v7.2.1
cd /d "%~dp0"

echo ============================================================
echo SELLER EDUCATION PORTAL - EMERGENCY RESTORE v7.2.1
echo Target: https://selleredu-portal.web.app/
echo Scope : Firebase Hosting only
echo ============================================================
echo.

powershell.exe -NoProfile -File "%~dp0RESTORE_SELLEREDU_V721.ps1"
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
  echo [FAILED/STOPPED SAFELY] Exit code %RC%
  echo No additional recovery step will be executed.
) else (
  echo [DONE] v7.2.1 restore flow completed.
)
echo.
pause
exit /b %RC%

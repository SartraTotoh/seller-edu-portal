@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Seller Edu OS v8.0.0r8 - X Phase 1-3 One Click

set "ROOT=C:\SEDU_r7"
set "HERE=%~dp0"

echo ============================================================
echo Seller Education Team Hub v8.0.0r8
echo X - PHASES 1-3 ONE CLICK
echo ============================================================
echo.

where node >nul 2>nul || (
  echo [STOPPED SAFELY] Node.js was not found in PATH.
  echo No production files were changed.
  pause
  exit /b 1
)

if not exist "%ROOT%" (
  echo [STOPPED SAFELY] Production working root not found: %ROOT%
  pause
  exit /b 1
)

if not exist "%HERE%tools\apply-x-phases-1-3.js" (
  echo [STOPPED SAFELY] Missing tools\apply-x-phases-1-3.js
  pause
  exit /b 1
)

node "%HERE%tools\apply-x-phases-1-3.js" "%ROOT%" "%HERE%role-roster.json"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [STOPPED SAFELY] X Phase 1-3 did not complete.
  echo Existing Keep to backup content was not overwritten.
  pause
  exit /b %RC%
)

echo.
echo [READY FOR LIVE ACCEPTANCE]
echo Open: https://selleredu-portal.web.app/
echo Every user must now sign in with their own work email.
echo Phase 4 browser acceptance is still required before Production Complete.
start "" "https://selleredu-portal.web.app/"
pause
exit /b 0

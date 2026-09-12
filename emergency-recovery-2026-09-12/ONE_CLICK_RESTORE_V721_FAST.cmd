@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Seller Education Portal - FAST ONE CLICK RESTORE v7.2.1

set "PROJECT=seller-edu-os-260902-vjzn6"
set "SITE=selleredu-portal"
set "PROD=https://selleredu-portal.web.app/"
set "ROLLBACK=Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime-ROLLBACK.zip"
set "ORIGINAL=Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime.zip"
set "BIGBACKUP=.r7-register-route-recovery-backup.zip"
set "EXPECTED_SHA=F0422F865A5EB21690B5D17081E5994268FAC4FB2B5EBFC6DD95ADD29379A111"
set "WORK=%TEMP%\SELLEREDU_V721_FAST_%RANDOM%_%RANDOM%"
set "PKG="
set "BIG="

cls
echo ============================================================
echo SELLER EDUCATION PORTAL - FAST ONE CLICK RESTORE v7.2.1
echo ============================================================
echo Target : %PROD%
echo Project: %PROJECT%
echo Site   : %SITE%
echo Mode   : Firebase Hosting restore only
echo Engine : CMD only - NO PowerShell / NO PS1
echo Search : DIRECT PATHS ONLY - NO RECURSIVE SCAN
echo ============================================================
echo.

echo [0/5] Checking Windows tools...
where tar >nul 2>&1 || goto :NO_TAR
where node >nul 2>&1 || goto :NO_NODE

echo [1/5] Locating v7.2.1 rollback package...
call :TRY "%~dp0%ROLLBACK%"
call :TRY "C:\SEDU_r7\backup\%ROLLBACK%"
call :TRY "C:\SEDU_r7\%ROLLBACK%"
call :TRY "%USERPROFILE%\Downloads\%ROLLBACK%"
call :TRY "%USERPROFILE%\Desktop\%ROLLBACK%"
if defined PKG goto :FOUND

call :TRY "%~dp0%ORIGINAL%"
call :TRY "C:\SEDU_r7\backup\%ORIGINAL%"
call :TRY "C:\SEDU_r7\%ORIGINAL%"
call :TRY "%USERPROFILE%\Downloads\%ORIGINAL%"
call :TRY "%USERPROFILE%\Desktop\%ORIGINAL%"
if defined PKG goto :FOUND

echo [INFO] Direct v7.2.1 ZIP not found. Checking exact backup locations...
call :TRYBIG "%~dp0%BIGBACKUP%"
call :TRYBIG "C:\SEDU_r7\backup\%BIGBACKUP%"
call :TRYBIG "C:\SEDU_r7\%BIGBACKUP%"
call :TRYBIG "%USERPROFILE%\Downloads\%BIGBACKUP%"
call :TRYBIG "%USERPROFILE%\Desktop\%BIGBACKUP%"
if not defined BIG goto :NO_PACKAGE

echo [INFO] Source backup found:
echo        !BIG!
echo [INFO] Reading the backup index only. No whole-drive scan is running.

set "ENTRY="
for /f "delims=" %%E in ('tar -tf "!BIG!" 2^>nul ^| findstr /I /C:"%ROLLBACK%"') do if not defined ENTRY set "ENTRY=%%E"
if not defined ENTRY (
  for /f "delims=" %%E in ('tar -tf "!BIG!" 2^>nul ^| findstr /I /C:"%ORIGINAL%"') do if not defined ENTRY set "ENTRY=%%E"
)
if not defined ENTRY (
  echo [STOP] Backup was found, but v7.2.1 rollback ZIP is not inside it.
  goto :FAIL
)

set "NEST=%TEMP%\SELLEREDU_V721_NEST_%RANDOM%_%RANDOM%"
mkdir "!NEST!" >nul 2>&1
echo [INFO] Extracting only the embedded v7.2.1 ZIP...
tar -xf "!BIG!" -C "!NEST!" "!ENTRY!"
if errorlevel 1 goto :EXTRACT_FAIL
for %%F in ("!NEST!\!ENTRY!") do set "PKG=%%~fF"
if not exist "!PKG!" (
  for /f "delims=" %%F in ('dir /b /s "!NEST!\%ROLLBACK%" "!NEST!\%ORIGINAL%" 2^>nul') do if not defined PKG set "PKG=%%F"
)
if not defined PKG goto :EXTRACT_FAIL

:FOUND
echo [OK] Recovery package:
echo      !PKG!

for %%Z in ("!PKG!") do set "PKGNAME=%%~nxZ"
if /I "!PKGNAME!"=="%ORIGINAL%" (
  echo [CHECK] Verifying original v7.2.1 SHA-256...
  set "HASH="
  for /f "tokens=*" %%H in ('certutil -hashfile "!PKG!" SHA256 ^| findstr /R /V "hash CertUtil"') do (
    set "LINE=%%H"
    set "LINE=!LINE: =!"
    if not "!LINE!"=="" set "HASH=!LINE!"
  )
  if /I not "!HASH!"=="%EXPECTED_SHA%" (
    echo [STOP] SHA-256 mismatch.
    echo Expected: %EXPECTED_SHA%
    echo Actual  : !HASH!
    goto :FAIL
  )
  echo [OK] SHA-256 verified.
)

if exist "%WORK%" rd /s /q "%WORK%"
mkdir "%WORK%" || goto :FAIL

echo [2/5] Extracting rollback package...
tar -xf "!PKG!" -C "%WORK%"
if errorlevel 1 goto :EXTRACT_FAIL

set "ROOT="
for /f "delims=" %%F in ('dir /s /b "%WORK%\INSTALL_SELLEREDU_TEAMHUB.cmd" 2^>nul') do if not defined ROOT set "ROOT=%%~dpF"
if not defined ROOT (
  echo [STOP] INSTALL_SELLEREDU_TEAMHUB.cmd not found inside rollback package.
  goto :FAIL
)

if not exist "!ROOT!firebase.json" goto :BAD_PACKAGE
if not exist "!ROOT!public\index.html" goto :BAD_PACKAGE
if not exist "!ROOT!ANALYTICS_ROLE_TIME_v7.2.1.txt" goto :BAD_PACKAGE
findstr /I /C:"SELLER EDUCATION TEAM HUB v7.2.1" "!ROOT!ANALYTICS_ROLE_TIME_v7.2.1.txt" >nul || goto :BAD_PACKAGE
findstr /I /C:"Shared backend writes: OFF" "!ROOT!ANALYTICS_ROLE_TIME_v7.2.1.txt" >nul || goto :BAD_PACKAGE
findstr /I /C:"functions" "!ROOT!firebase.json" >nul && (
  echo [STOP] firebase.json contains Functions. Refusing unsafe restore.
  goto :FAIL
)
findstr /I /C:"storage" "!ROOT!firebase.json" >nul && (
  echo [STOP] firebase.json contains Storage. Refusing unsafe restore.
  goto :FAIL
)

echo [3/5] Package validation PASS.
where firebase >nul 2>&1
if errorlevel 1 (
  echo [INFO] Firebase CLI not global. Using npx firebase-tools.
  set "FIREBASE=npx --yes firebase-tools@latest"
) else (
  set "FIREBASE=firebase"
)

echo [4/5] Deploying Firebase Hosting ONLY...
pushd "!ROOT!"
call !FIREBASE! deploy --only hosting:%SITE% --project %PROJECT%
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" (
  echo [STOP] Firebase Hosting deploy failed. Exit code !RC!.
  goto :FAIL
)

echo [5/5] Production readback...
where curl >nul 2>&1
if errorlevel 1 goto :SUCCESS
curl -L -sS -o "%WORK%\production.html" "%PROD%?restore=%RANDOM%%RANDOM%"
if errorlevel 1 (
  echo [WARN] Readback failed, but Firebase deploy completed.
  goto :SUCCESS
)
findstr /I /C:"7.2.1" "%WORK%\production.html" >nul
if errorlevel 1 (
  echo [WARN] HTML does not expose literal 7.2.1, but Hosting deploy completed.
) else (
  echo [OK] Production v7.2.1 marker detected.
)
goto :SUCCESS

:TRY
if defined PKG exit /b 0
if exist "%~1" set "PKG=%~1"
exit /b 0

:TRYBIG
if defined BIG exit /b 0
if exist "%~1" set "BIG=%~1"
exit /b 0

:NO_PACKAGE
echo.
echo [STOP] v7.2.1 rollback package was not found in known locations.
echo Production was NOT changed.
echo Checked exact paths under:
echo   %~dp0
echo   C:\SEDU_r7\backup\
echo   C:\SEDU_r7\
echo   %USERPROFILE%\Downloads\
echo   %USERPROFILE%\Desktop\
goto :FAIL

:NO_TAR
echo [STOP] Windows tar.exe was not found.
goto :FAIL

:NO_NODE
echo [STOP] Node.js was not found.
goto :FAIL

:EXTRACT_FAIL
echo [STOP] ZIP extraction failed.
goto :FAIL

:BAD_PACKAGE
echo [STOP] Rollback package validation failed. Production was not changed.
goto :FAIL

:SUCCESS
echo.
echo ============================================================
echo [RESTORE COMPLETE] Seller Education Portal v7.2.1
echo Production: %PROD%
echo Scope     : Firebase Hosting only
echo PowerShell: NOT USED
echo Data      : Sheet / Firestore / Apps Script NOT MODIFIED
echo ============================================================
echo.
start "" "%PROD%"
pause
exit /b 0

:FAIL
echo.
echo ============================================================
echo [STOPPED SAFELY]
echo No additional recovery action was executed.
echo ============================================================
echo.
pause
exit /b 1

@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Seller Education Portal - ONE CLICK RESTORE v7.2.1

set "PROJECT=seller-edu-os-260902-vjzn6"
set "SITE=selleredu-portal"
set "PROD=https://selleredu-portal.web.app/"
set "ROLLBACK=Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime-ROLLBACK.zip"
set "ORIGINAL=Seller-Edu-TeamHub-v7.2.1-OneClick-AnalyticsRoleTime.zip"
set "BIGBACKUP=.r7-register-route-recovery-backup.zip"
set "EXPECTED_SHA=F0422F865A5EB21690B5D17081E5994268FAC4FB2B5EBFC6DD95ADD29379A111"
set "WORK=%TEMP%\SELLEREDU_V721_RESTORE_%RANDOM%_%RANDOM%"
set "PKG="

cls
echo ============================================================
echo SELLER EDUCATION PORTAL - ONE CLICK RESTORE v7.2.1
echo ============================================================
echo Target : %PROD%
echo Project: %PROJECT%
echo Site   : %SITE%
echo Mode   : Firebase Hosting restore only
echo Engine : CMD only - NO PowerShell / NO PS1
echo ============================================================
echo.

where tar >nul 2>&1 || goto :NO_TAR
where node >nul 2>&1 || goto :NO_NODE

call :FIND_FILE "%ROLLBACK%"
if defined PKG goto :FOUND
call :FIND_FILE "%ORIGINAL%"
if defined PKG goto :FOUND

call :FIND_BIG
if defined PKG goto :FOUND

echo [STOP] Could not find v7.2.1 rollback package.
echo Checked:
echo   C:\SEDU_r7
echo   %USERPROFILE%\Downloads
echo   %USERPROFILE%\Desktop
echo.
echo Expected one of:
echo   %ROLLBACK%
echo   %ORIGINAL%
echo   %BIGBACKUP%
goto :FAIL

:FOUND
echo [OK] Recovery package: %PKG%

if /I "%~nxPKG%"=="%ORIGINAL%" (
  echo [CHECK] Verifying SHA-256...
  set "HASH="
  for /f "tokens=*" %%H in ('certutil -hashfile "%PKG%" SHA256 ^| findstr /R /V "hash CertUtil"') do (
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

echo [1/5] Extracting v7.2.1 package...
tar -xf "%PKG%" -C "%WORK%" || goto :EXTRACT_FAIL

set "ROOT="
for /f "delims=" %%F in ('dir /s /b "%WORK%\INSTALL_SELLEREDU_TEAMHUB.cmd" 2^>nul') do if not defined ROOT set "ROOT=%%~dpF"
if not defined ROOT (
  echo [STOP] INSTALL_SELLEREDU_TEAMHUB.cmd not found in package.
  goto :FAIL
)

if not exist "%ROOT%firebase.json" (
  echo [STOP] firebase.json missing from rollback package.
  goto :FAIL
)
if not exist "%ROOT%public\index.html" (
  echo [STOP] public\index.html missing from rollback package.
  goto :FAIL
)
if not exist "%ROOT%ANALYTICS_ROLE_TIME_v7.2.1.txt" (
  echo [STOP] v7.2.1 release marker file missing.
  goto :FAIL
)

findstr /I /C:"SELLER EDUCATION TEAM HUB v7.2.1" "%ROOT%ANALYTICS_ROLE_TIME_v7.2.1.txt" >nul || (
  echo [STOP] Wrong release package. v7.2.1 marker not found.
  goto :FAIL
)
findstr /I /C:"Shared backend writes: OFF" "%ROOT%ANALYTICS_ROLE_TIME_v7.2.1.txt" >nul || (
  echo [STOP] Safety boundary missing: Shared backend writes OFF.
  goto :FAIL
)

findstr /I /C:"functions" "%ROOT%firebase.json" >nul && (
  echo [STOP] firebase.json contains Functions. Refusing unsafe restore.
  goto :FAIL
)
findstr /I /C:"storage" "%ROOT%firebase.json" >nul && (
  echo [STOP] firebase.json contains Storage. Refusing unsafe restore.
  goto :FAIL
)

echo [2/5] v7.2.1 package validation PASS.
echo [3/5] Firebase account / CLI check...

where firebase >nul 2>&1
if errorlevel 1 (
  echo [INFO] Firebase CLI not found globally. Using npx firebase-tools.
  set "FIREBASE=npx --yes firebase-tools@latest"
) else (
  set "FIREBASE=firebase"
)

echo [4/5] Deploying Hosting ONLY to %SITE%...
pushd "%ROOT%"
call %FIREBASE% deploy --only hosting:%SITE% --project %PROJECT%
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" (
  echo [STOP] Firebase Hosting deploy failed. Exit code %RC%.
  goto :FAIL
)

echo [5/5] Production readback...
where curl >nul 2>&1
if errorlevel 1 (
  echo [WARN] curl not available. Deployment completed; open the production URL manually.
  goto :SUCCESS
)

curl -L -sS -o "%WORK%\production.html" "%PROD%?restore=%RANDOM%%RANDOM%"
if errorlevel 1 (
  echo [WARN] Production readback request failed, but Firebase deploy completed.
  goto :SUCCESS
)

findstr /I /C:"7.2.1" "%WORK%\production.html" >nul
if errorlevel 1 (
  echo [WARN] HTML does not expose a literal v7.2.1 marker.
  echo        Firebase Hosting deployment itself completed successfully.
) else (
  echo [OK] Production v7.2.1 marker detected.
)

goto :SUCCESS

:FIND_FILE
set "TARGET=%~1"
for %%D in ("C:\SEDU_r7" "%USERPROFILE%\Downloads" "%USERPROFILE%\Desktop") do (
  if exist "%%~D" (
    for /f "delims=" %%F in ('dir /s /b "%%~D\%TARGET%" 2^>nul') do if not defined PKG set "PKG=%%F"
  )
)
exit /b 0

:FIND_BIG
set "BIG="
for %%D in ("C:\SEDU_r7" "%USERPROFILE%\Downloads" "%USERPROFILE%\Desktop") do (
  if exist "%%~D" (
    for /f "delims=" %%F in ('dir /s /b "%%~D\%BIGBACKUP%" 2^>nul') do if not defined BIG set "BIG=%%F"
  )
)
if not defined BIG exit /b 0

echo [INFO] Found source backup: !BIG!
set "NEST=%TEMP%\SELLEREDU_NESTED_%RANDOM%_%RANDOM%"
if exist "!NEST!" rd /s /q "!NEST!"
mkdir "!NEST!" >nul 2>&1

set "ENTRY="
for /f "delims=" %%E in ('tar -tf "!BIG!" ^| findstr /I /C:"/%ROLLBACK%" /C:"%ROLLBACK%"') do if not defined ENTRY set "ENTRY=%%E"
if not defined ENTRY (
  for /f "delims=" %%E in ('tar -tf "!BIG!" ^| findstr /I /C:"/%ORIGINAL%" /C:"%ORIGINAL%"') do if not defined ENTRY set "ENTRY=%%E"
)
if not defined ENTRY (
  echo [STOP] r7 backup exists but no v7.2.1 rollback ZIP was found inside.
  exit /b 0
)

echo [INFO] Extracting embedded rollback only: !ENTRY!
tar -xf "!BIG!" -C "!NEST!" "!ENTRY!" || exit /b 0
for /f "delims=" %%F in ('dir /s /b "!NEST!\%ROLLBACK%" "!NEST!\%ORIGINAL%" 2^>nul') do if not defined PKG set "PKG=%%F"
exit /b 0

:NO_TAR
echo [STOP] Windows tar.exe is required but was not found.
goto :FAIL

:NO_NODE
echo [STOP] Node.js is required for Firebase CLI fallback but was not found.
goto :FAIL

:EXTRACT_FAIL
echo [STOP] Could not extract the rollback ZIP.
goto :FAIL

:SUCCESS
echo.
echo ============================================================
echo [RESTORE COMPLETE] Seller Education Portal v7.2.1
echo Production: %PROD%
echo Scope     : Firebase Hosting only
echo PowerShell: NOT USED
echo Sheet/Firestore/Apps Script data: NOT MODIFIED BY THIS FILE
echo ============================================================
echo.
start "" "%PROD%"
pause
exit /b 0

:FAIL
echo.
echo ============================================================
echo [STOPPED SAFELY]
echo No additional recovery action will be executed.
echo ============================================================
echo.
pause
exit /b 1

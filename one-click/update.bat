@echo off
setlocal ENABLEDELAYEDEXPANSION

set "BASE_DIR=%~dp0"
set "LOCAL_VERSION_FILE=%BASE_DIR%version.json"
set "DEFAULT_RELEASE_BASE_URL=https://github.com/codejarrown/release"

call :update_from_remote
goto :eof

:read_json_value
set "%~2="
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "(Get-Content -Raw '%~1' | ConvertFrom-Json).%~3"`) do set "%~2=%%L"
exit /b 0

:release_base_url
set "RELEASE_BASE_URL=%DEFAULT_RELEASE_BASE_URL%"
if exist "%LOCAL_VERSION_FILE%" (
  call :read_json_value "%LOCAL_VERSION_FILE%" RELEASE_BASE_URL releaseBaseUrl
  if not "!RELEASE_BASE_URL!"=="" exit /b 0
)
set "RELEASE_BASE_URL=%DEFAULT_RELEASE_BASE_URL%"
exit /b 0

:apply_remote_bundle
set "SOURCE_DIR=%~1"
set "PACKAGE_LOCK_CHANGED=0"

if /I "%SOURCE_DIR%"=="%BASE_DIR:~0,-1%" (
  echo [ERROR] Update source cannot be the current install directory.
  goto die
)

if not exist "%SOURCE_DIR%" (
  echo [ERROR] Update source not found: %SOURCE_DIR%
  goto die
)

if not exist "%SOURCE_DIR%\mt5server\dist\main.cjs" (
  echo [ERROR] Missing mt5server\dist\main.cjs in update source.
  goto die
)

if not exist "%SOURCE_DIR%\mt5server\public\index.html" (
  echo [ERROR] Missing mt5server\public\index.html in update source.
  goto die
)

if not exist "%SOURCE_DIR%\mt5api" (
  echo [ERROR] Missing mt5api directory in update source.
  goto die
)

if exist "%SOURCE_DIR%\mt5server\package-lock.json" (
  if not exist "%BASE_DIR%mt5server\package-lock.json" (
    set "PACKAGE_LOCK_CHANGED=1"
  ) else (
    fc /b "%SOURCE_DIR%\mt5server\package-lock.json" "%BASE_DIR%mt5server\package-lock.json" >nul 2>&1
    if errorlevel 1 set "PACKAGE_LOCK_CHANGED=1"
  )
)

for %%P in (3000 5050) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    if not "%%A"=="" (
      echo Releasing port %%P PID %%A
      taskkill /PID %%A /F >nul 2>&1
    )
  )
)

echo ==> Updating mt5api
if not exist "%BASE_DIR%mt5api" mkdir "%BASE_DIR%mt5api"
robocopy "%SOURCE_DIR%\mt5api" "%BASE_DIR%mt5api" /MIR >nul
if errorlevel 8 goto copy_fail

echo ==> Updating mt5server\dist
if not exist "%BASE_DIR%mt5server\dist" mkdir "%BASE_DIR%mt5server\dist"
robocopy "%SOURCE_DIR%\mt5server\dist" "%BASE_DIR%mt5server\dist" /MIR >nul
if errorlevel 8 goto copy_fail

echo ==> Updating mt5server\public
if not exist "%BASE_DIR%mt5server\public" mkdir "%BASE_DIR%mt5server\public"
robocopy "%SOURCE_DIR%\mt5server\public" "%BASE_DIR%mt5server\public" /MIR >nul
if errorlevel 8 goto copy_fail

echo ==> Updating launcher files
copy /Y "%SOURCE_DIR%\mt5server\package.json" "%BASE_DIR%mt5server\package.json" >nul
if exist "%SOURCE_DIR%\mt5server\package-lock.json" copy /Y "%SOURCE_DIR%\mt5server\package-lock.json" "%BASE_DIR%mt5server\package-lock.json" >nul
if exist "%SOURCE_DIR%\start.sh" copy /Y "%SOURCE_DIR%\start.sh" "%BASE_DIR%start.sh" >nul
if exist "%SOURCE_DIR%\start.bat" copy /Y "%SOURCE_DIR%\start.bat" "%BASE_DIR%start.bat" >nul
if exist "%SOURCE_DIR%\update.sh" copy /Y "%SOURCE_DIR%\update.sh" "%BASE_DIR%update.sh" >nul
if exist "%SOURCE_DIR%\update.bat" copy /Y "%SOURCE_DIR%\update.bat" "%BASE_DIR%update.bat" >nul
if exist "%SOURCE_DIR%\_run_mt5api.cmd" copy /Y "%SOURCE_DIR%\_run_mt5api.cmd" "%BASE_DIR%_run_mt5api.cmd" >nul
if exist "%SOURCE_DIR%\_run_mt5server.cmd" copy /Y "%SOURCE_DIR%\_run_mt5server.cmd" "%BASE_DIR%_run_mt5server.cmd" >nul
if exist "%SOURCE_DIR%\version.json" copy /Y "%SOURCE_DIR%\version.json" "%BASE_DIR%version.json" >nul

if "%PACKAGE_LOCK_CHANGED%"=="1" (
  echo ==> package-lock.json changed; reinstalling production dependencies
  pushd "%BASE_DIR%mt5server"
  if exist node_modules rmdir /s /q node_modules
  call npm ci --no-fund --no-audit --omit=dev
  if errorlevel 1 (
    popd
    echo [ERROR] npm ci failed.
    goto die
  )
  popd
) else (
  echo ==> package-lock.json unchanged; keeping existing node_modules
)

echo ==> Update complete
echo Run: start.bat
exit /b 0

:update_from_remote
set "TMP_DIR=%TEMP%\mt5tools-update-%RANDOM%%RANDOM%"
mkdir "%TMP_DIR%" >nul 2>&1
call :release_base_url
set "LATEST_URL=%RELEASE_BASE_URL%/releases/latest/download/latest.json"
set "LATEST_FILE=%TMP_DIR%\latest.json"
set "ZIP_FILE=%TMP_DIR%\one-click.zip"
set "EXTRACT_DIR=%TMP_DIR%\extract"

echo ==> Checking latest release
powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing '%LATEST_URL%' -OutFile '%LATEST_FILE%'" || goto die

set "REMOTE_VERSION="
set "BUNDLE_URL="
call :read_json_value "%LATEST_FILE%" REMOTE_VERSION version
call :read_json_value "%LATEST_FILE%" BUNDLE_URL bundleUrl

set "LOCAL_VERSION="
if exist "%LOCAL_VERSION_FILE%" call :read_json_value "%LOCAL_VERSION_FILE%" LOCAL_VERSION version

if not "%LOCAL_VERSION%"=="" if "%LOCAL_VERSION%"=="%REMOTE_VERSION%" (
  echo ==> Already up to date: %LOCAL_VERSION%
  exit /b 0
)

if "%BUNDLE_URL%"=="" (
  echo [ERROR] latest.json is missing bundleUrl
  goto die
)

echo ==> Downloading release bundle
powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing '%BUNDLE_URL%' -OutFile '%ZIP_FILE%'" || goto die

echo ==> Extracting release bundle
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force" || goto die

if not exist "%EXTRACT_DIR%\one-click\mt5server\dist\main.cjs" (
  echo [ERROR] Extracted bundle is invalid.
  goto die
)

if not "%REMOTE_VERSION%"=="" echo ==> Updating to version %REMOTE_VERSION%
call :apply_remote_bundle "%EXTRACT_DIR%\one-click"
exit /b 0

:copy_fail
echo [ERROR] File copy failed during update.
goto die

:die
echo.
echo Press any key to exit...
pause >nul
exit /b 1

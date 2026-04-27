@echo off
setlocal ENABLEDELAYEDEXPANSION

set "BASE_DIR=%~dp0"
set "API_DIR=%BASE_DIR%mt5api"
set "SERVER_DIR=%BASE_DIR%mt5server"
set "LOG_DIR=%BASE_DIR%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  goto die
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js with npm first.
  goto die
)

where dotnet >nul 2>&1
if errorlevel 1 (
  echo [ERROR] .NET not found. Please install .NET 8 runtime or SDK first.
  goto die
)

if not exist "%SERVER_DIR%\.env" (
  echo [ERROR] Missing mt5server\.env
  goto die
)

if not exist "%SERVER_DIR%\dist\main.cjs" (
  echo [ERROR] Missing mt5server\dist\main.cjs - rebuild the one-click bundle or copy dist from build.
  goto die
)

if not exist "%API_DIR%" (
  echo [ERROR] Missing mt5api publish output: %API_DIR%
  goto die
)

if not exist "%SERVER_DIR%\public\index.html" (
  echo [ERROR] Missing web assets: mt5server\public\index.html
  goto die
)

if not exist "%BASE_DIR%_run_mt5api.cmd" (
  echo [ERROR] Missing _run_mt5api.cmd in bundle root.
  goto die
)
if not exist "%BASE_DIR%_run_mt5server.cmd" (
  echo [ERROR] Missing _run_mt5server.cmd in bundle root.
  goto die
)

pushd "%SERVER_DIR%"
node -e "require.resolve('better-sqlite3')" >nul 2>&1
if errorlevel 1 (
  echo ==> Installing server dependencies on this machine ^(npm; needs network^).
  if exist node_modules rmdir /s /q node_modules
  if exist package-lock.json (
    call npm ci --no-fund --no-audit --omit=dev
  ) else (
    call npm install --no-fund --no-audit --omit=dev
  )
  if errorlevel 1 (
    popd
    echo [ERROR] npm install failed. Need network and Node ^>= 20.
    goto die
  )
  node -e "require.resolve('better-sqlite3')" >nul 2>&1
  if errorlevel 1 (
    popd
    echo [ERROR] better-sqlite3 still missing after npm install.
    goto die
  )
)
popd

for %%P in (3000 5050) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    if not "%%A"=="" (
      echo Releasing port %%P PID %%A
      taskkill /PID %%A /F >nul 2>&1
    )
  )
)

echo ==> Starting mt5api (:5050)
start "mt5api" /min "%BASE_DIR%_run_mt5api.cmd"

echo ==> Starting mt5server (:3000)
start "mt5server" /min "%BASE_DIR%_run_mt5server.cmd"

echo ==> Waiting for port 3000...
set /a _wait=0
:wait3000
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto ok3000
set /a _wait+=1
if !_wait! GTR 60 goto fail3000
timeout /t 1 /nobreak >nul
goto wait3000

:fail3000
echo [ERROR] Port 3000 is not listening. Open logs\mt5server.log for errors.
echo Common causes: missing node_modules, bad .env, or port blocked by firewall.
goto die

:ok3000
echo ==> Ready
echo Web: http://127.0.0.1:3000
echo Logs: %LOG_DIR%
echo.
echo Press any key to stop mt5api and mt5server...
pause >nul

taskkill /FI "WINDOWTITLE eq mt5api" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq mt5server" /F >nul 2>&1
echo ==> Stopped

goto :eof

:die
echo.
echo Press any key to exit...
pause >nul
exit /b 1

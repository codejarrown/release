@echo off
cd /d "%~dp0mt5api"
set ASPNETCORE_URLS=http://0.0.0.0:5050
dotnet MT5API.WebHost.dll>>"%~dp0logs\mt5api.log" 2>&1

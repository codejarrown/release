@echo off
cd /d "%~dp0mt5server"
node dist\main.cjs>>"%~dp0logs\mt5server.log" 2>&1

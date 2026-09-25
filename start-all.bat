@echo off
title Page Manager Pro - Launcher
cd /d "%~dp0"
echo Starting backend + frontend in separate windows...
start "PMP Backend :4000" cmd /k start-backend.bat
timeout /t 3 /nobreak >nul
start "PMP Frontend :3000" cmd /k start-frontend.bat
echo Done. Dashboard: http://localhost:3000
pause

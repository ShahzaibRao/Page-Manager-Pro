@echo off
title Page Manager Pro - Frontend :3000
cd /d "%~dp0frontend"
echo Starting frontend on http://localhost:3000 ...
npm run dev -- -p 3000
pause

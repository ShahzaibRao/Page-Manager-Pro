@echo off
title Page Manager Pro - Backend :4000
cd /d "%~dp0backend"
echo Starting backend on http://localhost:4000 ...
node index.js
pause

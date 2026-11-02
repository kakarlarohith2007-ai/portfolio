@echo off
title Kakarla Rohith Portfolio Server
cd /d "%~dp0"
echo ====================================================
echo Starting Cinematic Portfolio website on localhost...
echo Opening http://localhost:8080 in your default browser...
echo ====================================================
start http://localhost:8080/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause


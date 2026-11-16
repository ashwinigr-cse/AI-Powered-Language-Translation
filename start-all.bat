@echo off
start "LinguaAI Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "LinguaAI Frontend" cmd /k "%~dp0start-frontend.bat"

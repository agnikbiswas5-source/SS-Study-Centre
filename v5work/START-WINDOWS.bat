@echo off
cd /d "%~dp0"
echo Installing required packages...
npm install
echo Starting SS Study Centre...
start http://localhost:3000/
npm start
pause

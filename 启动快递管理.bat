@echo off
chcp 65001 >nul
title 快递管理
echo.
echo   ╔══════════════════════════════════╗
echo   ║      📦 快递管理 v1.0          ║
echo   ╚══════════════════════════════════╝
echo.
echo   正在启动服务器...
echo.
start http://localhost:8765
cd /d "%~dp0"
node server.js
pause

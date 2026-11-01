@echo off
chcp 65001 >nul
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\_Codex整理\启动网页项目.ps1" -ProjectPath "%~dp0" -Port 3010
endlocal

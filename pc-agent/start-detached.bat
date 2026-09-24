@echo off
rem XTOBE PC CONNECT - detached launcher (survives Hermes/Cline/VS close)
cd /d "%~dp0"
start "XTOBE PC CONNECT" /min cmd /c ""C:\Users\Nishan\AppData\Local\hermes\node\node.exe" "C:\Users\Nishan\Xtobe\xtobe-2\pc-agent\pc-agent.js" > "%~dp0agent.log" 2>&1"
echo LAUNCHED

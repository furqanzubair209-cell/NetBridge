@echo off
title NetBridge - Computer Networks Laboratory Server
color 0B
cls

echo ==============================================================================
echo        NetBridge: Intelligent Peer-to-Peer File Sharing & Diagnostics
echo                  Computer Networks Semester Laboratory
echo ==============================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found in your system PATH!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Change directory to script folder
cd /d "%~dp0"

:: 3. Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [*] First-time setup: Installing required dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
    echo [*] Dependencies installed successfully!
    echo.
)

:: 4. Detect Local LAN IP Address
set LAN_IP=localhost
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    if not "%%a"=="" set LAN_IP=%%a
)

:: Ensure Windows Firewall allows port 3000 for local phone access
netsh advfirewall firewall add rule name="NetBridge Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul

echo ==============================================================================
echo [*] Starting NetBridge Server on Port 3000...
echo.
echo   Local Access:      http://localhost:3000
echo   Network / Wi-Fi:   http://%LAN_IP%:3000
echo.
echo [*] Tip: Open the Network / Wi-Fi address on your phone, tablet, or another
echo     laptop on the same Wi-Fi to test cross-device P2P transfers!
echo ==============================================================================
echo.

:: 5. Open browser automatically after a short 1-second delay in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 6. Launch NetBridge Node Server
node server/index.js

pause

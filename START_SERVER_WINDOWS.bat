@echo off
title Isai Mayam — Local Server
color 0A
echo.
echo  ============================================
echo   Isai Mayam Music Player — by Harish Kumar
echo  ============================================
echo.
echo  Starting local server...
echo  Your browser will open automatically.
echo.
echo  Press Ctrl+C to stop the server.
echo  ============================================
echo.

:: Try Python 3 first
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo  Using Python to serve...
    python server.py
    goto end
)

:: Try Python 3 explicitly
python3 --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo  Using Python3 to serve...
    python3 server.py
    goto end
)

:: Try Node.js npx serve
npx --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo  Using Node.js to serve...
    start "" http://localhost:3000
    npx serve .
    goto end
)

:: Nothing found
echo.
echo  ERROR: Python or Node.js not found on your computer.
echo.
echo  Please install one of the following:
echo    Python  : https://www.python.org/downloads/
echo    Node.js : https://nodejs.org/
echo.
echo  After installing, run this file again.
echo.
pause

:end

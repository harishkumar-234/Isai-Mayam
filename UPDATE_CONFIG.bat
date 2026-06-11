@echo off
title SoundWave — Update Config
color 0A
echo.
echo  ============================================
echo   SoundWave — Auto Config Generator
echo   by Harish Kumar
echo  ============================================
echo.
echo  Scanning songs/ folder...
echo.

:: Try Python 3
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    python update_config.py
    goto done
)

:: Try Python3 explicitly
python3 --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    python3 update_config.py
    goto done
)

echo  ERROR: Python not found on your computer.
echo.
echo  Please install Python from: https://www.python.org/downloads/
echo.
pause

:done
echo.
echo  Done! Now open index.html to see your updated songs.
echo.
pause

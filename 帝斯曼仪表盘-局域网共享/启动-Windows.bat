@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   Dimanshi Dashboard - LAN sharing
echo   Starting... (close this window to stop)
echo ================================================
echo.
python --version >nul 2>nul
if %errorlevel%==0 (
    python serve.py
    goto end
)
py --version >nul 2>nul
if %errorlevel%==0 (
    py serve.py
    goto end
)
echo [!] Python 3 not found / 未找到 Python 3
echo     Install from https://www.python.org/downloads/
echo     ( During setup, check "Add Python to PATH" )
echo.
:end
pause

@echo off
setlocal EnableDelayedExpansion

title RL Tutorial — Launcher
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Reinforcement Learning Tutorial Launcher
echo  ==========================================
echo.

:: ── 1. Python venv ──────────────────────────────────────────────────────────
if not exist ".venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo  ERROR: Could not create Python venv.
        echo  Make sure Python 3.10+ is installed and on your PATH.
        pause
        exit /b 1
    )
    echo       Done.
) else (
    echo [1/4] Python venv found.
)

:: ── 2. Python deps ───────────────────────────────────────────────────────────
echo [2/4] Installing / verifying Python dependencies...
call .venv\Scripts\activate.bat
pip install -r python\requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo.
    echo  ERROR: pip install failed. Check python\requirements.txt.
    pause
    exit /b 1
)
echo       Done.

:: ── 3. Node deps ─────────────────────────────────────────────────────────────
echo [3/4] Installing / verifying Node.js dependencies...
echo       (this may take a minute on first run)

:: Install root + workspaces (npm workspaces handles backend + frontend together)
call npm install
if errorlevel 1 (
    echo.
    echo  ERROR: npm install failed — see errors above.
    echo.
    echo  Common fixes:
    echo    - Node.js 18+  ^>  node --version
    echo    - npm 9+       ^>  npm --version   ^(update: npm install -g npm^)
    echo.
    pause
    exit /b 1
)
echo       Done.

:: ── 4. Launch servers ────────────────────────────────────────────────────────
echo [4/4] Starting servers...
echo.

:: Backend in its own window
start "RL Backend (Node.js :3000)" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && npm run dev:backend"

:: Wait 2 seconds so the backend gets a head start
timeout /t 2 /nobreak >nul

:: Frontend in its own window
start "RL Frontend (Angular :4200)" cmd /k "cd /d "%~dp0" && npm run dev:frontend"

echo.
echo  ==========================================
echo   Servers are starting up in new windows.
echo.
echo   Backend  : http://localhost:3000
echo   Frontend : http://localhost:4200  ^<-- open this
echo  ==========================================
echo.
echo  Angular takes ~15 seconds to compile on first run.
echo  Watch the "RL Frontend" window for "Application bundle generation complete".
echo.

:: Open the browser after a short delay
timeout /t 8 /nobreak >nul
start "" "http://localhost:4200"

echo  Browser opened. You can close this window.
echo.
pause

@echo off
TITLE LumeHeart Clinical Dashboard - System Launcher
COLOR 0B

echo ===================================================
echo   LUMEHEART: PREMIUM BLOCKCHAIN TELEMETRY SYSTEM
echo ===================================================
echo.

:: Check if in the correct directory
if not exist "package.json" (
    echo [ERROR] package.json not found! 
    echo Please run this script from the 'app_name' directory.
    pause
    exit /b
)

:: 1. Start Ganache (Blockchain Node)
echo [1/4] Booting Ethereum Node (Ganache Port 8545)...
start "Ganache Node" cmd /k "npx ganache --port 8545"
timeout /t 5 /nobreak > nul

:: 2. Start Simulator (Contract Deployer + Telemetry Generator)
echo [2/4] Deploying Smart Contracts ^& Starting Simulation...
start "IoT Simulator" cmd /k "node scripts/simulate.js"
timeout /t 8 /nobreak > nul

:: 3. Start Backend (Clinical FHIR Gateway ^& Audit Logger)
echo [3/4] Initializing Backend API (Port 3001)...
start "Clinical Backend" cmd /k "node backend/server.js"
timeout /t 3 /nobreak > nul

:: 4. Start React Frontend
echo [4/4] Launching Dashboard UI...
echo Launching browser at http://localhost:3000...
npm start

echo.
echo ===================================================
echo   SYSTEM INITIALIZATION COMPLETE
echo ===================================================
pause

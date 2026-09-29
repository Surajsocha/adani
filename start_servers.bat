@echo off
echo ========================================
echo  ADANI DTPS E-LOGBOOK – START SERVERS
echo ========================================
echo.
echo Starting Django Backend (port 8000)...
start cmd /k "cd /d "%~dp0backend" && python manage.py runserver"
echo.
timeout /t 3 /nobreak >nul
echo Starting React Frontend (port 5173)...
start cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ========================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  Admin:    http://localhost:8000/admin/
echo ========================================
timeout /t 3 /nobreak >nul
start http://localhost:5173

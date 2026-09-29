@echo off
echo ========================================
echo  ADANI DTPS E-LOGBOOK – SETUP SCRIPT
echo ========================================
echo.
echo [1/3] Running Django migrations...
cd /d "%~dp0backend"
python manage.py makemigrations
python manage.py migrate
echo.
echo [2/3] Creating initial departments...
python manage.py shell -c "from users.models import Department; [Department.objects.get_or_create(code=c, defaults={'name':n}) for c,n in [('ahp','AHP - Ash Handling Plant'),('operations','Operations'),('electrical','Electrical'),('mechanical','Mechanical'),('ci','Control & Instrumentation')]]"
echo.
echo [3/3] Done! Now create a superuser:
python manage.py createsuperuser
echo.
echo Setup complete. Start servers with: start_servers.bat
pause

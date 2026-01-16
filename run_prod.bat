@echo off
echo installing dependencies if missing...
pip install -r requirements.txt
echo.
echo Starting Gemini AI Agent in PRODUCTION mode...
echo Access at http://localhost:8080
echo.
python wsgi.py
pause

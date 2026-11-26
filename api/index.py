import os
import sys

# Add parent directory to path so server can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# Vercel looks for the WSGI/ASGI 'app' object

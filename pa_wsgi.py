# This file contains the WSGI configuration required to serve up your
# web application at http://<your-username>.pythonanywhere.com/
# It works by setting the variable 'application' to a WSGI handler of some
# description.

import sys
import os

# ADD YOUR USERNAME HERE
# CHANGE 'Harsha' to your actual PythonAnywhere username if different
# assuming the folder upload was: /home/yourusername/mysite
path = '/home/yourusername/mysite'

if path not in sys.path:
    sys.path.append(path)

# Set environment variables (since .env might not load automatically in WSGI)
# You should essentially set these in the "Environment variables" section of the Web tab
# But for simplicity, we load them here if using python-dotenv
from dotenv import load_dotenv
project_folder = os.path.expanduser(path)
load_dotenv(os.path.join(project_folder, '.env'))

from server import app as application

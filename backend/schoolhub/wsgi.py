"""
WSGI config for schoolhub project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schoolhub.settings')

application = get_wsgi_application()


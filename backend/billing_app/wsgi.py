import os
# Import os module for environment variable handling

from django.core.wsgi import get_wsgi_application
# Import Django's WSGI application getter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "billing_app.settings")
# Set default Django settings module to billing_app.settings

application = get_wsgi_application()
# Create and expose the WSGI application instance

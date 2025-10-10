import os
# Import os module for environment variable handling

from django.core.asgi import get_asgi_application
# Import Django's ASGI application getter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "billing_app.settings")
# Set default Django settings module to billing_app.settings

application = get_asgi_application()
# Create and expose the ASGI application instance

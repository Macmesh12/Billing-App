from pathlib import Path
# Import Path for path handling
import os
# Import os for environment variables

BASE_DIR = Path(__file__).resolve().parent.parent
# Base directory of the project
FRONTEND_DIR = BASE_DIR.parent / "frontend"
# Directory for frontend assets

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "development-secret-key")
# Secret key for Django, defaults to development key
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
# Debug mode flag, defaults to True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "0.0.0.0"]
# Allowed hosts for security

INSTALLED_APPS = [
    # List of installed Django apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "billing_app.invoices",
    "receipts",
    "waybills",
]

MIDDLEWARE = [
    # Middleware classes for request processing
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "billing_app.urls"
# Root URL configuration module

TEMPLATES = [
    # Template engine configuration
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [FRONTEND_DIR / "templates"],
        # Directories to search for templates
        "APP_DIRS": True,
        # Look for templates in app directories
        "OPTIONS": {
            "context_processors": [
                # Context processors for templates
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "billing_app.wsgi.application"
# WSGI application path

DATABASES = {
    # Database configuration
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        # SQLite database file path
    }
}

AUTH_PASSWORD_VALIDATORS = [
    # Password validation rules
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
# Language code for internationalization
TIME_ZONE = "Africa/Accra"
# Time zone setting
USE_I18N = True
# Enable internationalization
USE_TZ = True
# Use timezone-aware datetimes

STATIC_URL = "/static/"
# URL prefix for static files
STATICFILES_DIRS = [FRONTEND_DIR / "static"]
# Directories to search for static files

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# Default auto field type for models

TAX_SETTINGS = {
    # Tax rates configuration
    "NHIL": 0.025,
    "GETFUND": 0.025,
    "COVID": 0.01,
    "VAT": 0.15,
}

# Firebase configuration for global counters / integrations
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyDJU7jyiMSYoAwFUfUKvgB0ACaB7uYqDmA",
    "authDomain": "billing-app-689e2.firebaseapp.com",
    "projectId": "billing-app-689e2",
    "storageBucket": "billing-app-689e2.firebasestorage.app",
    "messagingSenderId": "746898948349",
    "appId": "1:746898948349:web:d8d7748a1905757ea8fe94",
    "measurementId": "G-2HG3ED32Y1",
}

FIREBASE_PROJECT_ID = FIREBASE_CONFIG.get("projectId")
FIREBASE_COUNTER_COLLECTION = os.environ.get("FIREBASE_COUNTER_COLLECTION", "documentCounters")
FIREBASE_COUNTER_DOCUMENT = os.environ.get("FIREBASE_COUNTER_DOCUMENT", "global")
FIREBASE_COUNTER_PAD = int(os.environ.get("FIREBASE_COUNTER_PAD", "3"))

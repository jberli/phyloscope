"""
Django Settings
"""
import os
from pathlib import Path
from phylopedia.private import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PWD, DJANGO_KEY

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Secret key
SECRET_KEY = DJANGO_KEY

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost']

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'livereload', # Auto reload on static changes
    'django_extensions', # django extensions
    'sass_processor', # Sass processor
    'django.contrib.gis', # GeoDjango
    # Own applications
    'explorer',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'livereload.middleware.LiveReloadScript', # This middleware injects the livereload on static changes
]

ROOT_URLCONF = 'phylopedia.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'phylopedia.wsgi.application'

# Database
DATABASES = {
    'default': {
        'NAME': DB_NAME,
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'USER': DB_USER,
        'PASSWORD': DB_PWD,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
        'OPTIONS': {
            'options': '-c search_path=public'
        },
        'explorer': {
            'NAME': DB_NAME,
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'USER': DB_USER,
            'PASSWORD': DB_PWD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'OPTIONS': {
                'options': '-c search_path=public,explorer'
            },
        }
    }
}

# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Europe/Paris'

USE_I18N = True

USE_TZ = True

# The list of finder backends that know how to find static files in various location
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'sass_processor.finders.CssFinder',
]

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

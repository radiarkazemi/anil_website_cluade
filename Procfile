web: gunicorn anil.wsgi:application --bind 0.0.0.0:${PORT:-8000}
release: python manage.py migrate --noinput && python manage.py seed && python manage.py collectstatic --noinput

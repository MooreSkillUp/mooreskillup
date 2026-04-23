web: cd backend && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
release: cd backend && python manage.py migrate --noinput

#!/bin/sh
set -e

DB_WAIT_HOST="${DB_HOST:-${DATABASE_HOST:-db}}"
DB_WAIT_PORT="${DB_PORT:-${DATABASE_PORT:-5432}}"

echo "Waiting for database..."
while ! nc -z "$DB_WAIT_HOST" "$DB_WAIT_PORT"; do
  sleep 1
done

echo "Database is up!"

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# DRF keeps throttle counters in the cache, which is the database in production
# so the limits hold across replicas. Creating the table is idempotent.
echo "Ensuring cache table..."
python manage.py createcachetable

# Collect static files if not in debug mode
if [ "$DJANGO_DEBUG" != "True" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Start appropriate server
if [ "$DJANGO_DEBUG" = "True" ]; then
  echo "Starting development server..."
  exec python manage.py runserver 0.0.0.0:8000
else
  echo "Starting production server (gunicorn)..."
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
fi

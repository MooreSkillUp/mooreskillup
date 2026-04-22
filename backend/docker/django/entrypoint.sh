#!/bin/sh
set -e

echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done

echo "Database is up!"

python manage.py migrate --noinput || true

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000

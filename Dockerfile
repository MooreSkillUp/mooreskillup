FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY backend/requirements /tmp/requirements
RUN pip install --no-cache-dir -r /tmp/requirements/dev.txt

# Copy project
COPY backend /app

# Entrypoint
RUN chmod +x /app/docker/django/entrypoint.sh
ENTRYPOINT ["/app/docker/django/entrypoint.sh"]

# Run server (gunicorn for production, dev server for local)
CMD ["sh", "-c", "if [ \"$DJANGO_DEBUG\" = \"True\" ]; then python manage.py runserver 0.0.0.0:8000; else gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4; fi"]

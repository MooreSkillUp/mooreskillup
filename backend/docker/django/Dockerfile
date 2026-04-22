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

# Run server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

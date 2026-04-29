# ── x86_64 compatibility ────────────────────────────────────────────────────
# Target arch: linux/amd64. python:3.11-slim ships generic x86_64 binaries.
FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app

# System deps — keep minimal
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    netcat-openbsd \
    postgresql-client \
    tesseract-ocr tesseract-ocr-por \
    poppler-utils \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/

RUN mkdir -p /app/uploads && chmod +x /app/entrypoint.sh

ENV PORT=8000
EXPOSE ${PORT}

# Entrypoint rebuilds DATABASE_URL from individual components (DB_HOST, DB_PORT,
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB) so it always points to the
# correct host even if a deploy manager injects a stale DATABASE_URL=localhost.
CMD ["/app/entrypoint.sh"]

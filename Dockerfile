# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build: Vite frontend → FastAPI backend serves API + static SPA.
# Single image, single port. Target arch: linux/amd64.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build React/Vite frontend ──────────────────────────────────────
FROM --platform=linux/amd64 node:20-alpine AS frontend-build

WORKDIR /build

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ─────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

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

ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/

# Bundle compiled SPA into the API image
COPY --from=frontend-build /build/dist /app/static

RUN mkdir -p /app/uploads

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

# Entrypoint rebuilds DATABASE_URL from individual components so it always
# points to the correct host even if a deploy manager injects a stale value.
CMD ["/docker-entrypoint.sh"]

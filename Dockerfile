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
FROM --platform=linux/amd64 python:3.11-slim

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

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/

# Bundle compiled SPA into the API image
COPY --from=frontend-build /build/dist /app/static

RUN mkdir -p /app/uploads

ENV PORT=8000
ENV PYTHONUNBUFFERED=1
EXPOSE ${PORT}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers ${WEB_WORKERS:-1}

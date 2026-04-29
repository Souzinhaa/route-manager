FROM --platform=linux/amd64 postgres:15-alpine

# Build context must be repo root: docker build -f db/Dockerfile .
COPY /migrations/001_initial.sql /docker-entrypoint-initdb.d/001_initial.sql

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres

CMD ["postgres", \
    "-c", "shared_buffers=64MB", \
    "-c", "effective_cache_size=192MB", \
    "-c", "maintenance_work_mem=32MB", \
    "-c", "work_mem=4MB", \
    "-c", "max_connections=20", \
    "-c", "checkpoint_completion_target=0.9", \
    "-c", "wal_buffers=4MB", \
    "-c", "min_wal_size=80MB", \
    "-c", "max_wal_size=512MB", \
    "-c", "random_page_cost=1.1", \
    "-c", "effective_io_concurrency=1", \
    "-c", "log_min_duration_statement=2000"]

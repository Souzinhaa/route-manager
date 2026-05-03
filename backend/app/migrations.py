import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

_USER_COLUMNS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR DEFAULT 'tester'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status VARCHAR DEFAULT 'trial'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent_at TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_consent_ip VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_cpf_cnpj ON users (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",
    (
        "CREATE TABLE IF NOT EXISTS processed_webhooks ("
        "event_id VARCHAR PRIMARY KEY, "
        "created_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
]


def run_migrations(engine) -> None:
    with engine.connect() as conn:
        for sql in _USER_COLUMNS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as exc:
                conn.rollback()
                logger.warning("Migration skipped (%s): %s", sql[:60], exc)
    logger.info("[migrations] users table columns up-to-date.")

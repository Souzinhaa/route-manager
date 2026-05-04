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
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarding BOOLEAN DEFAULT TRUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS coupon_id INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INTEGER",
    (
        "CREATE TABLE IF NOT EXISTS partners ("
        "id SERIAL PRIMARY KEY, "
        "name VARCHAR NOT NULL, "
        "contact_email VARCHAR, "
        "commission_balance NUMERIC(12,2) DEFAULT 0, "
        "is_active BOOLEAN DEFAULT TRUE, "
        "created_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    (
        "CREATE TABLE IF NOT EXISTS coupons ("
        "id SERIAL PRIMARY KEY, "
        "code VARCHAR UNIQUE NOT NULL, "
        "partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL, "
        "is_active BOOLEAN DEFAULT TRUE, "
        "created_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    (
        "CREATE TABLE IF NOT EXISTS transactions ("
        "id SERIAL PRIMARY KEY, "
        "user_id INTEGER NOT NULL, "
        "plan VARCHAR NOT NULL, "
        "amount_paid NUMERIC(12,2) NOT NULL, "
        "full_price NUMERIC(12,2) NOT NULL, "
        "commission_amount NUMERIC(12,2) DEFAULT 0, "
        "coupon_used BOOLEAN DEFAULT FALSE, "
        "coupon_id INTEGER, "
        "partner_id INTEGER, "
        "asaas_payment_id VARCHAR UNIQUE NOT NULL, "
        "event_type VARCHAR NOT NULL, "
        "created_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    "CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_partner ON transactions(partner_id)",
    (
        "UPDATE users SET is_onboarding = FALSE "
        "WHERE is_onboarding = TRUE "
        "AND (plan_status = 'active' OR subscription_id IS NOT NULL)"
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

import logging
import secrets
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
    (
        "CREATE TABLE IF NOT EXISTS shared_routes ("
        "id SERIAL PRIMARY KEY, "
        "route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE, "
        "user_id INTEGER NOT NULL REFERENCES users(id), "
        "share_token VARCHAR UNIQUE NOT NULL, "
        "created_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    "CREATE INDEX IF NOT EXISTS idx_shared_routes_token ON shared_routes(share_token)",
    "CREATE INDEX IF NOT EXISTS idx_shared_routes_route ON shared_routes(route_id)",
    "CREATE INDEX IF NOT EXISTS idx_shared_routes_user ON shared_routes(user_id)",
    (
        "CREATE TABLE IF NOT EXISTS plan_configs ("
        "key VARCHAR PRIMARY KEY, "
        "price_full NUMERIC(10,2) NOT NULL, "
        "price_coupon NUMERIC(10,2) NOT NULL, "
        "price_onboarding NUMERIC(10,2) NOT NULL, "
        "has_onboarding_discount BOOLEAN DEFAULT TRUE NOT NULL, "
        "routes_per_day INTEGER NOT NULL, "
        "max_stops INTEGER NOT NULL, "
        "updated_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('tester',0,0,0,TRUE,1,20) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('basic',49,44,39,TRUE,1,100) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('starter',109,99,89,TRUE,3,100) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('delivery',179,159,149,TRUE,5,150) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('premium',349,319,299,TRUE,10,200) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('enterprise_medio',1200,1200,1200,FALSE,50,300) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('enterprise_avancado',2500,2500,2500,FALSE,100,400) ON CONFLICT (key) DO NOTHING",
    "INSERT INTO plan_configs (key,price_full,price_coupon,price_onboarding,has_onboarding_discount,routes_per_day,max_stops) VALUES ('enterprise_custom',5000,5000,5000,FALSE,-1,-1) ON CONFLICT (key) DO NOTHING",
    # Partner new fields
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone VARCHAR",
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR",
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS pix_key VARCHAR",
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR",
    "ALTER TABLE partners ADD COLUMN IF NOT EXISTS access_token VARCHAR",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_access_token ON partners (access_token) WHERE access_token IS NOT NULL",
    # Payout config (single-row config table)
    (
        "CREATE TABLE IF NOT EXISTS payout_config ("
        "id INTEGER PRIMARY KEY DEFAULT 1, "
        "payout_day INTEGER DEFAULT 5 NOT NULL, "
        "auto_enabled BOOLEAN DEFAULT FALSE NOT NULL, "
        "last_run_month VARCHAR(7), "
        "updated_at TIMESTAMP DEFAULT NOW()"
        ")"
    ),
    "INSERT INTO payout_config (id, payout_day, auto_enabled) VALUES (1, 5, FALSE) ON CONFLICT (id) DO NOTHING",
    # Composite indexes for hot query paths
    "CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date)",
    "CREATE INDEX IF NOT EXISTS idx_routes_user_created ON routes(user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(code, is_active)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_partner_created ON transactions(partner_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_users_plan_status ON users(plan, plan_status)",
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

        # Generate access_token for any partner missing one
        try:
            partners = conn.execute(text("SELECT id FROM partners WHERE access_token IS NULL")).fetchall()
            for row in partners:
                token = secrets.token_urlsafe(32)
                conn.execute(text("UPDATE partners SET access_token = :t WHERE id = :id"), {"t": token, "id": row[0]})
            if partners:
                conn.commit()
                logger.info("[migrations] Generated access tokens for %d partners.", len(partners))
        except Exception as exc:
            conn.rollback()
            logger.warning("[migrations] Could not generate partner tokens: %s", exc)

    logger.info("[migrations] users table columns up-to-date.")

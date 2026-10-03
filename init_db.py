"""Create the PostgreSQL schema used by Flowdesk."""
from sqlalchemy import text
from db_connection import engine

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS accounts (
        account_id SERIAL PRIMARY KEY,
        signup_date DATE NOT NULL,
        channel VARCHAR(40) NOT NULL,
        company_size VARCHAR(30) NOT NULL,
        plan_tier VARCHAR(30) NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        role VARCHAR(30) NOT NULL,
        signup_date DATE NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS onboarding_events (
        onboarding_event_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        step_name VARCHAR(60) NOT NULL,
        event_ts TIMESTAMP NOT NULL,
        completed BOOLEAN NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS feature_usage (
        feature_usage_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        feature_name VARCHAR(60) NOT NULL,
        usage_ts TIMESTAMP NOT NULL,
        usage_count INTEGER NOT NULL CHECK (usage_count >= 1)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        ticket_ts TIMESTAMP NOT NULL,
        category VARCHAR(40) NOT NULL,
        sla_breached BOOLEAN NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS subscriptions (
        subscription_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        plan VARCHAR(30) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        mrr NUMERIC(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS billing_events (
        billing_event_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        event_type VARCHAR(30) NOT NULL,
        event_ts TIMESTAMP NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS exit_survey_responses (
        response_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        response_ts TIMESTAMP NOT NULL,
        satisfaction_rating INTEGER NOT NULL CHECK (satisfaction_rating BETWEEN 1 AND 5),
        reason_category VARCHAR(50) NOT NULL,
        feedback_text TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS marketing_events (
        marketing_event_id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        channel_boosted VARCHAR(40) NOT NULL
    )
    """,
]

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id)",
    "CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_events(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_onboarding_step ON onboarding_events(step_name)",
    "CREATE INDEX IF NOT EXISTS idx_feature_user_ts ON feature_usage(user_id, usage_ts)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_account_ts ON support_tickets(account_id, ticket_ts)",
    "CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id)",
    "CREATE INDEX IF NOT EXISTS idx_billing_account_ts ON billing_events(account_id, event_ts)",
    "CREATE INDEX IF NOT EXISTS idx_exit_account ON exit_survey_responses(account_id)",
]

with engine.begin() as conn:
    for sql in TABLES:
        conn.execute(text(sql))
    for sql in INDEXES:
        conn.execute(text(sql))

print("PostgreSQL schema is ready.")

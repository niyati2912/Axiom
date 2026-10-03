from sqlalchemy import text
from backend.db import get_engine

try:
    with get_engine().connect() as c:
        print("connected to:", c.execute(text("select current_database()")).scalar())
        tables = c.execute(text("select table_name from information_schema.tables where table_schema='public'")).scalars().all()
        print("tables:", tables)
        for t in ["accounts", "users", "onboarding_events", "feature_usage", "support_tickets", "subscriptions", "billing_events", "exit_survey_responses"]:
            try:
                print(t, c.execute(text(f"select count(*) from {t}")).scalar())
            except Exception as e:
                c.rollback()
                print(t, "ERROR:", str(e).splitlines()[0])
except Exception as e:
    print("CONNECTION FAILED:", str(e).splitlines()[0])
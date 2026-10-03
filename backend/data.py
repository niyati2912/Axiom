"""Data loaders. Everything is derived from the base tables created by generate_all_data.py
(accounts, users, onboarding_events, feature_usage, support_tickets, subscriptions,
billing_events, exit_survey_responses, marketing_events), so no extra views are required."""
import pandas as pd

from backend import config
from backend.db import read_sql
from backend.utils.cache import ttl_cache

FUNNEL_STEPS = ["signup", "email_verified", "workspace_created", "invited_teammate",
                "first_task_created", "returned_day7", "converted_to_paid"]

ACCOUNT_SQL = """
SELECT a.account_id, a.signup_date, a.channel, a.company_size,
       s.plan, s.start_date, s.end_date, s.mrr, s.status,
       COALESCE(f.week1_feature_count, 0) AS week1_feature_count,
       COALESCE(f.distinct_features, 0)   AS distinct_features,
       COALESCE(f.total_usage, 0)         AS total_usage,
       COALESCE(f.first30_usage, 0)       AS first30_usage,
       COALESCE(t.ticket_count, 0)        AS ticket_count,
       COALESCE(t.sla_breaches, 0)        AS sla_breaches,
       (COALESCE(t.week1_tickets, 0) > 0) AS had_week1_ticket,
       COALESCE(uc.user_count, 0)         AS user_count
FROM accounts a
LEFT JOIN subscriptions s ON s.account_id = a.account_id
LEFT JOIN (
    SELECT u.account_id,
           COUNT(DISTINCT CASE WHEN fu.usage_ts < a2.signup_date + INTERVAL '8 days'
                               THEN fu.feature_name END) AS week1_feature_count,
           COUNT(DISTINCT fu.feature_name) AS distinct_features,
           SUM(fu.usage_count) AS total_usage,
           SUM(CASE WHEN fu.usage_ts < a2.signup_date + INTERVAL '31 days'
                    THEN fu.usage_count ELSE 0 END) AS first30_usage
    FROM feature_usage fu
    JOIN users u ON u.user_id = fu.user_id
    JOIN accounts a2 ON a2.account_id = u.account_id
    GROUP BY u.account_id
) f ON f.account_id = a.account_id
LEFT JOIN (
    SELECT st.account_id,
           COUNT(*) AS ticket_count,
           SUM(CASE WHEN st.sla_breached THEN 1 ELSE 0 END) AS sla_breaches,
           SUM(CASE WHEN st.ticket_ts < a3.signup_date + INTERVAL '8 days' THEN 1 ELSE 0 END) AS week1_tickets
    FROM support_tickets st
    JOIN accounts a3 ON a3.account_id = st.account_id
    GROUP BY st.account_id
) t ON t.account_id = a.account_id
LEFT JOIN (SELECT account_id, COUNT(*) AS user_count FROM users GROUP BY account_id) uc
       ON uc.account_id = a.account_id
"""


@ttl_cache
def load_accounts() -> pd.DataFrame:
    df = read_sql(ACCOUNT_SQL)
    for c in ("signup_date", "start_date", "end_date"):
        df[c] = pd.to_datetime(df[c])
    df = df.sort_values(["account_id", "start_date"]).drop_duplicates("account_id", keep="last")
    df["had_week1_ticket"] = df["had_week1_ticket"].fillna(False).astype(int)
    df["week1_feature_count"] = df["week1_feature_count"].astype(int)
    df["converted"] = df["status"].notna()
    df["churned"] = (df["status"] == "churned").astype(int)
    df["mrr"] = df["mrr"].fillna(0).astype(float)
    df["cohort"] = (df["signup_date"] >= pd.Timestamp(config.REDESIGN_DATE)).map(
        {True: "post_redesign", False: "pre_redesign"})
    return df.reset_index(drop=True)


@ttl_cache
def load_onboarding() -> pd.DataFrame:
    df = read_sql("""
        SELECT u.account_id, oe.step_name, oe.completed, oe.event_ts,
               a.channel, a.company_size, a.signup_date
        FROM onboarding_events oe
        JOIN users u ON u.user_id = oe.user_id
        JOIN accounts a ON a.account_id = u.account_id
    """)
    df["signup_date"] = pd.to_datetime(df["signup_date"])
    df["cohort"] = (df["signup_date"] >= pd.Timestamp(config.REDESIGN_DATE)).map(
        {True: "post_redesign", False: "pre_redesign"})
    return df


@ttl_cache
def load_feature_events() -> pd.DataFrame:
    df = read_sql("""
        SELECT u.account_id, fu.feature_name, fu.usage_ts, fu.usage_count, a.signup_date
        FROM feature_usage fu
        JOIN users u ON u.user_id = fu.user_id
        JOIN accounts a ON a.account_id = u.account_id
    """)
    df["usage_ts"] = pd.to_datetime(df["usage_ts"])
    df["signup_date"] = pd.to_datetime(df["signup_date"])
    return df


@ttl_cache
def load_exit_surveys() -> pd.DataFrame:
    df = read_sql("""
        SELECT e.account_id, e.response_ts, e.satisfaction_rating, e.reason_category,
               e.feedback_text, a.channel, a.company_size
        FROM exit_survey_responses e
        JOIN accounts a ON a.account_id = e.account_id
    """)
    df["response_ts"] = pd.to_datetime(df["response_ts"])
    return df


@ttl_cache
def load_tickets() -> pd.DataFrame:
    df = read_sql("SELECT account_id, ticket_ts, category, sla_breached FROM support_tickets")
    df["ticket_ts"] = pd.to_datetime(df["ticket_ts"])
    return df


@ttl_cache
def load_billing() -> pd.DataFrame:
    df = read_sql("SELECT account_id, event_type, event_ts FROM billing_events")
    df["event_ts"] = pd.to_datetime(df["event_ts"])
    return df


def rate_by(df: pd.DataFrame, col: str) -> list[dict]:
    """Churn rate (churned / converted) grouped by a column. Expects converted-only rows."""
    g = df.groupby(col, observed=True)["churned"].agg(["count", "sum", "mean"]).reset_index()
    return [{"key": r[col], "n": int(r["count"]), "churned": int(r["sum"]), "rate": float(r["mean"])}
            for _, r in g.iterrows()]

def load_churn_dataset(horizon_days: int = 90) -> pd.DataFrame:
    df = load_accounts().copy()
    today = pd.Timestamp.today().normalize()
    eligible = df[
        df.converted
        & df.start_date.notna()
        & (df.start_date + pd.Timedelta(days=horizon_days) <= today)
    ].copy()
    eligible["churned_90d"] = (
        eligible.end_date.notna()
        & (eligible.end_date <= eligible.start_date + pd.Timedelta(days=horizon_days))
    ).astype(int)
    return eligible
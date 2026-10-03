"""Generate a reproducible 18-month B2B SaaS analytics dataset.

The generator creates realistic event history rather than precomputed analytics
views. All findings must be discovered from the base tables.
"""
from datetime import date, datetime, timedelta
import os
import random

import numpy as np
import pandas as pd
from sqlalchemy import text

from db_connection import engine

SEED = 42
NUM_ACCOUNTS = 4000
HISTORY_DAYS = 548  # ~18 months
TODAY = date.today()
REDESIGN_DATE = date.fromisoformat(os.getenv("REDESIGN_DATE") or (TODAY - timedelta(days=274)).isoformat())

random.seed(SEED)
np.random.seed(SEED)

CHANNELS = ["organic", "paid_search", "referral", "content"]
CHANNEL_WEIGHTS = [0.45, 0.28, 0.17, 0.10]
SIZES = ["solo", "team", "enterprise"]
SIZE_WEIGHTS = [0.55, 0.35, 0.10]
FEATURES = ["task_board", "templates", "integrations", "comments", "automation", "reporting"]
FUNNEL = ["signup", "email_verified", "workspace_created", "invited_teammate",
          "first_task_created", "returned_day7", "converted_to_paid"]


def clamp(x, lo=0.01, hi=0.99):
    return max(lo, min(hi, x))


def wipe():
    with engine.begin() as conn:
        conn.execute(text("""
            TRUNCATE TABLE
                exit_survey_responses, support_tickets, billing_events,
                subscriptions, feature_usage, onboarding_events,
                users, marketing_events, accounts
            RESTART IDENTITY CASCADE;
        """))


def main():
    wipe()

    # ---------------- Accounts ----------------
    accounts = []
    for _ in range(NUM_ACCOUNTS):
        signup = TODAY - timedelta(days=random.randint(0, HISTORY_DAYS))
        accounts.append({
            "signup_date": signup,
            "channel": random.choices(CHANNELS, CHANNEL_WEIGHTS)[0],
            "company_size": random.choices(SIZES, SIZE_WEIGHTS)[0],
            "plan_tier": "free",
        })
    accounts_df = pd.DataFrame(accounts)
    accounts_df.to_sql("accounts", engine, if_exists="append", index=False, method="multi")
    accounts_df = pd.read_sql("SELECT * FROM accounts ORDER BY account_id", engine)

    # ---------------- Users ----------------
    users = []
    for r in accounts_df.itertuples(index=False):
        ranges = {"solo": (1, 1), "team": (2, 8), "enterprise": (8, 25)}
        lo, hi = ranges[r.company_size]
        for i in range(random.randint(lo, hi)):
            users.append({
                "account_id": r.account_id,
                "role": "admin" if i == 0 else "member",
                "signup_date": r.signup_date,
            })
    pd.DataFrame(users).to_sql("users", engine, if_exists="append", index=False, method="multi")
    users_df = pd.read_sql("SELECT * FROM users ORDER BY user_id", engine)
    primary = users_df[users_df.role == "admin"].merge(
        accounts_df.drop(columns=["signup_date"]), on="account_id"
    )

    # ---------------- Onboarding ----------------
    # The redesign is deliberately segment-specific. Do not infer its exact rule
    # from this comment; the analytical task is to discover the affected segment.
    base = {
        "organic": [1.00, .86, .72, .48, .58, .51, .22],
        "paid_search": [1.00, .76, .57, .31, .43, .32, .12],
        "referral": [1.00, .91, .81, .61, .67, .62, .31],
        "content": [1.00, .81, .63, .36, .47, .37, .16],
    }
    gaps = [0, 1/5, 1, 2, 3, 7, 14]
    onboarding = []
    converted = set()
    for r in primary.itertuples(index=False):
        cum = base[r.channel]
        probs = [1.0] + [cum[i] / cum[i - 1] for i in range(1, len(cum))]
        # Hidden synthetic intervention: exactly one segment is affected after launch.
        if r.signup_date >= REDESIGN_DATE and r.company_size == "team":
            probs[3] = clamp(probs[3] * 1.42)
        still = True
        for step, p, gap in zip(FUNNEL, probs, gaps):
            done = step == "signup" or (still and random.random() < p)
            still = done
            ts = pd.Timestamp(r.signup_date) + pd.Timedelta(days=gap)
            onboarding.append({"user_id": r.user_id, "step_name": step,
                               "event_ts": ts.to_pydatetime(), "completed": bool(done)})
            if step == "converted_to_paid" and done:
                converted.add(r.account_id)
    pd.DataFrame(onboarding).to_sql("onboarding_events", engine, if_exists="append", index=False, method="multi")

    # ---------------- Week-1 product behavior ----------------
    # Generate behavior for all accounts old enough to observe a week. This avoids
    # conditioning activation features on conversion and keeps the funnel/retention
    # analysis honest.
    feature_rows = []
    feature_profile = {}
    for r in primary.itertuples(index=False):
        signup = pd.Timestamp(r.signup_date)
        age = (pd.Timestamp(TODAY) - signup).days
        if age < 7:
            continue
        # More engaged users tend to use several features; one feature has a
        # deliberately non-obvious relationship with eventual churn.
        lam = {"solo": 1.5, "team": 2.0, "enterprise": 2.5}[r.company_size]
        n_features = int(np.clip(np.random.poisson(lam), 0, len(FEATURES)))
        chosen = random.sample(FEATURES, n_features)
        feature_profile[r.account_id] = set(chosen)
        for feat in chosen:
            feature_rows.append({
                "user_id": r.user_id,
                "feature_name": feat,
                "usage_ts": (signup + pd.Timedelta(days=random.randint(0, 6))).to_pydatetime(),
                "usage_count": random.randint(1, 5),
            })

        # Later usage is bounded by today and only starts after week 1.
        later_days = max(0, age - 7)
        for _ in range(int(max(0, np.random.poisson(n_features * .8)))):
            offset = random.randint(8, later_days) if later_days >= 8 else None
            if offset is not None:
                feature_rows.append({
                    "user_id": r.user_id,
                    "feature_name": random.choice(chosen or FEATURES),
                    "usage_ts": (signup + pd.Timedelta(days=offset)).to_pydatetime(),
                    "usage_count": random.randint(1, 4),
                })
    if feature_rows:
        pd.DataFrame(feature_rows).to_sql("feature_usage", engine, if_exists="append", index=False, method="multi")

    # ---------------- Support ----------------
    tickets = []
    for r in primary.itertuples(index=False):
        age = (pd.Timestamp(TODAY) - pd.Timestamp(r.signup_date)).days
        for _ in range(np.random.poisson(.7)):
            if age <= 0:
                continue
            offset = random.randint(0, age)
            tickets.append({
                "account_id": r.account_id,
                "ticket_ts": (pd.Timestamp(r.signup_date) + pd.Timedelta(days=offset)).to_pydatetime(),
                "category": random.choice(["billing", "bug", "how_to"]),
                "sla_breached": random.random() < .10,
            })
    if tickets:
        pd.DataFrame(tickets).to_sql("support_tickets", engine, if_exists="append", index=False, method="multi")

    # ---------------- Subscription / churn / billing ----------------
    ticket_df = pd.read_sql("SELECT * FROM support_tickets", engine)
    if not ticket_df.empty:
        ticket_df["ticket_ts"] = pd.to_datetime(ticket_df["ticket_ts"])
        signup_map = dict(zip(accounts_df.account_id, pd.to_datetime(accounts_df.signup_date)))
        ticket_df["signup_ts"] = ticket_df.account_id.map(signup_map)
        week1_ticket = set(ticket_df.loc[
            ticket_df.ticket_ts < ticket_df.signup_ts + pd.Timedelta(days=8),
            "account_id"
        ])
    else:
        week1_ticket = set()

    subs, billing, exits = [], [], []
    for r in primary.itertuples(index=False):
        if r.account_id not in converted:
            continue
        signup = pd.Timestamp(r.signup_date)
        convert = signup + pd.Timedelta(days=14)
        age_at_today = (pd.Timestamp(TODAY) - convert).days
        if age_at_today < 0:
            # A recent conversion cannot have churned yet; keep it active.
            age_at_today = 0
        feats = feature_profile.get(r.account_id, set())
        n = len(feats)

        # Base churn risk + early behavior. The exact nonlinear pattern is meant
        # to be discovered from analysis rather than hard-coded into the dashboard.
        p = {"solo": .50, "team": .34, "enterprise": .22}[r.company_size]
        p -= .085 * min(n, 4)
        if r.account_id in week1_ticket:
            p += .09
        if "integrations" in feats:
            p += .14
        p = clamp(p, .03, .82)
        eligible = age_at_today >= 45
        churned = eligible and random.random() < p

        plan = "enterprise" if r.company_size == "enterprise" else "pro"
        mrr = 299 if plan == "enterprise" else 29
        billing.append({"account_id": r.account_id, "event_type": "trial_start", "event_ts": signup.to_pydatetime()})
        billing.append({"account_id": r.account_id, "event_type": "convert", "event_ts": convert.to_pydatetime()})

        if churned:
            churn_offset = random.randint(30, max(31, age_at_today))
            churn_date = min(convert + pd.Timedelta(days=churn_offset), pd.Timestamp(TODAY))
            reason = random.choices(
                ["too_expensive", "missing_features", "switched_competitor", "no_longer_needed", "other"],
                [0.22, 0.27, 0.18, 0.18, 0.15]
            )[0]
            exits.append({
                "account_id": r.account_id,
                "response_ts": churn_date.to_pydatetime(),
                "satisfaction_rating": random.randint(1, 3),
                "reason_category": reason,
                "feedback_text": {
                    "too_expensive": "The pricing did not match the value we were getting.",
                    "missing_features": "We needed functionality that was not available.",
                    "switched_competitor": "We moved to a competitor that fit our workflow better.",
                    "no_longer_needed": "Our team's needs changed.",
                    "other": "It was not the right fit for us.",
                }[reason],
            })
            subs.append({"account_id": r.account_id, "plan": plan,
                         "start_date": convert.date(), "end_date": churn_date.date(),
                         "mrr": 0, "status": "churned"})
            billing.append({"account_id": r.account_id, "event_type": "churn", "event_ts": churn_date.to_pydatetime()})
        else:
            subs.append({"account_id": r.account_id, "plan": plan,
                         "start_date": convert.date(), "end_date": None,
                         "mrr": mrr, "status": "active"})

    for table, rows in [("subscriptions", subs), ("billing_events", billing), ("exit_survey_responses", exits)]:
        if rows:
            pd.DataFrame(rows).to_sql(table, engine, if_exists="append", index=False, method="multi")

    marketing = [
        {"campaign_name": "Diwali Sale", "start_date": TODAY - timedelta(days=300), "end_date": TODAY - timedelta(days=285), "channel_boosted": "paid_search"},
        {"campaign_name": "New Year Promo", "start_date": TODAY - timedelta(days=180), "end_date": TODAY - timedelta(days=170), "channel_boosted": "content"},
        {"campaign_name": "Summer Referral Push", "start_date": TODAY - timedelta(days=90), "end_date": TODAY - timedelta(days=75), "channel_boosted": "referral"},
    ]
    pd.DataFrame(marketing).to_sql("marketing_events", engine, if_exists="append", index=False, method="multi")

    print(f"Generated {len(accounts_df):,} accounts.")
    print(f"Redesign date: {REDESIGN_DATE.isoformat()}")
    print(f"Converted accounts: {len(converted):,}")
    print("Data generation complete.")


if __name__ == "__main__":
    main()

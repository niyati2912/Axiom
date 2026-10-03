"""Overview, user analytics, churn analysis, behavior, retention and acquisition (all from real DB data)."""
import pandas as pd

from backend import data
from backend.data import rate_by


def _bucket_week1(n: int) -> str:
    return "0" if n == 0 else "1-2" if n <= 2 else "3+"


def _month(s: pd.Series) -> pd.Series:
    return s.dt.to_period("M").astype(str)


def overview() -> dict:
    df = data.load_accounts()
    conv = df[df.converted]
    active = conv[conv.status == "active"]
    today = pd.Timestamp.today().normalize()

    signups = df.groupby(_month(df.signup_date)).size()
    converted_m = conv.groupby(_month(conv.start_date)).size()
    churn_m = conv[conv.churned == 1].groupby(_month(conv[conv.churned == 1].end_date)).size()

    # paying accounts at each month end
    months = pd.period_range(df.signup_date.min(), today, freq="M")
    paying = []
    for m in months:
        end = m.to_timestamp(how="end").normalize()
        n = int(((conv.start_date <= end) & (conv.end_date.isna() | (conv.end_date > end))).sum())
        paying.append({"month": str(m), "paying_accounts": n})

    timeline = [{"month": str(m), "signups": int(signups.get(str(m), 0)),
                 "conversions": int(converted_m.get(str(m), 0)),
                 "churned": int(churn_m.get(str(m), 0))} for m in months]

    ob = data.load_onboarding()
    n_ob = ob.account_id.nunique()
    reached = lambda step: ob[(ob.step_name == step) & ob.completed].account_id.nunique()

    return {
        "kpis": {
            "accounts": int(len(df)),
            "converted_accounts": int(len(conv)),
            "conversion_rate": float(len(conv) / len(df)) if len(df) else None,
            "activation_rate": reached("first_task_created") / n_ob if n_ob else None,
            "day7_return_rate": reached("returned_day7") / n_ob if n_ob else None,
            "active_subscriptions": int(len(active)),
            "churned_subscriptions": int(conv.churned.sum()),
            "churn_rate": float(conv.churned.mean()) if len(conv) else None,
            "mrr": float(active.mrr.sum()),
        },
        "timeline": timeline,
        "paying_accounts": paying,
        "mrr_by_plan": [{"key": k, "value": float(v)} for k, v in active.groupby("plan").mrr.sum().items()],
        "churn_by_size": rate_by(conv, "company_size"),
    }


def users() -> dict:
    df = data.load_accounts()
    conv = df[df.converted]
    by = lambda col: [{"key": k, "n": int(v)} for k, v in df.groupby(col).size().items()]
    conv_rate = lambda col: [{"key": k, "n": int(len(g)), "converted": int(g.converted.sum()),
                              "rate": float(g.converted.mean())} for k, g in df.groupby(col)]
    feats = data.load_feature_events()
    feature_totals = (feats.groupby("feature_name")
                      .agg(events=("usage_count", "sum"), accounts=("account_id", "nunique"))
                      .reset_index().sort_values("events", ascending=False))
    seats = df.groupby("company_size").user_count.agg(["mean", "sum"]).reset_index()
    return {
        "by_channel": by("channel"),
        "by_size": by("company_size"),
        "conversion_by_channel": conv_rate("channel"),
        "conversion_by_size": conv_rate("company_size"),
        "signups_by_month": [{"month": k, "n": int(v)} for k, v in df.groupby(_month(df.signup_date)).size().items()],
        "seats_by_size": [{"key": r.company_size, "avg_users": float(r["mean"]), "users": int(r["sum"])}
                          for _, r in seats.iterrows()],
        "total_users": int(df.user_count.sum()),
        "feature_usage": feature_totals.to_dict("records"),
        "plan_mix": [{"key": k, "n": int(v)} for k, v in conv.groupby("plan").size().items()],
    }


def churn() -> dict:
    df = data.load_accounts()
    conv = df[df.converted].copy()
    conv["week1_bucket"] = conv.week1_feature_count.map(_bucket_week1)
    conv["week1_ticket"] = conv.had_week1_ticket.map({1: "yes", 0: "no"})

    heat = []
    for (size, bucket), g in conv.groupby(["company_size", "week1_bucket"]):
        heat.append({"company_size": size, "week1_bucket": bucket, "n": int(len(g)), "rate": float(g.churned.mean())})

    ch = conv[conv.churned == 1]
    tenure = (ch.end_date - ch.start_date).dt.days.clip(lower=0)
    return {
        "overall_rate": float(conv.churned.mean()) if len(conv) else None,
        "by_size": rate_by(conv, "company_size"),
        "by_channel": rate_by(conv, "channel"),
        "by_plan": rate_by(conv, "plan"),
        "by_week1_features": rate_by(conv, "week1_feature_count"),
        "by_week1_ticket": rate_by(conv, "week1_ticket"),
        "by_ticket_count": rate_by(conv.assign(tickets=conv.ticket_count.clip(upper=4)), "tickets"),
        "size_x_adoption": heat,
        "churned_per_month": [{"month": k, "n": int(v)} for k, v in
                              ch.groupby(_month(ch.end_date)).size().items()],
        "tenure_at_churn": {"median_days": float(tenure.median()) if len(tenure) else None,
                            "mean_days": float(tenure.mean()) if len(tenure) else None},
        "note": "Rates are churned / converted accounts. Recent cohorts have had less time to churn.",
    }


def behavior() -> dict:
    df = data.load_accounts()
    conv = df[df.converted].set_index("account_id")
    ev = data.load_feature_events()
    ev = ev[ev.account_id.isin(conv.index)]
    week1 = ev[ev.usage_ts < ev.signup_date + pd.Timedelta(days=8)]

    rows = []
    for feat in sorted(ev.feature_name.unique()):
        adopters = set(week1[week1.feature_name == feat].account_id)
        a = conv[conv.index.isin(adopters)]
        n = conv[~conv.index.isin(adopters)]
        if len(a) == 0 or len(n) == 0:
            continue
        rows.append({"feature": feat, "adopters": int(len(a)), "adopter_churn": float(a.churned.mean()),
                     "non_adopter_churn": float(n.churned.mean()),
                     "difference": float(a.churned.mean() - n.churned.mean())})
    rows.sort(key=lambda r: r["difference"])

    ob = data.load_onboarding()
    ob = ob[ob.account_id.isin(conv.index)]
    steps = []
    for step in data.FUNNEL_STEPS[1:-1]:
        done = set(ob[(ob.step_name == step) & ob.completed].account_id)
        a, n = conv[conv.index.isin(done)], conv[~conv.index.isin(done)]
        if len(a) and len(n):
            steps.append({"step": step, "completed_n": int(len(a)), "completed_churn": float(a.churned.mean()),
                          "skipped_n": int(len(n)), "skipped_churn": float(n.churned.mean())})

    eng = conv.copy()
    eng["engagement"] = pd.cut(eng.first30_usage, [-1, 0, 5, 15, 10**9],
                               labels=["none", "1-5", "6-15", "16+"])
    return {
        "feature_adoption": rows,
        "onboarding_steps": steps,
        "by_engagement": rate_by(eng.reset_index(), "engagement"),
        "avg_usage": {"churned": float(conv[conv.churned == 1].first30_usage.mean()),
                      "active": float(conv[conv.churned == 0].first30_usage.mean())},
        "note": "Adoption and usage are measured in the first 7 / 30 days after signup so that "
                "longer-lived accounts don't look more engaged just from having more time.",
    }


def retention() -> dict:
    df = data.load_accounts()
    today = pd.Timestamp.today().normalize()
    df = df.assign(month=_month(df.signup_date))
    conv = df[df.converted]
    horizons = (30, 90, 180)

    cohorts = []
    for month, g in df.groupby("month"):
        c = g[g.converted]
        row = {"month": month, "signups": int(len(g)), "converted": int(len(c)),
               "conversion_rate": float(len(c) / len(g))}
        for h in horizons:
            eligible = c[c.start_date + pd.Timedelta(days=h) <= today]
            kept = eligible[eligible.end_date.isna() | (eligible.end_date > eligible.start_date + pd.Timedelta(days=h))]
            row[f"retained_{h}"] = float(len(kept) / len(eligible)) if len(eligible) else None
            row[f"eligible_{h}"] = int(len(eligible))
        cohorts.append(row)

    by_size = []
    for size, g in conv.groupby("company_size"):
        row = {"key": size}
        for h in horizons:
            e = g[g.start_date + pd.Timedelta(days=h) <= today]
            kept = e[e.end_date.isna() | (e.end_date > e.start_date + pd.Timedelta(days=h))]
            row[f"retained_{h}"] = float(len(kept) / len(e)) if len(e) else None
        by_size.append(row)

    conv_size = []
    for (month, size), g in df.groupby(["month", "company_size"]):
        conv_size.append({"month": month, "company_size": size, "conversion_rate": float(g.converted.mean()), "n": int(len(g))})
    return {"horizons": list(horizons), "cohorts": cohorts, "by_size": by_size,
            "conversion_by_month_size": conv_size,
            "note": "Retention at N days counts only accounts old enough to be observed at N days."}


def acquisition() -> dict:
    """Per-channel comparison. Activation = primary user created a first task."""
    df = data.load_accounts()
    ob = data.load_onboarding()
    today = pd.Timestamp.today().normalize()
    activated = set(ob[(ob.step_name == "first_task_created") & ob.completed].account_id)
    df = df.assign(activated=df.account_id.isin(activated))

    channels = []
    for ch, g in df.groupby("channel"):
        c = g[g.converted]
        elig = c[c.start_date + pd.Timedelta(days=90) <= today]
        kept = elig[elig.end_date.isna() | (elig.end_date > elig.start_date + pd.Timedelta(days=90))]
        channels.append({
            "channel": ch,
            "signups": int(len(g)),
            "activation_rate": float(g.activated.mean()),
            "conversion_rate": float(g.converted.mean()),
            "churn_rate": float(c.churned.mean()) if len(c) else None,
            "retained_90": float(len(kept) / len(elig)) if len(elig) else None,
            "mrr": float(c[c.status == "active"].mrr.sum()),
        })
    monthly = (df.assign(month=_month(df.signup_date))
                 .groupby(["month", "channel"]).size().reset_index(name="signups"))
    return {"channels": channels, "monthly": monthly.to_dict("records")}
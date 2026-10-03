import pandas as pd

from backend import data
from backend.ml import model as ml


def _scored_or_plain() -> pd.DataFrame:
    df = data.load_accounts().copy()
    try:
        s = ml.scored_accounts()[["account_id", "risk", "tier"]]
        return df.merge(s, on="account_id", how="left")
    except Exception:  # model missing/unavailable: still serve the account list
        df["risk"], df["tier"] = None, None
        return df


def status_of(row) -> str:
    return row["status"] if isinstance(row["status"], str) else "not_converted"


def list_accounts(q=None, status=None, size=None, channel=None, tier=None,
                  sort="account_id", order="asc", page=1, page_size=25) -> dict:
    df = _scored_or_plain()
    df["state"] = df["status"].fillna("not_converted")
    if q and q.strip().isdigit():
        df = df[df.account_id == int(q)]
    if status:
        df = df[df.state == status]
    if size:
        df = df[df.company_size == size]
    if channel:
        df = df[df.channel == channel]
    if tier:
        df = df[df.tier == tier]
    sort = sort if sort in df.columns else "account_id"
    df = df.sort_values(sort, ascending=(order != "desc"), na_position="last")
    total = len(df)
    page = max(1, page)
    view = df.iloc[(page - 1) * page_size: page * page_size]
    cols = ["account_id", "signup_date", "channel", "company_size", "state", "plan", "mrr",
            "week1_feature_count", "had_week1_ticket", "ticket_count", "user_count", "risk", "tier"]
    return {"total": int(total), "page": page, "page_size": page_size,
            "rows": view[cols].rename(columns={"state": "status"}).to_dict("records")}


def account_detail(account_id: int) -> dict | None:
    df = _scored_or_plain()
    row = df[df.account_id == account_id]
    if row.empty:
        return None
    r = row.iloc[0]
    ob = data.load_onboarding()
    ob = ob[ob.account_id == account_id].sort_values("event_ts")
    billing = data.load_billing()
    billing = billing[billing.account_id == account_id].sort_values("event_ts")
    tickets = data.load_tickets()
    tickets = tickets[tickets.account_id == account_id].sort_values("ticket_ts")
    feats = data.load_feature_events()
    feats = feats[feats.account_id == account_id]
    exit_ = data.load_exit_surveys()
    exit_ = exit_[exit_.account_id == account_id]

    explanation = None
    if r.converted:
        try:
            explanation = ml.explain_account(account_id)
        except Exception:
            explanation = None

    return {
        "account": {**r[["account_id", "signup_date", "channel", "company_size", "plan", "start_date", "end_date",
                         "mrr", "week1_feature_count", "had_week1_ticket", "ticket_count", "sla_breaches",
                         "user_count"]].to_dict(), "status": status_of(r)},
        "onboarding": ob[["step_name", "completed", "event_ts"]].to_dict("records"),
        "billing": billing[["event_type", "event_ts"]].to_dict("records"),
        "tickets": tickets[["ticket_ts", "category", "sla_breached"]].to_dict("records"),
        "feature_usage": [{"feature": k, "events": int(v)} for k, v in
                          feats.groupby("feature_name").usage_count.sum().sort_values(ascending=False).items()],
        "exit_survey": exit_[["response_ts", "satisfaction_rating", "reason_category", "feedback_text"]].to_dict("records"),
        "prediction": explanation,
    }
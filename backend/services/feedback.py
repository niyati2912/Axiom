import re

import pandas as pd

from backend import data


def feedback() -> dict:
    fb = data.load_exit_surveys()
    if fb.empty:
        return {"total": 0}
    features = sorted(data.load_feature_events().feature_name.unique())
    pattern = re.compile("|".join(re.escape(f) for f in features), re.I) if features else None

    def mentions(text):
        return pattern.findall(text or "") if pattern else []

    mentioned = pd.Series([m.lower() for t in fb.feedback_text for m in mentions(t)]).value_counts()
    by_reason = fb.groupby("reason_category").agg(n=("account_id", "count"), avg=("satisfaction_rating", "mean")).reset_index()
    by_reason["share"] = by_reason.n / by_reason.n.sum()

    def cross(col):
        out = []
        for key, g in fb.groupby(col):
            vc = g.reason_category.value_counts(normalize=True)
            out.append({"key": key, "n": int(len(g)), "reasons": {r: float(v) for r, v in vc.items()}})
        return out

    recent = fb.sort_values("response_ts", ascending=False).head(25)
    return {
        "total": int(len(fb)),
        "avg_satisfaction": float(fb.satisfaction_rating.mean()),
        "reasons": by_reason.sort_values("n", ascending=False).to_dict("records"),
        "satisfaction_distribution": [{"rating": int(k), "n": int(v)} for k, v in fb.satisfaction_rating.value_counts().sort_index().items()],
        "reasons_by_size": cross("company_size"),
        "reasons_by_channel": cross("channel"),
        "requested_features": [{"feature": k, "mentions": int(v)} for k, v in mentioned.items()],
        "per_month": [{"month": k, "responses": int(len(g)), "avg_satisfaction": float(g.satisfaction_rating.mean())}
                      for k, g in fb.groupby(fb.response_ts.dt.to_period("M").astype(str))],
        "recent": recent[["account_id", "response_ts", "satisfaction_rating", "reason_category", "company_size", "channel", "feedback_text"]].to_dict("records"),
    }
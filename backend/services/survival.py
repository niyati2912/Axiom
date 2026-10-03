"""Kaplan-Meier curves and log-rank tests, mirroring survival_analysis.py."""
import numpy as np
import pandas as pd
from lifelines import KaplanMeierFitter
from lifelines.statistics import logrank_test

from backend import config, data


def _prepare() -> pd.DataFrame:
    df = data.load_accounts()
    subs = df[df.converted].copy()
    today = pd.Timestamp.today().normalize()
    subs["duration_days"] = (subs.end_date.fillna(today) - subs.start_date).dt.days.clip(lower=0)
    subs["event_observed"] = subs.churned.astype(int)
    return subs


def _curve(name: str, g: pd.DataFrame) -> dict:
    kmf = KaplanMeierFitter()
    kmf.fit(g.duration_days, g.event_observed, label=name)
    sf = kmf.survival_function_[name]
    ci = kmf.confidence_interval_
    lo, hi = ci.iloc[:, 0], ci.iloc[:, 1]
    idx = np.unique(np.linspace(0, len(sf) - 1, min(len(sf), 160)).astype(int))
    median = kmf.median_survival_time_
    return {"name": name, "n": int(len(g)), "events": int(g.event_observed.sum()),
            "median_days": None if np.isinf(median) else float(median),
            "points": [{"t": float(sf.index[i]), "s": float(sf.iloc[i]),
                        "lo": float(lo.iloc[i]), "hi": float(hi.iloc[i])} for i in idx]}


def survival(by: str = "cohort", segment: str | None = None) -> dict:
    subs = _prepare()
    if segment:
        subs = subs[subs.company_size == segment]
    col = {"cohort": "cohort", "company_size": "company_size", "channel": "channel"}.get(by, "cohort")
    curves = [_curve(str(k), g) for k, g in subs.groupby(col) if len(g) >= 10]

    tests = []
    full = _prepare()
    for name, frame in [("Overall", full)] + [(f"Company size = {s}", full[full.company_size == s])
                                              for s in sorted(full.company_size.unique())]:
        pre, post = frame[frame.cohort == "pre_redesign"], frame[frame.cohort == "post_redesign"]
        if len(pre) < 10 or len(post) < 10:
            continue
        r = logrank_test(pre.duration_days, post.duration_days, pre.event_observed, post.event_observed)
        tests.append({"segment": name, "n_pre": int(len(pre)), "n_post": int(len(post)),
                      "churn_pre": float(pre.event_observed.mean()), "churn_post": float(post.event_observed.mean()),
                      "p_value": float(r.p_value)})
    return {"by": col, "segment": segment, "curves": curves, "redesign_tests": tests,
            "redesign_date": config.REDESIGN_DATE.isoformat(),
            "options": {"sizes": sorted(full.company_size.unique().tolist())}}
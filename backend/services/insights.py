"""Findings generated from the data itself, each with the evidence and a next thing to investigate."""
import pandas as pd

from backend import data
from backend.services import analytics, feedback, funnel


def _pct(x):
    return f"{x * 100:.1f}%"


def build_insights() -> list[dict]:
    out = []
    ch = analytics.churn()
    sizes = sorted(ch["by_size"], key=lambda r: -r["rate"])
    if len(sizes) > 1 and sizes[0]["n"] >= 30:
        a, b = sizes[0], sizes[-1]
        out.append({"title": f"{a['key']} accounts churn most",
                    "evidence": f"{_pct(a['rate'])} of {a['n']} converted {a['key']} accounts have churned vs {_pct(b['rate'])} for {b['key']}.",
                    "investigate": f"Review onboarding and pricing fit for {a['key']} accounts.", "page": "churn"})

    wk = {r["key"]: r for r in ch["by_week1_features"]}
    low = [r for k, r in wk.items() if k <= 1]
    high = [r for k, r in wk.items() if k >= 3]
    if low and high:
        ln, hn = sum(r["n"] for r in low), sum(r["n"] for r in high)
        lr = sum(r["churned"] for r in low) / ln if ln else None
        hr = sum(r["churned"] for r in high) / hn if hn else None
        if lr is not None and hr is not None and ln >= 30 and hn >= 30:
            out.append({"title": "First-week feature adoption separates churners",
                        "evidence": f"Accounts using 0-1 features in week 1 churn at {_pct(lr)}; those using 3+ churn at {_pct(hr)}.",
                        "investigate": "Which activation prompts drive multi-feature use in the first 7 days?", "page": "behavior"})

    tk = {r["key"]: r for r in ch["by_week1_ticket"]}
    if "yes" in tk and "no" in tk and tk["yes"]["n"] >= 30:
        out.append({"title": "Week-1 support contact and churn",
                    "evidence": f"Accounts with a week-1 ticket churn at {_pct(tk['yes']['rate'])} vs {_pct(tk['no']['rate'])} without.",
                    "investigate": "Read the week-1 tickets: what is blocking new accounts?", "page": "behavior"})

    fn = funnel.funnel()
    d = fn["largest_drop"]
    if d and d["pct_of_previous"] is not None:
        out.append({"title": f"Largest onboarding drop-off: {d['step'].replace('_', ' ')}",
                    "evidence": f"Only {_pct(d['pct_of_previous'])} of accounts that reached the previous step complete it ({d['lost']} lost).",
                    "investigate": "Session-level review of what happens between these two steps.", "page": "funnel"})

    fb = feedback.feedback()
    if fb.get("total"):
        top = fb["reasons"][0]
        out.append({"title": f"Top stated exit reason: {top['reason_category'].replace('_', ' ')}",
                    "evidence": f"{_pct(top['share'])} of {fb['total']} exit surveys; average satisfaction {fb['avg_satisfaction']:.1f}/5.",
                    "investigate": "Compare stated reasons with the behavioral signals of the same accounts.", "page": "feedback"})
    return out
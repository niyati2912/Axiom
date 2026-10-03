import pandas as pd

from backend import data


def funnel(channel: str | None = None, company_size: str | None = None, cohort: str | None = None) -> dict:
    ob = data.load_onboarding()
    if channel:
        ob = ob[ob.channel == channel]
    if company_size:
        ob = ob[ob.company_size == company_size]
    if cohort:
        ob = ob[ob.cohort == cohort]

    def steps_for(frame: pd.DataFrame) -> list[dict]:
        counts = frame[frame.completed].groupby("step_name").account_id.nunique()
        out, first, prev = [], None, None
        for step in data.FUNNEL_STEPS:
            n = int(counts.get(step, 0))
            first = n if first is None else first
            out.append({"step": step, "n": n,
                        "pct_of_start": (n / first) if first else None,
                        "pct_of_previous": (n / prev) if prev else None,
                        "lost": (prev - n) if prev is not None else 0})
            prev = n
        return out

    overall = steps_for(ob)
    by_channel = {c: steps_for(g) for c, g in ob.groupby("channel")}
    by_size = {c: steps_for(g) for c, g in ob.groupby("company_size")}
    by_cohort = {c: steps_for(g) for c, g in ob.groupby("cohort")}
    worst = max((s for s in overall[1:] if s["pct_of_previous"] is not None),
                key=lambda s: 1 - s["pct_of_previous"], default=None)
    return {"filters": {"channel": channel, "company_size": company_size, "cohort": cohort},
            "steps": overall, "by_channel": by_channel, "by_size": by_size, "by_cohort": by_cohort,
            "largest_drop": worst,
            "options": {"channels": sorted(data.load_accounts().channel.unique().tolist()),
                        "sizes": sorted(data.load_accounts().company_size.unique().tolist())}}
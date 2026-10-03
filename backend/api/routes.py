from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend import config, data
from backend.ml import model as ml
from backend.services import accounts, analytics, feedback, funnel, insights, survival
from backend.utils.cache import clear_cache
from backend.utils.serialize import jsonable

router = APIRouter()


class PredictRequest(BaseModel):
    channel: Literal["organic", "paid_search", "referral", "content"]
    company_size: Literal["solo", "team", "enterprise"]
    week1_feature_count: int = Field(ge=0, le=20)
    had_week1_ticket: bool


@router.get("/health")
def health():
    return {"status": "ok", "database_configured": not config.missing_db_settings(),
            "model_file_present": config.MODEL_PATH.exists()}


@router.post("/refresh")
def refresh():
    clear_cache()
    ml.reload_model()
    return {"status": "cache cleared, model reloaded"}


@router.get("/overview")
def overview():
    return jsonable({**analytics.overview(), "insights": insights.build_insights()})


@router.get("/users")
def users():
    return jsonable(analytics.users())


@router.get("/acquisition")
def get_acquisition():
    return jsonable(analytics.acquisition())


@router.get("/churn")
def churn():
    return jsonable(analytics.churn())


@router.get("/behavior")
def behavior():
    return jsonable(analytics.behavior())


@router.get("/retention")
def retention():
    return jsonable(analytics.retention())


@router.get("/funnel")
def get_funnel(channel: str | None = None, company_size: str | None = None,
               cohort: Literal["pre_redesign", "post_redesign"] | None = None):
    return jsonable(funnel.funnel(channel, company_size, cohort))


@router.get("/survival")
def get_survival(by: Literal["cohort", "company_size", "channel"] = "cohort", segment: str | None = None):
    return jsonable(survival.survival(by, segment))


@router.get("/feedback")
def get_feedback():
    return jsonable(feedback.feedback())


@router.get("/predictions")
def predictions(tier: Literal["high", "medium", "low"] | None = None, company_size: str | None = None,
                limit: int = Query(50, ge=1, le=500)):
    scored = ml.scored_accounts()
    active = scored[scored.status == "active"]
    if company_size:
        active = active[active.company_size == company_size]
    total_active = len(active)
    tiers = active.tier.value_counts().to_dict()
    filtered = active[active.tier == tier] if tier else active
    top = filtered.sort_values("risk", ascending=False).head(limit)
    cols = ["account_id", "company_size", "channel", "plan", "mrr", "week1_feature_count",
            "had_week1_ticket", "start_date", "risk", "tier", "drivers"]
    return jsonable({
        "summary": {"active_accounts": total_active, "expected_churn": float(active.risk.sum()),
                    "mrr_at_risk": float((active.risk * active.mrr).sum()),
                    "high_risk_mrr": float(active[active.tier == "high"].mrr.sum()),
                    "avg_risk": float(active.risk.mean()) if total_active else None,
                    "tiers": {k: int(tiers.get(k, 0)) for k in ("high", "medium", "low")},
                    "thresholds": ml.risk_thresholds()},
        "rows": top[cols].to_dict("records"),
        "note": "Tiers are relative: high = risk at or above the 80th percentile of active accounts, medium = at or above the median. "
                "The model has few inputs, so many accounts share the same risk and tier sizes can be uneven."})


@router.post("/predict")
def predict(req: PredictRequest):
    return jsonable(ml.predict_one(req.channel, req.company_size, req.week1_feature_count, req.had_week1_ticket))


@router.get("/explainability")
def explainability():
    return jsonable(ml.explainability())


@router.get("/accounts")
def list_accounts(q: str | None = None, status: Literal["active", "churned", "not_converted"] | None = None,
                  size: str | None = None, channel: str | None = None,
                  tier: Literal["high", "medium", "low"] | None = None, sort: str = "account_id",
                  order: Literal["asc", "desc"] = "asc", page: int = Query(1, ge=1),
                  page_size: int = Query(25, ge=1, le=100)):
    return jsonable(accounts.list_accounts(q, status, size, channel, tier, sort, order, page, page_size))


@router.get("/accounts/{account_id}")
def account_detail(account_id: int):
    detail = accounts.account_detail(account_id)
    if detail is None:
        raise HTTPException(404, f"Account {account_id} not found")
    return jsonable(detail)
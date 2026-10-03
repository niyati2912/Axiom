"""90-day churn model serving + XGBoost native SHAP explanations."""
import math
from functools import lru_cache

import numpy as np
import pandas as pd

from backend import config, data
from backend.utils.cache import ttl_cache

BASE_FEATURES = ["week1_feature_count", "had_week1_ticket"]
CATEGORICAL = ["channel", "company_size"]
HORIZON_DAYS = 90


class ModelUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load():
    import xgboost as xgb
    if not config.MODEL_PATH.exists():
        raise ModelUnavailable(
            f"Model file not found at {config.MODEL_PATH}. Run: python -m backend.ml.train"
        )
    clf = xgb.XGBClassifier()
    clf.load_model(str(config.MODEL_PATH))
    names = clf.get_booster().feature_names
    if not names:
        raise ModelUnavailable("Model has no feature names; retrain it.")
    return clf, list(names)


def reload_model():
    _load.cache_clear()
    scored_accounts.cache_clear()


def feature_names() -> list[str]:
    return _load()[1]


def build_matrix(df: pd.DataFrame) -> pd.DataFrame:
    names = feature_names()
    X = pd.DataFrame(index=df.index)
    for n in names:
        if n in BASE_FEATURES:
            X[n] = df[n].astype(float)
        else:
            col = next((c for c in CATEGORICAL if n.startswith(c + "_")), None)
            X[n] = (df[col] == n[len(col) + 1:]).astype(float) if col else 0.0
    return X[names]


def predict_proba(df: pd.DataFrame) -> np.ndarray:
    clf, _ = _load()
    return clf.predict_proba(build_matrix(df))[:, 1]


def contributions(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    import xgboost as xgb
    clf, names = _load()
    X = build_matrix(df)
    raw = clf.get_booster().predict(
        xgb.DMatrix(X, feature_names=names), pred_contribs=True
    )
    return pd.DataFrame(raw[:, :-1], columns=names, index=df.index), raw[:, -1]


def _sigmoid(x):
    return 1 / (1 + math.exp(-x))


@ttl_cache
def scored_accounts() -> pd.DataFrame:
    """Score converted accounts for probability of churn within the next 90 days."""
    df = data.load_accounts()
    conv = df[df.converted].copy()
    conv["risk"] = predict_proba(conv)
    contrib, _ = contributions(conv)

    active = conv[conv.status == "active"]
    if len(active):
        hi, mid = active.risk.quantile([0.8, 0.5])
    else:
        hi = mid = 1.0
    conv["tier"] = np.where(conv.risk >= hi, "high", np.where(conv.risk >= mid, "medium", "low"))
    conv["drivers"] = [
        [{"feature": f, "effect": float(row[f])}
         for f in row.abs().sort_values(ascending=False).index[:3]]
        for _, row in contrib.iterrows()
    ]
    return conv


def risk_thresholds() -> dict:
    active = scored_accounts().query("status == 'active'").risk
    if active.empty:
        return {"high": None, "medium": None}
    return {"high": float(active.quantile(.8)), "medium": float(active.quantile(.5))}


def predict_one(channel: str, company_size: str, week1_feature_count: int, had_week1_ticket: bool) -> dict:
    row = pd.DataFrame([{
        "channel": channel,
        "company_size": company_size,
        "week1_feature_count": week1_feature_count,
        "had_week1_ticket": int(had_week1_ticket),
    }])
    prob = float(predict_proba(row)[0])
    contrib, bias = contributions(row)
    drivers = sorted(
        ({"feature": f, "effect": float(v)} for f, v in contrib.iloc[0].items()),
        key=lambda d: -abs(d["effect"]),
    )
    return {
        "churn_probability_90d": prob,
        "churn_probability": prob,
        "baseline_probability": _sigmoid(float(bias[0])),
        "drivers": drivers,
        "horizon_days": HORIZON_DAYS,
    }

@ttl_cache
def explainability() -> dict:
    from sklearn.metrics import average_precision_score, roc_auc_score, roc_curve, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

    clf, names = _load()
    df = data.load_churn_dataset(HORIZON_DAYS).sort_values("start_date").reset_index(drop=True)
    cut = int(len(df) * .75)
    test = df.iloc[cut:]
    X_test = build_matrix(test)
    y_test = test["churned_90d"]

    contrib, bias = contributions(df)
    importance = contrib.abs().mean().sort_values(ascending=False)
    dependence = {}
    X_all = build_matrix(df)
    for f in names:
        vals = X_all[f]
        if vals.nunique() <= 12:
            dependence[f] = [
                {"value": float(v), "n": int((vals == v).sum()),
                 "mean_effect": float(contrib.loc[vals == v, f].mean())}
                for v in sorted(vals.unique())
            ]

    prob = clf.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, prob)
    keep = np.unique(np.linspace(0, len(fpr) - 1, min(len(fpr), 100)).astype(int))
    pred = (prob >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
    return {
        "features": [{"feature": f, "importance": float(v)} for f, v in importance.items()],
        "dependence": dependence,
        "baseline_probability": _sigmoid(float(bias.mean())),
        "n_accounts": int(len(df)),
        "horizon_days": HORIZON_DAYS,
        "metrics": {
            "roc_auc": float(roc_auc_score(y_test, prob)),
            "pr_auc": float(average_precision_score(y_test, prob)),
            "accuracy": float(accuracy_score(y_test, pred)),
            "precision": float(precision_score(y_test, pred, zero_division=0)),
            "recall": float(recall_score(y_test, pred, zero_division=0)),
            "f1": float(f1_score(y_test, pred, zero_division=0)),
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "n_test": int(len(y_test)),
            "roc": [{"x": float(fpr[i]), "y": float(tpr[i])} for i in keep],
        },
        "metrics_note": "Time-based holdout: the newest eligible conversion cohorts are evaluated after training on earlier cohorts.",
    }


def explain_account(account_id: int) -> dict | None:
    conv = scored_accounts()
    row = conv[conv.account_id == account_id]
    if row.empty:
        return None
    contrib, bias = contributions(row)
    r = row.iloc[0]
    X = build_matrix(row).iloc[0]
    return {
        "churn_probability_90d": float(r.risk),
        "churn_probability": float(r.risk),
        "tier": r.tier,
        "baseline_probability": _sigmoid(float(bias[0])),
        "horizon_days": HORIZON_DAYS,
        "drivers": sorted(
            ({"feature": f, "value": float(X[f]), "effect": float(contrib.iloc[0][f])} for f in X.index),
            key=lambda d: -abs(d["effect"]),
        ),
    }

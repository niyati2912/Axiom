"""Train the 90-day churn model from first-week behavior.

Run: python -m backend.ml.train
"""
from pathlib import Path

import pandas as pd
from sklearn.metrics import roc_auc_score, average_precision_score
from xgboost import XGBClassifier

from backend import config, data

FEATURES = ["channel", "company_size", "week1_feature_count", "had_week1_ticket"]
HORIZON_DAYS = 90


def make_matrix(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.get_dummies(df[FEATURES], columns=["channel", "company_size"], drop_first=False)
    return X.astype(float)


def main():
    df = data.load_churn_dataset(HORIZON_DAYS)
    if len(df) < 100 or df["churned_90d"].nunique() < 2:
        raise SystemExit("Not enough eligible labeled data. Run init_db.py and generate_all_data.py first.")

    # Time split: earlier cohorts train the model; the newest eligible cohort is held out.
    df = df.sort_values("start_date").reset_index(drop=True)
    cut = int(len(df) * 0.75)
    train_df, test_df = df.iloc[:cut], df.iloc[cut:]

    X_train = make_matrix(train_df)
    X_test = make_matrix(test_df).reindex(columns=X_train.columns, fill_value=0).astype(float)
    y_train, y_test = train_df["churned_90d"], test_df["churned_90d"]

    model = XGBClassifier(
        n_estimators=220,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)
    prob = model.predict_proba(X_test)[:, 1]

    print(f"Eligible accounts: {len(df):,}")
    print(f"Train: {len(train_df):,} | Test: {len(test_df):,}")
    print(f"90-day churn rate (test): {y_test.mean():.3f}")
    print(f"ROC-AUC: {roc_auc_score(y_test, prob):.3f}")
    print(f"PR-AUC:  {average_precision_score(y_test, prob):.3f}")

    Path(config.MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(config.MODEL_PATH))
    print(f"Saved model: {config.MODEL_PATH}")


if __name__ == "__main__":
    main()

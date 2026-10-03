import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier
import shap
from db_connection import engine

df = pd.read_sql("SELECT * FROM account_churn_features", engine)
print(f"Rows: {len(df)}")
print(df['churned'].value_counts())

if df['churned'].nunique() < 2 or len(df) < 30:
    print("\nNot enough labeled data yet to train a reliable model. "
          "Run generate_all_data.py with a larger NUM_ACCOUNTS if this happens.")
else:
    features = ['channel', 'company_size', 'week1_feature_count', 'had_week1_ticket']
    X = pd.get_dummies(df[features], columns=['channel', 'company_size'], drop_first=True).astype(float)
    y = df['churned']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1,
        eval_metric='logloss', random_state=42
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    print("\n=== CLASSIFICATION REPORT ===")
    print(classification_report(y_test, preds))
    print(f"ROC-AUC: {roc_auc_score(y_test, probs):.3f}")

    explainer = shap.TreeExplainer(model)
    shap_values = explainer(X_test)

    shap.summary_plot(shap_values, X_test, show=False)
    plt.tight_layout()
    plt.savefig("shap_summary.png")
    plt.close()
    print("Saved chart: shap_summary.png")

    model.save_model("churn_model.json")
    print("Saved model: churn_model.json")
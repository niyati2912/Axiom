import pandas as pd
import matplotlib.pyplot as plt
from db_connection import engine

# --- FUNNEL ---
funnel = pd.read_sql("SELECT * FROM funnel_by_channel", engine)

step_order = ['signup', 'email_verified', 'workspace_created', 'invited_teammate',
              'first_task_created', 'returned_day7', 'converted_to_paid']
funnel['step_name'] = pd.Categorical(funnel['step_name'], categories=step_order, ordered=True)
funnel = funnel.sort_values(['channel', 'step_name'])

pivot = funnel.pivot(index='step_name', columns='channel', values='completion_pct')
print("\n=== FUNNEL COMPLETION % BY CHANNEL ===")
print(pivot)

pivot.plot(marker='o', figsize=(9, 5))
plt.title("Onboarding Funnel Completion by Channel")
plt.ylabel("Completion %")
plt.xticks(rotation=30)
plt.tight_layout()
plt.savefig("funnel_by_channel.png")
print("Saved chart: funnel_by_channel.png")

# --- COHORTS ---
cohorts = pd.read_sql("SELECT * FROM monthly_cohorts", engine)
print("\n=== MONTHLY COHORT CONVERSION % ===")
print(cohorts)

# --- MRR ---
mrr = pd.read_sql("SELECT * FROM mrr_snapshot", engine)
print("\n=== MRR SNAPSHOT ===")
print(mrr)

# --- CHURN FEATURES PREVIEW ---
churn_features = pd.read_sql("SELECT * FROM account_churn_features", engine)
print("\n=== CHURN FEATURES (first 10 rows) ===")
print(churn_features.head(10))
print(f"\nOverall churn rate: {churn_features['churned'].mean()*100:.1f}%")
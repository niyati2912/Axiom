import pandas as pd
import matplotlib.pyplot as plt
from lifelines import KaplanMeierFitter
from lifelines.statistics import logrank_test
from db_connection import engine

REDESIGN_DATE = pd.Timestamp.today() - pd.Timedelta(days=270)

subs = pd.read_sql("""
    SELECT s.account_id, a.company_size, a.channel, a.signup_date,
           s.start_date, s.end_date, s.status
    FROM subscriptions s
    JOIN accounts a ON s.account_id = a.account_id
""", engine)

subs['signup_date'] = pd.to_datetime(subs['signup_date'])
subs['start_date'] = pd.to_datetime(subs['start_date'])
subs['end_date'] = pd.to_datetime(subs['end_date'])

today = pd.Timestamp.today()
subs['duration_days'] = (subs['end_date'].fillna(today) - subs['start_date']).dt.days
subs['event_observed'] = (subs['status'] == 'churned').astype(int)
subs['cohort'] = subs['signup_date'].apply(lambda d: 'post_redesign' if d >= REDESIGN_DATE else 'pre_redesign')

print(f"Total subscriptions analyzed: {len(subs)}")
print(subs['cohort'].value_counts())

def run_segment(segment_name, df_segment):
    if df_segment['cohort'].nunique() < 2 or len(df_segment) < 10:
        print(f"\n[{segment_name}] Not enough data to compare cohorts.")
        return

    pre = df_segment[df_segment['cohort'] == 'pre_redesign']
    post = df_segment[df_segment['cohort'] == 'post_redesign']

    kmf = KaplanMeierFitter()
    fig, ax = plt.subplots(figsize=(7, 5))

    kmf.fit(pre['duration_days'], pre['event_observed'], label='Pre-redesign')
    kmf.plot(ax=ax)

    kmf.fit(post['duration_days'], post['event_observed'], label='Post-redesign')
    kmf.plot(ax=ax)

    plt.title(f"Retention Curve — {segment_name}")
    plt.xlabel("Days since conversion")
    plt.ylabel("Survival probability (still active)")
    plt.tight_layout()
    fname = f"survival_{segment_name.replace(' ', '_')}.png"
    plt.savefig(fname)
    plt.close()

    result = logrank_test(pre['duration_days'], post['duration_days'],
                           pre['event_observed'], post['event_observed'])
    print(f"\n[{segment_name}] n_pre={len(pre)}, n_post={len(post)}")
    print(f"[{segment_name}] Log-rank test p-value: {result.p_value:.4f}")
    print(f"[{segment_name}] Saved chart: {fname}")

# Overall population
run_segment("Overall", subs)

# Segmented by company size (this is where the hidden redesign effect should show up)
for size in subs['company_size'].unique():
    run_segment(f"Company size = {size}", subs[subs['company_size'] == size])
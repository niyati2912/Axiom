import pandas as pd
import random
from datetime import datetime, timedelta
from db_connection import engine

random.seed(42)  # keeps your fake data the same every time you run this, so results are reproducible

NUM_ACCOUNTS = 3000

# Weighted choices: organic is most common, referral is rarest
channels = ['organic', 'paid_search', 'referral', 'content']
channel_weights = [0.45, 0.30, 0.15, 0.10]

company_sizes = ['solo', 'team', 'enterprise']
size_weights = [0.55, 0.35, 0.10]

plan_tiers = ['free', 'pro', 'enterprise']

def random_signup_date():
    days_back = random.randint(0, 540)  # 540 days is about 18 months
    return datetime.today() - timedelta(days=days_back)

rows = []
for account_id in range(1, NUM_ACCOUNTS + 1):
    signup_date = random_signup_date()
    channel = random.choices(channels, weights=channel_weights)[0]
    company_size = random.choices(company_sizes, weights=size_weights)[0]
    plan_tier = random.choice(plan_tiers)

    rows.append({
        'signup_date': signup_date.date(),
        'channel': channel,
        'company_size': company_size,
        'plan_tier': plan_tier
    })

accounts_df = pd.DataFrame(rows)

print(accounts_df.head())        # shows the first 5 rows, so you can sanity-check before writing
print(accounts_df.shape)         # confirms you actually made 3000 rows

# Now write it into Postgres
accounts_df.to_sql('accounts', engine, if_exists='append', index=False)
print("Done — accounts table populated.")
import pandas as pd
from db_connection import engine

df = pd.read_sql("SELECT * FROM accounts;", engine)
print(df)
"""Streamlit analytics dashboard for Flowdesk.

Run: streamlit run dashboard.py
"""
import pandas as pd
import streamlit as st

from backend import data
from backend.services import analytics, feedback, funnel, survival

st.set_page_config(page_title="Flowdesk Analytics", page_icon="◈", layout="wide")

st.markdown("""
<style>
.block-container {max-width: 1450px; padding-top: 2rem;}
[data-testid="stMetricValue"] {font-size: 2rem;}
</style>
""", unsafe_allow_html=True)

st.title("Flowdesk — Product Intelligence")
st.caption("18-month simulated B2B SaaS dataset · PostgreSQL · behavioral analytics")

try:
    ov = analytics.overview()
except Exception as exc:
    st.error(f"Database unavailable: {exc}")
    st.stop()

k = ov["kpis"]
a, b, c, d, e = st.columns(5)
a.metric("Accounts", f"{k['accounts']:,}")
b.metric("Signup → paid", f"{k['conversion_rate']*100:.1f}%")
c.metric("Active subscriptions", f"{k['active_subscriptions']:,}")
d.metric("Churn", f"{k['churn_rate']*100:.1f}%")
e.metric("MRR", f"${k['mrr']:,.0f}")

pages = st.tabs(["Overview", "Activation", "Retention", "Churn", "Survival & Feedback"])

with pages[0]:
    st.subheader("Product movement")
    timeline = pd.DataFrame(ov["timeline"]).set_index("month")
    st.line_chart(timeline[["signups", "conversions", "churned"]])
    st.subheader("Churn by company size")
    st.dataframe(pd.DataFrame(ov["churn_by_size"]), use_container_width=True, hide_index=True)

with pages[1]:
    st.subheader("Onboarding funnel")
    channel = st.selectbox("Acquisition channel", [None, "organic", "paid_search", "referral", "content"], format_func=lambda x: "All channels" if x is None else x.replace("_", " "))
    f = funnel.funnel(channel=channel)
    st.bar_chart(pd.DataFrame(f["steps"]).set_index("step")[["n"]])
    st.dataframe(pd.DataFrame(f["steps"]), use_container_width=True, hide_index=True)
    st.info(f"Largest step-to-step drop: {f['largest_drop']['step'].replace('_', ' ')}" if f["largest_drop"] else "Not enough data.")

with pages[2]:
    st.subheader("Signup cohort retention")
    r = analytics.retention()
    cohort = pd.DataFrame(r["cohorts"]).set_index("month")
    st.line_chart(cohort[["retained_30", "retained_90", "retained_180"]])
    st.dataframe(cohort, use_container_width=True)

with pages[3]:
    st.subheader("Churn behavior")
    ch = analytics.churn()
    left, right = st.columns(2)
    with left:
        st.write("Churn by week-1 feature count")
        st.dataframe(pd.DataFrame(ch["by_week1_features"]), use_container_width=True, hide_index=True)
    with right:
        st.write("Churn by week-1 support contact")
        st.dataframe(pd.DataFrame(ch["by_week1_ticket"]), use_container_width=True, hide_index=True)
    st.caption(ch["note"])

with pages[4]:
    st.subheader("Survival analysis")
    sv = survival.survival("cohort")
    for curve in sv["curves"]:
        frame = pd.DataFrame(curve["points"])
        if not frame.empty:
            st.write(f"{curve['name']} · n={curve['n']} · events={curve['events']}")
            st.line_chart(frame.set_index("t")[["s"]])
    st.subheader("Exit feedback")
    fb = feedback.feedback()
    if fb.get("total"):
        st.dataframe(pd.DataFrame(fb["reasons"]), use_container_width=True, hide_index=True)
        st.caption("Exit surveys describe churned accounts only; they are not a representative survey of retained customers.")

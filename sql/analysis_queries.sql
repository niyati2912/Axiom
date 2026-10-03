-- FLOWDESK ANALYTICS SQL
-- These are analytical queries against the raw event tables.
-- They intentionally avoid precomputed analytics views.

-- 1) Onboarding funnel by acquisition channel
WITH account_steps AS (
    SELECT
        a.account_id,
        a.channel,
        oe.step_name,
        MAX(oe.completed::int) AS completed
    FROM accounts a
    JOIN users u ON u.account_id = a.account_id AND u.role = 'admin'
    JOIN onboarding_events oe ON oe.user_id = u.user_id
    GROUP BY a.account_id, a.channel, oe.step_name
)
SELECT
    channel,
    step_name,
    COUNT(*) FILTER (WHERE completed = 1) AS accounts_completed,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE completed = 1) / COUNT(*),
        1
    ) AS completion_pct
FROM account_steps
GROUP BY channel, step_name
ORDER BY channel, CASE step_name
    WHEN 'signup' THEN 1
    WHEN 'email_verified' THEN 2
    WHEN 'workspace_created' THEN 3
    WHEN 'invited_teammate' THEN 4
    WHEN 'first_task_created' THEN 5
    WHEN 'returned_day7' THEN 6
    WHEN 'converted_to_paid' THEN 7
END;

-- 2) Monthly signup cohorts
SELECT
    DATE_TRUNC('month', a.signup_date)::date AS signup_month,
    a.company_size,
    COUNT(*) AS signups,
    COUNT(s.account_id) AS converted,
    ROUND(100.0 * COUNT(s.account_id) / COUNT(*), 1) AS conversion_pct
FROM accounts a
LEFT JOIN subscriptions s ON s.account_id = a.account_id
GROUP BY 1, 2
ORDER BY 1, 2;

-- 3) 90-day churn label from an observation-safe population
WITH eligible AS (
    SELECT
        a.account_id,
        a.signup_date,
        a.channel,
        a.company_size,
        s.start_date,
        s.end_date,
        CASE
            WHEN s.end_date IS NOT NULL
             AND s.end_date <= s.start_date + INTERVAL '90 days'
            THEN 1 ELSE 0
        END AS churned_90d
    FROM accounts a
    JOIN subscriptions s ON s.account_id = a.account_id
    WHERE s.start_date + INTERVAL '90 days' <= CURRENT_DATE
)
SELECT *
FROM eligible;

-- 4) Week-1 feature adoption and 90-day churn
WITH feature_counts AS (
    SELECT
        u.account_id,
        COUNT(DISTINCT fu.feature_name) AS week1_feature_count
    FROM users u
    JOIN feature_usage fu ON fu.user_id = u.user_id
    JOIN accounts a ON a.account_id = u.account_id
    WHERE fu.usage_ts < a.signup_date + INTERVAL '8 days'
    GROUP BY u.account_id
), eligible AS (
    SELECT
        s.account_id,
        CASE
            WHEN s.end_date IS NOT NULL
             AND s.end_date <= s.start_date + INTERVAL '90 days'
            THEN 1 ELSE 0
        END AS churned_90d
    FROM subscriptions s
    WHERE s.start_date + INTERVAL '90 days' <= CURRENT_DATE
)
SELECT
    COALESCE(f.week1_feature_count, 0) AS week1_feature_count,
    COUNT(*) AS accounts,
    ROUND(AVG(e.churned_90d) * 100, 1) AS churn_rate_pct
FROM eligible e
LEFT JOIN feature_counts f ON f.account_id = e.account_id
GROUP BY 1
ORDER BY 1;

-- 5) Redesign investigation: compare onboarding completion by segment and cohort.
WITH base AS (
    SELECT
        a.account_id,
        a.company_size,
        CASE WHEN a.signup_date >= CURRENT_DATE - INTERVAL '274 days'
             THEN 'post_redesign' ELSE 'pre_redesign' END AS cohort,
        oe.step_name,
        oe.completed
    FROM accounts a
    JOIN users u ON u.account_id = a.account_id AND u.role = 'admin'
    JOIN onboarding_events oe ON oe.user_id = u.user_id
)
SELECT
    company_size,
    cohort,
    step_name,
    ROUND(AVG(completed::int) * 100, 1) AS completion_pct,
    COUNT(*) AS accounts
FROM base
GROUP BY company_size, cohort, step_name
ORDER BY company_size, cohort, step_name;

-- 6) Subscription survival inputs
SELECT
    s.account_id,
    a.company_size,
    a.channel,
    a.signup_date,
    s.start_date,
    s.end_date,
    COALESCE(s.end_date, CURRENT_DATE) - s.start_date AS observed_days,
    CASE WHEN s.status = 'churned' THEN 1 ELSE 0 END AS event_observed
FROM subscriptions s
JOIN accounts a ON a.account_id = s.account_id;

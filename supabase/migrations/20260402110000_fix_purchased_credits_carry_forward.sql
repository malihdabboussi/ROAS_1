-- Fix purchased_credits_used on current-period rows.
-- Previous bug: each new-month row reset purchased_credits_used to 0, giving users
-- their full purchased wallet back every period.  purchased_credits_used must be a
-- cumulative lifetime counter.  For every row whose month is the latest for that
-- user, add the sum of purchased_credits_used from all earlier rows.

-- Personal credit usage
UPDATE monthly_credit_usage curr
SET purchased_credits_used = curr.purchased_credits_used + COALESCE((
  SELECT SUM(prev.purchased_credits_used)
  FROM monthly_credit_usage prev
  WHERE prev.user_id = curr.user_id AND prev.month < curr.month
), 0)
WHERE curr.id IN (
  SELECT DISTINCT ON (user_id) id
  FROM monthly_credit_usage
  ORDER BY user_id, month DESC
)
AND EXISTS (
  SELECT 1 FROM monthly_credit_usage prev
  WHERE prev.user_id = curr.user_id AND prev.month < curr.month AND prev.purchased_credits_used > 0
);

-- Org credit usage
UPDATE org_monthly_credit_usage curr
SET purchased_credits_used = curr.purchased_credits_used + COALESCE((
  SELECT SUM(prev.purchased_credits_used)
  FROM org_monthly_credit_usage prev
  WHERE prev.org_id = curr.org_id AND prev.month < curr.month
), 0)
WHERE curr.id IN (
  SELECT DISTINCT ON (org_id) id
  FROM org_monthly_credit_usage
  ORDER BY org_id, month DESC
)
AND EXISTS (
  SELECT 1 FROM org_monthly_credit_usage prev
  WHERE prev.org_id = curr.org_id AND prev.month < curr.month AND prev.purchased_credits_used > 0
);

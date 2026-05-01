-- Keep only one live credit-terms acceptance request per user.
-- Accepted/rejected/expired history remains untouched.

WITH ranked_live_terms AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY sent_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS live_rank
  FROM sent_credit_terms
  WHERE status IN ('pending', 'viewed')
)
UPDATE sent_credit_terms terms
SET status = 'expired',
    updated_at = NOW()
FROM ranked_live_terms ranked
WHERE terms.id = ranked.id
  AND ranked.live_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_credit_terms_one_live_offer_per_user
ON sent_credit_terms (user_id)
WHERE status IN ('pending', 'viewed');

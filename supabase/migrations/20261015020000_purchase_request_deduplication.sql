-- Qitaa request idempotency guard: avoid duplicate pending reservations by the same buyer.
-- This index is additive and never removes or changes an existing request.
-- If pre-existing active duplicates are detected, migration fails closed for manual review.
CREATE UNIQUE INDEX IF NOT EXISTS purchase_requests_one_open_per_buyer_offer
 ON public.purchase_requests (buyer_id, offer_id)
 WHERE status IN ('requested', 'accepted');

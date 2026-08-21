-- Billing via Paddle (slice 8). We identify a user's subscription two ways:
-- the customer id (stable across subscriptions) and the current subscription id
-- (needed to cancel via the API). plan itself already lives on users (0001).
-- The unused stripe_customer_id column from 0001 is left in place for now.

alter table public.users
  add column if not exists paddle_customer_id     text,
  add column if not exists paddle_subscription_id text;

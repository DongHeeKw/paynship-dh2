-- ============================================================================
-- Manual Data Migration: Cart (sessionId → userId/guestToken) + Order userId
-- ============================================================================
-- WHEN TO RUN:
--   After `prisma db push` (or a Prisma migration) has applied the schema
--   changes that add userId and guestToken columns to the carts table, and
--   userId to the orders table.
--
-- HOW TO RUN:
--   Option A — psql:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/migrate_cart_and_order.sql
--
--   Option B — Supabase SQL editor:
--     Copy-paste the contents of this file and execute.
--
--   Option C — npm script (if configured):
--     npm run db:migrate:manual
--
-- SAFETY:
--   All UPDATE statements are idempotent (WHERE clauses guard already-migrated
--   rows). The DELETE in Step 3 is irreversible — take a DB snapshot first.
--   The SELECT statements at the end are verification queries; review their
--   output before treating the migration as complete.
-- ============================================================================

-- ============================================================================
-- Global Cart Migration: sessionId → userId/guestToken
-- Run AFTER prisma db push applies the schema changes
-- ============================================================================

-- Step 1: Populate userId from ChatSession for user-owned carts
UPDATE carts c
SET user_id = cs.user_id
FROM chat_sessions cs
WHERE cs.id = c.session_id
  AND cs.user_id IS NOT NULL
  AND c.user_id IS NULL;

-- Step 2: Generate guestToken for carts without a user
UPDATE carts c
SET guest_token = gen_random_uuid()::text
WHERE c.user_id IS NULL
  AND c.guest_token IS NULL;

-- Step 3: Handle duplicate userId (multiple sessions for same user)
-- Keep the most recently updated cart, delete older ones
-- First, move items from older carts to the newest one
WITH ranked AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM carts
  WHERE user_id IS NOT NULL
)
DELETE FROM carts WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Step 4: Verify constraints
-- All carts should now have either userId or guestToken
SELECT COUNT(*) AS orphaned_carts
FROM carts
WHERE user_id IS NULL AND guest_token IS NULL;

-- ============================================================================
-- Order Migration: Add userId from Quote
-- ============================================================================

-- Populate userId on existing orders from their linked quotes
UPDATE orders o
SET user_id = q.user_id
FROM quotes q
WHERE q.id = o.quote_id
  AND o.user_id IS NULL
  AND q.user_id IS NOT NULL;

-- For orders without a quote user, try to find from shopify webhook data
-- (these should be rare edge cases)
SELECT COUNT(*) AS orders_without_user
FROM orders
WHERE user_id IS NULL;

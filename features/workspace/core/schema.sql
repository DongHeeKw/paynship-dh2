CREATE TABLE workspace_metadata (
  id INTEGER PRIMARY KEY CHECK(id=1), namespace TEXT NOT NULL CHECK(namespace='paynship-developer-workspace'),
  schema_version INTEGER NOT NULL CHECK(schema_version=1), sample_only INTEGER NOT NULL CHECK(sample_only=1), initialized INTEGER NOT NULL DEFAULT 0
);
INSERT INTO workspace_metadata VALUES(1,'paynship-developer-workspace',1,1,0);
CREATE TABLE users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL CHECK(email LIKE '%@example.invalid'),
  shopify_customer_id TEXT, notification_pref TEXT NOT NULL DEFAULT 'EMAIL', phone TEXT, is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin=0), name TEXT NOT NULL,
  country TEXT NOT NULL CHECK(country IN ('CN','JP','US')), created_at TEXT NOT NULL,
  quota_day TEXT NOT NULL DEFAULT '', quota_count INTEGER NOT NULL DEFAULT 0, sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE delivery_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id), encrypted_data TEXT NOT NULL, updated_at TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1));
CREATE TABLE purchase_requests (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), source_url TEXT NOT NULL, category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10), options TEXT NOT NULL, destination TEXT NOT NULL,
  encrypted_delivery TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
  status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, review TEXT, quote TEXT, quote_expires_at TEXT,
  payment_draft_id TEXT, checkout_url TEXT CHECK(checkout_url IS NULL), payment_order_id TEXT, paid_at TEXT,
  carrier TEXT CHECK(carrier IS NULL OR carrier='SAMPLE_ONLY'), tracking_number TEXT, last_carrier_event_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, product_id TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1),
  UNIQUE(user_id,idempotency_key)
);
CREATE INDEX purchase_requests_owner ON purchase_requests(user_id,created_at);
CREATE TABLE purchase_events (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES purchase_requests(id), actor_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source='developer_workspace_sample'), status TEXT NOT NULL, message TEXT NOT NULL,
  created_at TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE purchase_support_tickets (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES purchase_requests(id), subject TEXT NOT NULL, message TEXT NOT NULL,
  reply TEXT, status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_by TEXT, created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE ghost_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL, created_at TEXT NOT NULL,
  authenticated INTEGER NOT NULL CHECK(authenticated=0), sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE account_credits (
  user_id TEXT PRIMARY KEY REFERENCES users(id), currency TEXT NOT NULL CHECK(currency='USD'),
  balance_cents INTEGER NOT NULL CHECK(balance_cents BETWEEN 0 AND 1000000), sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE credit_entries (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), request_id TEXT REFERENCES purchase_requests(id), amount_cents INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('OPENING','TOP_UP','PAYMENT')), label TEXT NOT NULL, created_at TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE payment_fixtures (
  id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL REFERENCES purchase_requests(id), user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0), status TEXT NOT NULL CHECK(status IN ('PENDING','COMPLETED')),
  provider TEXT NOT NULL CHECK(provider='SAMPLE_CREDIT'), created_at TEXT NOT NULL, completed_at TEXT, sample_only INTEGER NOT NULL CHECK(sample_only=1)
);
CREATE TABLE action_receipts (
  user_id TEXT NOT NULL REFERENCES users(id), idempotency_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL, sample_only INTEGER NOT NULL CHECK(sample_only=1), PRIMARY KEY(user_id,idempotency_key)
);

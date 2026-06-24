-- 001_initial.sql
-- Esquema completo para la plataforma Dash de re-facturación Cloudflare

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  billing_email TEXT,
  plan_type TEXT CHECK(plan_type IN ('fixed', 'usage_based', 'hybrid')) DEFAULT 'usage_based',
  fixed_monthly_fee INTEGER DEFAULT 0,
  markup_percentage REAL DEFAULT 30.0,
  is_active BOOLEAN DEFAULT 1,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  resource_type TEXT CHECK(resource_type IN ('worker_script', 'd1_database', 'kv_namespace', 'r2_bucket', 'durable_object', 'workflow')) NOT NULL,
  cloudflare_name TEXT NOT NULL,
  cloudflare_id TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  snapshot_date DATE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  cpu_time_ms INTEGER DEFAULT 0,
  wall_time_ms INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  included_requests INTEGER DEFAULT 10000000,
  included_cpu_ms INTEGER DEFAULT 30000000,
  price_per_million_requests REAL DEFAULT 0.30,
  price_per_million_cpu_ms REAL DEFAULT 0.02,
  overage_markup_percent REAL DEFAULT 0,
  is_default BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fixed_fee_cents INTEGER DEFAULT 0,
  usage_fee_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
  pdf_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  resource_id INTEGER REFERENCES resources(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  resource_id INTEGER REFERENCES resources(id),
  metric_type TEXT CHECK(metric_type IN ('requests', 'cpu_time', 'cost')) NOT NULL,
  threshold_value INTEGER NOT NULL,
  comparison TEXT CHECK(comparison IN ('gt', 'lt')) NOT NULL,
  notification_email TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  alert_rule_id INTEGER REFERENCES alert_rules(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'client')) NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar pricing tiers por defecto
INSERT OR IGNORE INTO pricing_tiers (id, plan_name, included_requests, included_cpu_ms, price_per_million_requests, price_per_million_cpu_ms, overage_markup_percent, is_default) VALUES
  (1, 'starter', 5000000, 15000000, 0.30, 0.02, 0, 0),
  (2, 'business', 20000000, 60000000, 0.25, 0.015, 0, 1),
  (3, 'enterprise', 100000000, 300000000, 0.20, 0.01, 0, 0);

-- Insertar admin por defecto (password: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash, role, client_id) VALUES
  (1, 'admin', '$2a$10$bmCjk1rqQdgEXWxSQTJSB.pCr3TiaqJOMUi1H8qwqrSRTIEECeTyS', 'admin', NULL);

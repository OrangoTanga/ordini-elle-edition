-- Migration 0005: Payment management system + commission sharing

-- Add role to users (admin vs rep)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'rep';

-- Extend orders with structured payment fields
ALTER TABLE orders ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'dilazionato';
ALTER TABLE orders ADD COLUMN payment_days INTEGER DEFAULT 30;
ALTER TABLE orders ADD COLUMN deposit_percent REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN balance_days INTEGER DEFAULT 30;
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';

-- Payments tracking
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  paid_date TEXT,
  paid_amount REAL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'pagamento',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Shared reps for commission splitting
CREATE TABLE IF NOT EXISTS order_shared_reps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(order_id, user_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed admin role for first user
UPDATE users SET role = 'admin' WHERE id = 1;

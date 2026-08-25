-- Migration 0004: Listini, prezzi multipli, commissioni, impostazioni

CREATE TABLE IF NOT EXISTS listini (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  commission_percent REAL NOT NULL DEFAULT 0,
  payment_terms TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listino_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  listino_id INTEGER NOT NULL REFERENCES listini(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  UNIQUE(product_id, listino_id)
);

CREATE TABLE IF NOT EXISTS commission_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listino_id INTEGER NOT NULL REFERENCES listini(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  commission_percent REAL NOT NULL,
  UNIQUE(listino_id, category)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT DEFAULT ''
);

ALTER TABLE orders ADD COLUMN listino_id INTEGER REFERENCES listini(id);

-- Seed listini
INSERT INTO listini (name, commission_percent, payment_terms, sort_order) VALUES
  ('Listino 1', 15, 'Fattura a 30 giorni. Opzione sconto 3% per pagamento immediato (assegno allo scarico).', 1),
  ('Listino 2', 12, 'Assegno datato allo scarico. Opzione sconto 3% per pagamento immediato.', 2),
  ('Listino 3', 10, 'Solo contanti. Opzione sconto 3% per bonifico anticipato.', 3);

-- Seed settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('order_minimum', '150.00', 'Importo minimo ordine in EUR'),
  ('gift_strategy', 'Programmare regali da decidere in base alla spesa (gadget, bottiglie o altro).', 'Strategia omaggi');

-- Seed commission exceptions for Distillati Premium on Listino 1
INSERT INTO commission_exceptions (listino_id, category, commission_percent)
SELECT id, 'distillati', 20 FROM listini WHERE sort_order = 1;

-- Copy existing product prices as listino_1 prices
INSERT OR IGNORE INTO listino_prices (product_id, listino_id, price)
SELECT p.id, l.id, p.price
FROM products p, listini l
WHERE l.sort_order = 1;

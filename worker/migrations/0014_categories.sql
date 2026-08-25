-- Migration 0014: Table categories with seeded defaults
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('vino bianco', 1);
INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('vino rosso', 2);
INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('prosecco', 3);
INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('birre', 4);
INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('distillati', 5);
INSERT OR IGNORE INTO categories (name, sort_order) VALUES ('extra', 6);
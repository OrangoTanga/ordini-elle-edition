-- Migration 0006: Product commission overrides + seed products from spec

-- Product commission overrides (per-product, per-listino)
CREATE TABLE IF NOT EXISTS product_commission_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listino_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  commission_percent REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(listino_id, product_id),
  FOREIGN KEY (listino_id) REFERENCES listini(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Ensure distillati_premium commission exception exists
INSERT OR REPLACE INTO commission_exceptions (listino_id, category, commission_percent)
VALUES (1, 'distillati_premium', 20);

-- Save category notes
INSERT OR REPLACE INTO settings (key, value) VALUES ('note_vini_foglia_doro', 'Trattative private specifiche gestite da Fabio.');
INSERT OR REPLACE INTO settings (key, value) VALUES ('note_bollicine', 'Trattative extra, quantità da negoziare, contattare Fabio per accordi una tantum.');

-- Clean up old products: delete FK references first, then old products
PRAGMA foreign_keys = OFF;
DELETE FROM product_commission_overrides;
DELETE FROM listino_prices;
DELETE FROM order_items;
DELETE FROM products;
PRAGMA foreign_keys = ON;

-- Vino Bianco (12)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (1, 'Pecorino', 'Vino bianco Foglia d''Oro', 6.80, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (2, 'Passerina', 'Vino bianco Foglia d''Oro', 6.80, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/passerina.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (3, 'Chardonnay', 'Vino bianco Foglia d''Oro', 6.50, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/chardonnay.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (4, 'Falanghina IGP', 'Vino bianco Foglia d''Oro', 6.20, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (5, 'Fiano Avellino DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (6, 'Greco Tufo DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (7, 'Lacryma Christi DOCG', 'Vino bianco Campano', 9.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (8, 'Solo Paga Bianco', 'Vino bianco Campano', 4.90, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (9, 'Falanghina IGP Premium', 'Vino bianco Campano', 4.70, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (10, 'Fiano DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (11, 'Greco DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (12, 'Coda di Volpe DOC', 'Vino bianco Campano', 7.30, 'vino bianco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg', 1);

-- Vino Rosso (6)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (13, 'Cesanese', 'Vino rosso Foglia d''Oro', 6.80, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (14, 'Merlot', 'Vino rosso Foglia d''Oro', 6.50, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (15, 'Taurasi DOCG', 'Vino rosso Campano', 20.00, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (16, 'Solo Paga Rosso', 'Vino rosso Campano', 4.90, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (17, 'Aglianico IGP Premium', 'Vino rosso Campano', 4.70, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (18, 'Aglianico DOC', 'Vino rosso Campano', 7.30, 'vino rosso', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg', 1);

-- Extra (1)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (19, 'Rosato DOC', 'Vino rosato Campano', 7.30, 'extra', 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg', 1);

-- Birre (3)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (20, 'Birra IPA', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Ipa.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (21, 'Birra Begiam', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Belgian-ale.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (22, 'Birra Golden', 'Birra artigianale', 3.50, 'birre', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Golden-ale.jpg', 1);

-- Bollicine (3)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (23, 'Prosecco DOC', 'Bollicine', 7.50, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/prosecco.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (24, 'Cuvee Elli Morris', 'Bollicine', 5.90, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-millesimato.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (25, 'Cuvee Elly Rosé', 'Bollicine', 5.90, 'prosecco', 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-prestige-ok.jpg', 1);

-- Distillati Linea Tonda (6)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (26, 'Limoncello', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/limoncello.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (27, 'Vodka', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Vodka.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (28, 'Gin', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Old.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (29, 'Grappa Barrique', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (30, 'Grappa Bianca', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (31, 'Amaro', 'Distillato Linea Tonda', 19.00, 'distillati', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Amaro-Old.jpg', 1);

-- Distillati Premium (4)
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (32, 'Gin Premium', 'Distillato Premium', 25.00, 'distillati_premium', 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Bottiglia.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (33, 'Rum Premium', 'Distillato Premium', 25.00, 'distillati_premium', 'https://www.ellyedition.com/wp-content/uploads/2026/05/rum.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (34, 'Grappa Barrique Premium', 'Distillato Premium', 25.00, 'distillati_premium', 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg', 1);
INSERT INTO products (id, name, description, price, category, image_path, active) VALUES (35, 'Amaro Premium', 'Distillato Premium', 25.00, 'distillati_premium', 'https://www.ellyedition.com/wp-content/uploads/2026/05/amaro-bottiglia.jpg', 1);

-- Listino prices: L2 and L3
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (1, 2, 5.80), (1, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (2, 2, 5.80), (2, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (3, 2, 5.50), (3, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (4, 2, 4.90), (4, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (5, 2, 8.90), (5, 3, 8.40);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (6, 2, 8.90), (6, 3, 8.40);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (7, 2, 8.90), (7, 3, 8.40);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (8, 2, 4.30), (8, 3, 3.70);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (9, 2, 4.10), (9, 3, 3.80);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (10, 2, 6.00), (10, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (11, 2, 6.00), (11, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (12, 2, 6.00), (12, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (13, 2, 5.80), (13, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (14, 2, 5.50), (14, 3, 3.90);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (15, 2, 17.00), (15, 3, 16.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (16, 2, 4.30), (16, 3, 3.70);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (17, 2, 4.10), (17, 3, 3.80);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (18, 2, 6.00), (18, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (19, 2, 6.00), (19, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (20, 2, 3.00), (20, 3, 2.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (21, 2, 3.00), (21, 3, 2.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (22, 2, 3.00), (22, 3, 2.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (23, 2, 6.50), (23, 3, 5.50);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (24, 2, 4.90), (24, 3, 4.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (25, 2, 4.90), (25, 3, 4.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (26, 2, 17.00), (26, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (27, 2, 17.00), (27, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (28, 2, 17.00), (28, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (29, 2, 17.00), (29, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (30, 2, 17.00), (30, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (31, 2, 17.00), (31, 3, 15.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (32, 2, 20.00), (32, 3, 18.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (33, 2, 20.00), (33, 3, 18.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (34, 2, 20.00), (34, 3, 18.00);
INSERT INTO listino_prices (product_id, listino_id, price) VALUES (35, 2, 20.00), (35, 3, 18.00);

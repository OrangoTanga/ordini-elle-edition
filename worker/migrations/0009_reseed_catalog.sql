-- Migration 0009: Reseed catalog with new categories and pricing from spec

-- Update product categories (old category names, correct product mapping)
UPDATE products SET category = 'vino bianco',  name = 'Pecorino'       WHERE id = 1;
UPDATE products SET category = 'vino bianco',  name = 'Passerina'      WHERE id = 2;
UPDATE products SET category = 'vino bianco',  name = 'Chardonnay'     WHERE id = 3;
UPDATE products SET category = 'vino bianco',  name = 'Falanghina IGP' WHERE id = 4;
UPDATE products SET category = 'vino bianco',  name = 'Fiano Avellino DOCG' WHERE id = 5;
UPDATE products SET category = 'vino bianco',  name = 'Greco Tufo DOCG' WHERE id = 6;
UPDATE products SET category = 'vino bianco',  name = 'Lacryma Christi DOCG' WHERE id = 7;
UPDATE products SET category = 'vino bianco',  name = 'Solo Paga Bianco' WHERE id = 8;
UPDATE products SET category = 'vino bianco',  name = 'Falanghina IGP Premium' WHERE id = 9;
UPDATE products SET category = 'vino bianco',  name = 'Fiano DOC'      WHERE id = 10;
UPDATE products SET category = 'vino bianco',  name = 'Greco DOC'      WHERE id = 11;
UPDATE products SET category = 'vino bianco',  name = 'Coda di Volpe DOC' WHERE id = 12;
UPDATE products SET category = 'vino rosso',   name = 'Cesanese'       WHERE id = 13;
UPDATE products SET category = 'vino rosso',   name = 'Merlot'         WHERE id = 14;
UPDATE products SET category = 'vino rosso',   name = 'Taurasi DOCG'   WHERE id = 15;
UPDATE products SET category = 'vino rosso',   name = 'Solo Paga Rosso' WHERE id = 16;
UPDATE products SET category = 'vino rosso',   name = 'Aglianico IGP Premium' WHERE id = 17;
UPDATE products SET category = 'vino rosso',   name = 'Aglianico DOC'  WHERE id = 18;
UPDATE products SET category = 'extra',        name = 'Rosato DOC'     WHERE id = 19;
UPDATE products SET category = 'birre',        name = 'Birra IPA'      WHERE id = 20;
UPDATE products SET category = 'birre',        name = 'Birra Begiam'   WHERE id = 21;
UPDATE products SET category = 'birre',        name = 'Birra Golden'   WHERE id = 22;
UPDATE products SET category = 'prosecco',     name = 'Prosecco DOC'   WHERE id = 23;
UPDATE products SET category = 'prosecco',     name = 'Cuvee Elli Morris' WHERE id = 24;
UPDATE products SET category = 'prosecco',     name = 'Cuvee Elly Rosé' WHERE id = 25;
UPDATE products SET category = 'distillati',   name = 'Limoncello'     WHERE id = 26;
UPDATE products SET category = 'distillati',   name = 'Vodka'          WHERE id = 27;
UPDATE products SET category = 'distillati',   name = 'Gin'            WHERE id = 28;
UPDATE products SET category = 'distillati',   name = 'Grappa Barrique' WHERE id = 29;
UPDATE products SET category = 'distillati',   name = 'Grappa Bianca'  WHERE id = 30;
UPDATE products SET category = 'distillati',   name = 'Amaro'          WHERE id = 31;
UPDATE products SET category = 'distillati',   name = 'Gin'            WHERE id = 32;
UPDATE products SET category = 'distillati',   name = 'Rum'            WHERE id = 33;
UPDATE products SET category = 'distillati',   name = 'Grappa Barrique' WHERE id = 34;
UPDATE products SET category = 'distillati',   name = 'Amaro'          WHERE id = 35;

-- Update listino_prices with full L1/L2/L3
-- Products 1-4: Vino bianco first group
UPDATE listino_prices SET price = 6.80 WHERE product_id = 1 AND listino_id = 1; -- Pecorino L1
UPDATE listino_prices SET price = 5.80 WHERE product_id = 1 AND listino_id = 2; -- Pecorino L2
UPDATE listino_prices SET price = 3.90 WHERE product_id = 1 AND listino_id = 3; -- Pecorino L3
UPDATE listino_prices SET price = 6.80 WHERE product_id = 2 AND listino_id = 1; -- Passerina L1
UPDATE listino_prices SET price = 5.80 WHERE product_id = 2 AND listino_id = 2;
UPDATE listino_prices SET price = 3.90 WHERE product_id = 2 AND listino_id = 3;
UPDATE listino_prices SET price = 6.50 WHERE product_id = 3 AND listino_id = 1; -- Chardonnay L1
UPDATE listino_prices SET price = 5.50 WHERE product_id = 3 AND listino_id = 2;
UPDATE listino_prices SET price = 3.90 WHERE product_id = 3 AND listino_id = 3;
UPDATE listino_prices SET price = 6.20 WHERE product_id = 4 AND listino_id = 1; -- Falanghina IGP L1
UPDATE listino_prices SET price = 4.90 WHERE product_id = 4 AND listino_id = 2;
UPDATE listino_prices SET price = 3.90 WHERE product_id = 4 AND listino_id = 3;

-- Products 5-12: Vini Campani group 1
UPDATE listino_prices SET price = 9.90 WHERE product_id = 5 AND listino_id = 1;
UPDATE listino_prices SET price = 8.90 WHERE product_id = 5 AND listino_id = 2;
UPDATE listino_prices SET price = 8.40 WHERE product_id = 5 AND listino_id = 3;
UPDATE listino_prices SET price = 9.90 WHERE product_id = 6 AND listino_id = 1;
UPDATE listino_prices SET price = 8.90 WHERE product_id = 6 AND listino_id = 2;
UPDATE listino_prices SET price = 8.40 WHERE product_id = 6 AND listino_id = 3;
UPDATE listino_prices SET price = 9.90 WHERE product_id = 7 AND listino_id = 1;
UPDATE listino_prices SET price = 8.90 WHERE product_id = 7 AND listino_id = 2;
UPDATE listino_prices SET price = 8.40 WHERE product_id = 7 AND listino_id = 3;
UPDATE listino_prices SET price = 4.90 WHERE product_id = 8 AND listino_id = 1;
UPDATE listino_prices SET price = 4.30 WHERE product_id = 8 AND listino_id = 2;
UPDATE listino_prices SET price = 3.70 WHERE product_id = 8 AND listino_id = 3;
UPDATE listino_prices SET price = 4.70 WHERE product_id = 9 AND listino_id = 1;
UPDATE listino_prices SET price = 4.10 WHERE product_id = 9 AND listino_id = 2;
UPDATE listino_prices SET price = 3.80 WHERE product_id = 9 AND listino_id = 3;
UPDATE listino_prices SET price = 7.30 WHERE product_id = 10 AND listino_id = 1;
UPDATE listino_prices SET price = 6.00 WHERE product_id = 10 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 10 AND listino_id = 3;
UPDATE listino_prices SET price = 7.30 WHERE product_id = 11 AND listino_id = 1;
UPDATE listino_prices SET price = 6.00 WHERE product_id = 11 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 11 AND listino_id = 3;
UPDATE listino_prices SET price = 7.30 WHERE product_id = 12 AND listino_id = 1;
UPDATE listino_prices SET price = 6.00 WHERE product_id = 12 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 12 AND listino_id = 3;

-- Products 13-14: Vini Foglia D'Oro second group (reds)
UPDATE listino_prices SET price = 6.80 WHERE product_id = 13 AND listino_id = 1;
UPDATE listino_prices SET price = 5.80 WHERE product_id = 13 AND listino_id = 2;
UPDATE listino_prices SET price = 3.90 WHERE product_id = 13 AND listino_id = 3;
UPDATE listino_prices SET price = 6.50 WHERE product_id = 14 AND listino_id = 1;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 14 AND listino_id = 2;
UPDATE listino_prices SET price = 3.90 WHERE product_id = 14 AND listino_id = 3;

-- Products 15-19: Vini Campani group 2
UPDATE listino_prices SET price = 20.00 WHERE product_id = 15 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 15 AND listino_id = 2;
UPDATE listino_prices SET price = 16.00 WHERE product_id = 15 AND listino_id = 3;
UPDATE listino_prices SET price = 4.90 WHERE product_id = 16 AND listino_id = 1;
UPDATE listino_prices SET price = 4.30 WHERE product_id = 16 AND listino_id = 2;
UPDATE listino_prices SET price = 3.70 WHERE product_id = 16 AND listino_id = 3;
UPDATE listino_prices SET price = 4.70 WHERE product_id = 17 AND listino_id = 1;
UPDATE listino_prices SET price = 4.10 WHERE product_id = 17 AND listino_id = 2;
UPDATE listino_prices SET price = 3.80 WHERE product_id = 17 AND listino_id = 3;
UPDATE listino_prices SET price = 7.30 WHERE product_id = 18 AND listino_id = 1;
UPDATE listino_prices SET price = 6.00 WHERE product_id = 18 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 18 AND listino_id = 3;
UPDATE listino_prices SET price = 7.30 WHERE product_id = 19 AND listino_id = 1;
UPDATE listino_prices SET price = 6.00 WHERE product_id = 19 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 19 AND listino_id = 3;

-- Products 20-22: Birre
UPDATE listino_prices SET price = 3.50 WHERE product_id = 20 AND listino_id = 1;
UPDATE listino_prices SET price = 3.00 WHERE product_id = 20 AND listino_id = 2;
UPDATE listino_prices SET price = 2.50 WHERE product_id = 20 AND listino_id = 3;
UPDATE listino_prices SET price = 3.50 WHERE product_id = 21 AND listino_id = 1;
UPDATE listino_prices SET price = 3.00 WHERE product_id = 21 AND listino_id = 2;
UPDATE listino_prices SET price = 2.50 WHERE product_id = 21 AND listino_id = 3;
UPDATE listino_prices SET price = 3.50 WHERE product_id = 22 AND listino_id = 1;
UPDATE listino_prices SET price = 3.00 WHERE product_id = 22 AND listino_id = 2;
UPDATE listino_prices SET price = 2.50 WHERE product_id = 22 AND listino_id = 3;

-- Products 23-25: Bollicine
UPDATE listino_prices SET price = 7.50 WHERE product_id = 23 AND listino_id = 1;
UPDATE listino_prices SET price = 6.50 WHERE product_id = 23 AND listino_id = 2;
UPDATE listino_prices SET price = 5.50 WHERE product_id = 23 AND listino_id = 3;
UPDATE listino_prices SET price = 5.90 WHERE product_id = 24 AND listino_id = 1;
UPDATE listino_prices SET price = 4.90 WHERE product_id = 24 AND listino_id = 2;
UPDATE listino_prices SET price = 4.00 WHERE product_id = 24 AND listino_id = 3;
UPDATE listino_prices SET price = 5.90 WHERE product_id = 25 AND listino_id = 1;
UPDATE listino_prices SET price = 4.90 WHERE product_id = 25 AND listino_id = 2;
UPDATE listino_prices SET price = 4.00 WHERE product_id = 25 AND listino_id = 3;

-- Products 26-31: Distillati Linea Tonda
UPDATE listino_prices SET price = 19.00 WHERE product_id = 26 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 26 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 26 AND listino_id = 3;
UPDATE listino_prices SET price = 19.00 WHERE product_id = 27 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 27 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 27 AND listino_id = 3;
UPDATE listino_prices SET price = 19.00 WHERE product_id = 28 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 28 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 28 AND listino_id = 3;
UPDATE listino_prices SET price = 19.00 WHERE product_id = 29 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 29 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 29 AND listino_id = 3;
UPDATE listino_prices SET price = 19.00 WHERE product_id = 30 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 30 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 30 AND listino_id = 3;
UPDATE listino_prices SET price = 19.00 WHERE product_id = 31 AND listino_id = 1;
UPDATE listino_prices SET price = 17.00 WHERE product_id = 31 AND listino_id = 2;
UPDATE listino_prices SET price = 15.00 WHERE product_id = 31 AND listino_id = 3;

-- Products 32-35: Distillati Premium
UPDATE listino_prices SET price = 25.00 WHERE product_id = 32 AND listino_id = 1;
UPDATE listino_prices SET price = 20.00 WHERE product_id = 32 AND listino_id = 2;
UPDATE listino_prices SET price = 18.00 WHERE product_id = 32 AND listino_id = 3;
UPDATE listino_prices SET price = 25.00 WHERE product_id = 33 AND listino_id = 1;
UPDATE listino_prices SET price = 20.00 WHERE product_id = 33 AND listino_id = 2;
UPDATE listino_prices SET price = 18.00 WHERE product_id = 33 AND listino_id = 3;
UPDATE listino_prices SET price = 25.00 WHERE product_id = 34 AND listino_id = 1;
UPDATE listino_prices SET price = 20.00 WHERE product_id = 34 AND listino_id = 2;
UPDATE listino_prices SET price = 18.00 WHERE product_id = 34 AND listino_id = 3;
UPDATE listino_prices SET price = 25.00 WHERE product_id = 35 AND listino_id = 1;
UPDATE listino_prices SET price = 20.00 WHERE product_id = 35 AND listino_id = 2;
UPDATE listino_prices SET price = 18.00 WHERE product_id = 35 AND listino_id = 3;

-- Update product price column to match L1
UPDATE products SET price = 6.80  WHERE id = 1;
UPDATE products SET price = 6.80  WHERE id = 2;
UPDATE products SET price = 6.50  WHERE id = 3;
UPDATE products SET price = 6.20  WHERE id = 4;
UPDATE products SET price = 9.90  WHERE id = 5;
UPDATE products SET price = 9.90  WHERE id = 6;
UPDATE products SET price = 9.90  WHERE id = 7;
UPDATE products SET price = 4.90  WHERE id = 8;
UPDATE products SET price = 4.70  WHERE id = 9;
UPDATE products SET price = 7.30  WHERE id = 10;
UPDATE products SET price = 7.30  WHERE id = 11;
UPDATE products SET price = 7.30  WHERE id = 12;
UPDATE products SET price = 6.80  WHERE id = 13;
UPDATE products SET price = 6.50  WHERE id = 14;
UPDATE products SET price = 20.00 WHERE id = 15;
UPDATE products SET price = 4.90  WHERE id = 16;
UPDATE products SET price = 4.70  WHERE id = 17;
UPDATE products SET price = 7.30  WHERE id = 18;
UPDATE products SET price = 7.30  WHERE id = 19;
UPDATE products SET price = 3.50  WHERE id = 20;
UPDATE products SET price = 3.50  WHERE id = 21;
UPDATE products SET price = 3.50  WHERE id = 22;
UPDATE products SET price = 7.50  WHERE id = 23;
UPDATE products SET price = 5.90  WHERE id = 24;
UPDATE products SET price = 5.90  WHERE id = 25;
UPDATE products SET price = 19.00 WHERE id = 26;
UPDATE products SET price = 19.00 WHERE id = 27;
UPDATE products SET price = 19.00 WHERE id = 28;
UPDATE products SET price = 19.00 WHERE id = 29;
UPDATE products SET price = 19.00 WHERE id = 30;
UPDATE products SET price = 19.00 WHERE id = 31;
UPDATE products SET price = 25.00 WHERE id = 32;
UPDATE products SET price = 25.00 WHERE id = 33;
UPDATE products SET price = 25.00 WHERE id = 34;
UPDATE products SET price = 25.00 WHERE id = 35;

-- Commission exception: Distillati 20% on Listino 1 (applies to premium line)
DELETE FROM commission_exceptions WHERE category IN ('distillati', 'distillati_premium');
INSERT OR REPLACE INTO commission_exceptions (listino_id, category, commission_percent)
SELECT id, 'distillati', 20 FROM listini WHERE sort_order = 1;

-- Remove any old category exceptions for removed categories (should be clean here)
DELETE FROM commission_exceptions WHERE category IN ('vino bianco', 'vino rosso', 'prosecco', 'extra');

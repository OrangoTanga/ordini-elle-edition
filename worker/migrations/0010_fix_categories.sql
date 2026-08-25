-- Migration 0010: Convert product categories back to old names
-- After 0009 mistakenly used new category names, this fixes them per-product.

UPDATE products SET category = 'vino bianco' WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12);
UPDATE products SET category = 'vino rosso' WHERE id IN (13,14,15,16,17,18);
UPDATE products SET category = 'extra'      WHERE id = 19;
UPDATE products SET category = 'birre'      WHERE id IN (20,21,22);
UPDATE products SET category = 'prosecco'   WHERE id IN (23,24,25);
UPDATE products SET category = 'distillati' WHERE id IN (26,27,28,29,30,31,32,33,34,35);

-- Fix commission exception: use 'distillati' instead of 'distillati_premium'
DELETE FROM commission_exceptions WHERE category IN ('distillati_premium', 'distillati');
INSERT OR REPLACE INTO commission_exceptions (listino_id, category, commission_percent)
SELECT id, 'distillati', 20 FROM listini WHERE sort_order = 1;

-- Remove stale exceptions for any old new-category names
DELETE FROM commission_exceptions WHERE category IN (
  'vini_foglia_doro', 'vini_campani', 'bollicine', 'distillati_linea_tonda'
);

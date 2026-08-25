-- Migration 0008: Fill missing L1 prices in listino_prices
-- After migration 0006, L1 prices were deleted and only L2/L3 were re-inserted.
-- This adds the missing L1 prices back.

INSERT OR IGNORE INTO listino_prices (product_id, listino_id, price)
SELECT p.id, l.id, p.price
FROM products p, listini l
WHERE l.sort_order = 1
  AND NOT EXISTS (
    SELECT 1 FROM listino_prices lp
    WHERE lp.product_id = p.id AND lp.listino_id = l.id
  );

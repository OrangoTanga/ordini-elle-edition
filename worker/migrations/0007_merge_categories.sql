-- Migration 0007: Merge distillati_premium into distillati

-- Re-categorize premium distillates
UPDATE products SET category = 'distillati' WHERE category = 'distillati_premium';

-- Remove category-level exception for distillati_premium
DELETE FROM commission_exceptions WHERE category = 'distillati_premium';

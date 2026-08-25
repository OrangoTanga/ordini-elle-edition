-- Migration 0013: Add document type (scontrino | fattura) to orders
-- Up
ALTER TABLE orders ADD COLUMN document_type TEXT NOT NULL DEFAULT 'scontrino';
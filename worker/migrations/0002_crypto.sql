-- Migration 0002: Add crypto_salt for client-side encryption
ALTER TABLE users ADD COLUMN crypto_salt TEXT DEFAULT '';

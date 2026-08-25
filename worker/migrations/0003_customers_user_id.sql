-- Migration 0003: Add user_id to customers for per-rep customer management
-- Up
ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id);

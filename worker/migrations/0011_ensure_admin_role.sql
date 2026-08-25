-- Migration 0011: Ensure admin user has proper role
UPDATE users SET role = 'admin' WHERE username = 'admin' AND role IS NULL;
UPDATE users SET role = 'rep' WHERE role IS NULL;

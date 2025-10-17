-- SCRIPT TO FIX AUTHENTICATION
-- This updates the password system for the root user from both connection types.

ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'michael4291';

FLUSH PRIVILEGES;
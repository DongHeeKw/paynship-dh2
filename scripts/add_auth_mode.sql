-- Migration: Add Authentication Mode System
-- Run this in Supabase SQL Editor

-- 1. Add isAdmin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Add isGuest column to chat_sessions table
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- 3. Add auth mode columns to admin_settings table
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS auth_mode VARCHAR(255) DEFAULT 'GUEST_UNTIL_CHECKOUT';

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS show_demo_conversation BOOLEAN DEFAULT true;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS demo_conversation_data JSONB;

-- 4. Set your admin user (replace with your email)
-- UPDATE users SET is_admin = true WHERE email = 'your-admin@email.com';

-- 5. Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_admin';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'chat_sessions' AND column_name = 'is_guest';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admin_settings' AND column_name IN ('auth_mode', 'show_demo_conversation', 'demo_conversation_data');

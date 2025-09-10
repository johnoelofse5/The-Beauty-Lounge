-- Migration to update users table structure for admin user management
-- This allows creating users without requiring admin auth privileges

-- First, let's check if there's a foreign key constraint and handle it
DO $$ 
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'users_id_fkey' AND table_name = 'users') THEN
        ALTER TABLE users DROP CONSTRAINT users_id_fkey;
    END IF;
END $$;

-- Add any missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add id column if it doesn't exist (should be UUID primary key)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'id') THEN
        ALTER TABLE users ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
    
    -- Add first_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add phone if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;
    
    -- Add is_practitioner if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_practitioner') THEN
        ALTER TABLE users ADD COLUMN is_practitioner BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add is_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Add is_deleted if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_deleted') THEN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Ensure the id column has a default value for UUID generation
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Update RLS policies to allow inserting users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert new users" ON users;
DROP POLICY IF EXISTS "Users can update any user" ON users;
DROP POLICY IF EXISTS "Users can delete any user" ON users;

-- Create new RLS policies
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert new users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update any user" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete any user" ON users
    FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_practitioner ON users(is_practitioner);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a sample admin user if no users exist
INSERT INTO users (email, first_name, last_name, phone, is_practitioner, is_active, is_deleted)
SELECT 
    'admin@example.com',
    'Admin',
    'User',
    '555-0000',
    true,
    true,
    false
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

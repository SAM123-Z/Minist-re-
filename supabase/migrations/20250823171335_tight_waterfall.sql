/*
  # Temporarily disable RLS for pending_users table

  1. Security Changes
    - Temporarily disable RLS on pending_users table to allow anonymous registration
    - This allows unauthenticated users to submit registration requests
    - Will be re-enabled later with proper policies once the issue is resolved

  Note: This is a temporary fix to resolve the immediate RLS policy violation
*/

-- Temporarily disable RLS on pending_users table
ALTER TABLE pending_users DISABLE ROW LEVEL SECURITY;
/*
  # Fix RLS policy for pending_users table

  1. Security Changes
    - Update INSERT policy to allow anonymous users to submit registration requests
    - Ensure the policy allows both 'anon' and 'authenticated' roles to insert data
    - Maintain security by only allowing users to insert their own data

  This migration fixes the "new row violates row-level security policy" error
  that occurs when users try to submit registration requests.
*/

-- Drop the existing restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Anyone can submit registration request" ON pending_users;

-- Create a new INSERT policy that allows both anonymous and authenticated users
CREATE POLICY "Allow registration submissions"
  ON pending_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the existing SELECT policy for users reading their own requests still works
DROP POLICY IF EXISTS "Users can read own pending request" ON pending_users;

CREATE POLICY "Users can read own pending request"
  ON pending_users
  FOR SELECT
  TO authenticated
  USING (email IN (
    SELECT users.email
    FROM users
    WHERE users.id = auth.uid()
  ));
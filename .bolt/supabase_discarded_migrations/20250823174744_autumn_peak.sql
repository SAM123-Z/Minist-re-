/*
  # Create OTP codes table

  1. New Tables
    - `otp_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `otp_code` (text, not null)
      - `type` (text, default 'login')
      - `expires_at` (timestamptz, not null)
      - `used` (boolean, default false)
      - `verified_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `otp_codes` table
    - Add policies for OTP management

  3. Indexes
    - Index on email and type for fast lookups
    - Index on expires_at for cleanup
*/

-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  type text DEFAULT 'login' CHECK (type IN ('login', 'registration', 'password_reset')),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_type ON otp_codes(email, type);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON otp_codes(used);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage OTP codes"
  ON otp_codes
  FOR ALL
  TO service_role
  USING (true);

-- Create unique constraint to prevent duplicate active OTPs
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_codes_email_type_active 
  ON otp_codes(email, type) 
  WHERE used = false AND expires_at > now();

-- Function to cleanup expired OTPs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM otp_codes 
  WHERE expires_at < now() - interval '1 day';
END;
$$;
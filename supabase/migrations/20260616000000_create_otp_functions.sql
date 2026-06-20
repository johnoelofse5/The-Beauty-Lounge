-- OTP codes table
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_purpose ON public.otp_codes (phone_number, purpose);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage otp_codes' AND tablename = 'otp_codes') THEN
    DROP POLICY "Service role can manage otp_codes" ON public.otp_codes;
  END IF;
END $$;

CREATE POLICY "Service role can manage otp_codes" ON public.otp_codes
  FOR ALL
  USING (auth.role() = 'service_role');

DROP FUNCTION IF EXISTS public.generate_otp_code();
DROP FUNCTION IF EXISTS public.create_or_update_otp(text, text);
DROP FUNCTION IF EXISTS public.create_or_update_otp(character varying, character varying);
DROP FUNCTION IF EXISTS public.verify_otp(text, text, text);
DROP FUNCTION IF EXISTS public.verify_otp(character varying, character varying, character varying);

-- Generate a random 6-digit OTP code
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

-- Create or update an OTP record and return the generated code
CREATE OR REPLACE FUNCTION public.create_or_update_otp(
  phone_number_param TEXT,
  purpose_param TEXT DEFAULT 'signup'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_otp_code TEXT;
  existing_record RECORD;
BEGIN
  new_otp_code := public.generate_otp_code();

  SELECT id INTO existing_record
  FROM public.otp_codes
  WHERE phone_number = phone_number_param
    AND purpose = purpose_param
    AND is_verified = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.otp_codes
    SET otp_code = new_otp_code,
        attempts = 0,
        expires_at = NOW() + INTERVAL '10 minutes',
        updated_at = NOW()
    WHERE id = existing_record.id;
  ELSE
    INSERT INTO public.otp_codes (phone_number, otp_code, purpose, expires_at)
    VALUES (phone_number_param, new_otp_code, purpose_param, NOW() + INTERVAL '10 minutes');
  END IF;

  RETURN new_otp_code;
END;
$$;

-- Verify an OTP code
CREATE OR REPLACE FUNCTION public.verify_otp(
  phone_number_param TEXT,
  otp_code_param TEXT,
  purpose_param TEXT DEFAULT 'signup'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  record_found RECORD;
BEGIN
  SELECT id, attempts, max_attempts, expires_at, is_verified
  INTO record_found
  FROM public.otp_codes
  WHERE phone_number = phone_number_param
    AND purpose = purpose_param
    AND otp_code = otp_code_param
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF record_found.is_verified THEN
    RETURN FALSE;
  END IF;

  IF record_found.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  IF record_found.attempts >= record_found.max_attempts THEN
    RETURN FALSE;
  END IF;

  UPDATE public.otp_codes
  SET is_verified = TRUE,
      attempts = attempts + 1,
      updated_at = NOW()
  WHERE id = record_found.id;

  RETURN TRUE;
END;
$$;

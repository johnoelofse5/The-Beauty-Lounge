-- Migration: Create OTP table for SMS verification
-- This table stores OTP codes for mobile phone verification

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'signup', -- 'signup', 'signin', 'password_reset'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_number ON public.otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON public.otp_codes(purpose);
CREATE INDEX IF NOT EXISTS idx_otp_codes_active ON public.otp_codes(phone_number, purpose, expires_at) WHERE is_verified = FALSE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_otp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_otp_codes_updated_at 
    BEFORE UPDATE ON public.otp_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_otp_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow anyone to create OTP codes (for signup/signin)
CREATE POLICY "Anyone can create OTP codes"
    ON public.otp_codes FOR INSERT
    WITH CHECK (true);

-- Allow anyone to verify OTP codes (for signup/signin)
CREATE POLICY "Anyone can verify OTP codes"
    ON public.otp_codes FOR UPDATE
    USING (true);

-- Allow anyone to read OTP codes (for verification)
CREATE POLICY "Anyone can read OTP codes"
    ON public.otp_codes FOR SELECT
    USING (true);

-- Function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.otp_codes 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a random 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create or update OTP for a phone number
CREATE OR REPLACE FUNCTION create_or_update_otp(
    phone_number_param VARCHAR(20),
    purpose_param VARCHAR(50) DEFAULT 'signup'
)
RETURNS VARCHAR(6) AS $$
DECLARE
    new_otp VARCHAR(6);
    existing_otp_id UUID;
BEGIN
    -- Generate new OTP
    new_otp := generate_otp_code();
    
    -- Check if there's an existing unverified OTP for this phone number and purpose
    SELECT id INTO existing_otp_id
    FROM public.otp_codes
    WHERE phone_number = phone_number_param
      AND purpose = purpose_param
      AND is_verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF existing_otp_id IS NOT NULL THEN
        -- Update existing OTP
        UPDATE public.otp_codes
        SET otp_code = new_otp,
            attempts = 0,
            expires_at = NOW() + INTERVAL '10 minutes',
            updated_at = NOW()
        WHERE id = existing_otp_id;
    ELSE
        -- Create new OTP
        INSERT INTO public.otp_codes (phone_number, otp_code, purpose, expires_at)
        VALUES (phone_number_param, new_otp, purpose_param, NOW() + INTERVAL '10 minutes');
    END IF;
    
    RETURN new_otp;
END;
$$ LANGUAGE plpgsql;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(
    phone_number_param VARCHAR(20),
    otp_code_param VARCHAR(6),
    purpose_param VARCHAR(50) DEFAULT 'signup'
)
RETURNS BOOLEAN AS $$
DECLARE
    otp_record RECORD;
BEGIN
    -- Find the most recent unverified OTP for this phone number and purpose
    SELECT * INTO otp_record
    FROM public.otp_codes
    WHERE phone_number = phone_number_param
      AND purpose = purpose_param
      AND is_verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no OTP found, return false
    IF otp_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if max attempts exceeded
    IF otp_record.attempts >= otp_record.max_attempts THEN
        RETURN FALSE;
    END IF;
    
    -- Increment attempts
    UPDATE public.otp_codes
    SET attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = otp_record.id;
    
    -- Check if OTP matches
    IF otp_record.otp_code = otp_code_param THEN
        -- Mark as verified
        UPDATE public.otp_codes
        SET is_verified = TRUE,
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = otp_record.id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_otp_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_otp_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_otp(VARCHAR(20), VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_otp(VARCHAR(20), VARCHAR(6), VARCHAR(50)) TO authenticated;

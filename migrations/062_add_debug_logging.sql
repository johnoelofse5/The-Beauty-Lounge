-- Migration: Add debug logging for edge functions and user operations
-- Date: $(date)
-- Description: Add logging table and functions to debug signup issues

-- Create debug logs table
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    user_id UUID,
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_operation ON public.debug_logs(operation);
CREATE INDEX IF NOT EXISTS idx_debug_logs_phone ON public.debug_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at);

-- Enable RLS
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert logs
CREATE POLICY "Service role can manage debug logs" ON public.debug_logs
    FOR ALL USING (true);

-- Function to log debug information
CREATE OR REPLACE FUNCTION public.log_debug(
    operation_param VARCHAR(100),
    phone_number_param VARCHAR(50) DEFAULT NULL,
    user_id_param UUID DEFAULT NULL,
    details_param JSONB DEFAULT NULL,
    error_message_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.debug_logs (operation, phone_number, user_id, details, error_message)
    VALUES (operation_param, phone_number_param, user_id_param, details_param, error_message_param)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced verify_otp function with logging
CREATE OR REPLACE FUNCTION public.verify_otp_with_logging(
    phone_number_param VARCHAR(20),
    otp_code_param VARCHAR(6),
    purpose_param VARCHAR(50) DEFAULT 'signup'
)
RETURNS BOOLEAN AS $$
DECLARE
    stored_otp_record RECORD;
    is_valid BOOLEAN := FALSE;
    log_details JSONB;
BEGIN
    -- Log the verification attempt
    log_details := jsonb_build_object(
        'phone_number', phone_number_param,
        'purpose', purpose_param,
        'otp_code_length', LENGTH(otp_code_param)
    );
    
    PERFORM public.log_debug('otp_verify_attempt', phone_number_param, NULL, log_details);
    
    -- Get the OTP record
    SELECT * INTO stored_otp_record
    FROM public.otp_codes
    WHERE phone_number = phone_number_param
      AND purpose = purpose_param
      AND is_verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF stored_otp_record IS NULL THEN
        PERFORM public.log_debug('otp_verify_failed', phone_number_param, NULL, 
            jsonb_build_object('reason', 'no_valid_otp_found'));
        RETURN FALSE;
    END IF;
    
    -- Check if OTP code matches
    IF stored_otp_record.otp_code = otp_code_param THEN
        -- Check if max attempts exceeded
        IF stored_otp_record.attempts >= stored_otp_record.max_attempts THEN
            PERFORM public.log_debug('otp_verify_failed', phone_number_param, NULL, 
                jsonb_build_object('reason', 'max_attempts_exceeded', 'attempts', stored_otp_record.attempts));
            RETURN FALSE;
        END IF;
        
        -- Mark OTP as verified
        UPDATE public.otp_codes
        SET is_verified = TRUE,
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = stored_otp_record.id;
        
        is_valid := TRUE;
        
        PERFORM public.log_debug('otp_verify_success', phone_number_param, NULL, 
            jsonb_build_object('otp_id', stored_otp_record.id));
    ELSE
        -- Increment attempts
        UPDATE public.otp_codes
        SET attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = stored_otp_record.id;
        
        PERFORM public.log_debug('otp_verify_failed', phone_number_param, NULL, 
            jsonb_build_object('reason', 'incorrect_code', 'attempts', stored_otp_record.attempts + 1));
    END IF;
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to log user creation attempts
CREATE OR REPLACE FUNCTION public.log_user_creation_attempt(
    phone_number_param VARCHAR(50),
    user_data_param JSONB
)
RETURNS UUID AS $$
BEGIN
    RETURN public.log_debug('user_creation_attempt', phone_number_param, NULL, user_data_param);
END;
$$ LANGUAGE plpgsql;

-- Function to log user creation success
CREATE OR REPLACE FUNCTION public.log_user_creation_success(
    phone_number_param VARCHAR(50),
    user_id_param UUID
)
RETURNS UUID AS $$
BEGIN
    RETURN public.log_debug('user_creation_success', phone_number_param, user_id_param, 
        jsonb_build_object('user_id', user_id_param));
END;
$$ LANGUAGE plpgsql;

-- Function to log user creation errors
CREATE OR REPLACE FUNCTION public.log_user_creation_error(
    phone_number_param VARCHAR(50),
    error_message_param TEXT,
    error_details_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
    RETURN public.log_debug('user_creation_error', phone_number_param, NULL, 
        error_details_param, error_message_param);
END;
$$ LANGUAGE plpgsql;

-- Create a view to easily query debug logs
CREATE OR REPLACE VIEW public.debug_logs_summary AS
SELECT 
    operation,
    phone_number,
    user_id,
    details,
    error_message,
    created_at,
    DATE_TRUNC('minute', created_at) as minute_group
FROM public.debug_logs
ORDER BY created_at DESC;

-- Function to clean up old debug logs (keep only last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_debug_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.debug_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Migration: Create email tracking table
-- This table tracks all emails sent through the system for monitoring and debugging

-- Create email_tracking table
CREATE TABLE IF NOT EXISTS public.email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- 'password_reset', 'welcome', 'appointment_confirmation', etc.
    subject VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB, -- Store additional data like user_id, appointment_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_email ON public.email_tracking(email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON public.email_tracking(email_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON public.email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_created_at ON public.email_tracking(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_tracking_updated_at 
    BEFORE UPDATE ON public.email_tracking 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to view email tracking (for admin purposes)
CREATE POLICY "Authenticated users can view email tracking"
    ON public.email_tracking FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert email tracking records
CREATE POLICY "Authenticated users can insert email tracking"
    ON public.email_tracking FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update email tracking records
CREATE POLICY "Authenticated users can update email tracking"
    ON public.email_tracking FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Insert some sample data for testing
INSERT INTO public.email_tracking (email, email_type, subject, status, sent_at, metadata) VALUES
('johnoelofse5@gmail.com', 'password_reset', 'Reset Your Password', 'sent', NOW(), '{"user_id": "sample-user-id", "reset_token": "sample-token"}'),
('stacey.mattheys@gmail.com', 'password_reset', 'Reset Your Password', 'pending', NULL, '{"user_id": "sample-user-id-2"}');

-- Add comments for documentation
COMMENT ON TABLE public.email_tracking IS 'Tracks all emails sent through the system for monitoring and debugging purposes';
COMMENT ON COLUMN public.email_tracking.email IS 'Recipient email address';
COMMENT ON COLUMN public.email_tracking.email_type IS 'Type of email (password_reset, welcome, appointment_confirmation, etc.)';
COMMENT ON COLUMN public.email_tracking.subject IS 'Email subject line';
COMMENT ON COLUMN public.email_tracking.status IS 'Current status of the email (pending, sent, delivered, failed, bounced)';
COMMENT ON COLUMN public.email_tracking.sent_at IS 'Timestamp when email was sent';
COMMENT ON COLUMN public.email_tracking.delivered_at IS 'Timestamp when email was delivered (if available)';
COMMENT ON COLUMN public.email_tracking.failed_at IS 'Timestamp when email failed to send';
COMMENT ON COLUMN public.email_tracking.error_message IS 'Error message if email failed';
COMMENT ON COLUMN public.email_tracking.metadata IS 'Additional data stored as JSON (user_id, appointment_id, etc.)';

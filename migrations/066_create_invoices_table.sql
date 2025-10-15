-- Migration: Create invoices table for tracking invoice generation and SMS sending
-- Date: 2025-01-13
-- Description: Create table to track invoices sent to clients via SMS

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    services_data JSONB NOT NULL, -- Store service details with prices
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    invoice_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'sent', 'failed', 'delivered'
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMPTZ,
    sms_error TEXT,
    pdf_url TEXT, -- URL to the generated PDF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_practitioner_id ON invoices(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Create function to generate unique invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    invoice_num TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        -- Format: INV-YYYYMMDD-XXXX (e.g., INV-20250113-0001)
        invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this invoice number already exists
        IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_num) THEN
            RETURN invoice_num;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 9999 THEN
            RAISE EXCEPTION 'Unable to generate unique invoice number';
        END IF;
    END LOOP;
END;
$$;

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT
    USING (
        auth.uid() = client_id 
        OR auth.uid() = practitioner_id
        OR EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'super_admin'
        )
    );

CREATE POLICY "Practitioners can create invoices for their appointments" ON invoices
    FOR INSERT
    WITH CHECK (
        auth.uid() = practitioner_id
        AND EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = appointment_id 
            AND a.practitioner_id = auth.uid()
            AND a.is_active = true
            AND a.is_deleted = false
        )
    );

CREATE POLICY "Practitioners can update their own invoices" ON invoices
    FOR UPDATE
    USING (auth.uid() = practitioner_id)
    WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Super admins can manage all invoices" ON invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'super_admin'
        )
    );

-- Grant execute permission on the invoice number generation function
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

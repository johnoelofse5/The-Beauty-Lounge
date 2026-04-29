ALTER TABLE app_settings 
ADD COLUMN send_email_on_booking boolean NOT NULL DEFAULT true,
ADD COLUMN send_email_on_invoice boolean NOT NULL DEFAULT true;
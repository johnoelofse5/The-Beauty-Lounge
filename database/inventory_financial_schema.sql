-- Inventory and Financial Management Schema
-- This schema supports stock tracking, revenue monitoring, and expense management

-- 1. Inventory Categories Table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(50) UNIQUE,
  unit_of_measure VARCHAR(20) DEFAULT 'unit', -- unit, ml, g, kg, etc.
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0.00,
  selling_price DECIMAL(10,2) DEFAULT 0.00,
  supplier_name VARCHAR(100),
  supplier_contact TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Stock Movements Table (for tracking all stock changes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) NOT NULL,
  movement_type VARCHAR(20) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'waste'
  quantity INTEGER NOT NULL, -- positive for in, negative for out
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_id UUID, -- can link to purchase orders, appointments, etc.
  reference_type VARCHAR(50), -- 'purchase_order', 'appointment', 'adjustment'
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(100) NOT NULL,
  supplier_contact TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'ordered', 'received', 'cancelled'
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) NOT NULL,
  item_id UUID REFERENCES inventory_items(id) NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Financial Transactions Table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(20) NOT NULL, -- 'income', 'expense'
  category VARCHAR(50) NOT NULL, -- 'service_revenue', 'inventory_purchase', 'other'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  reference_id UUID, -- can link to appointments, purchase orders, etc.
  reference_type VARCHAR(50), -- 'appointment', 'purchase_order', 'manual'
  payment_method VARCHAR(30), -- 'cash', 'card', 'bank_transfer', 'other'
  receipt_number VARCHAR(100),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Service Revenue Tracking (links services to financial transactions)
CREATE TABLE IF NOT EXISTS service_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  service_id UUID REFERENCES services(id),
  financial_transaction_id UUID REFERENCES financial_transactions(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Row Level Security)
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_revenue ENABLE ROW LEVEL SECURITY;

-- Policies for super_admin and practitioner access
CREATE POLICY "Super admins and practitioners can manage inventory categories" ON inventory_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage inventory items" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage stock movements" ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage purchase orders" ON purchase_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage purchase order items" ON purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage financial transactions" ON financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

CREATE POLICY "Super admins and practitioners can manage service revenue" ON service_revenue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('super_admin', 'practitioner')
      AND u.is_active = true
      AND u.is_deleted = false
    )
  );

-- Sample data for testing
INSERT INTO inventory_categories (name, description, display_order) VALUES
('Hair Products', 'Shampoos, conditioners, styling products', 1),
('Nail Products', 'Nail polishes, gels, treatments', 2),
('Skincare', 'Facial treatments, moisturizers, cleansers', 3),
('Tools & Equipment', 'Brushes, combs, scissors, nail files', 4),
('Supplies', 'Towels, gloves, sanitizers', 5);

-- Functions to help with inventory management
CREATE OR REPLACE FUNCTION get_inventory_value()
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(current_stock * unit_cost), 0)
    FROM inventory_items
    WHERE is_active = true AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  item_id UUID,
  item_name VARCHAR(200),
  current_stock INTEGER,
  minimum_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.current_stock,
    i.minimum_stock
  FROM inventory_items i
  WHERE i.current_stock <= i.minimum_stock
    AND i.is_active = true 
    AND i.is_deleted = false
  ORDER BY i.current_stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_monthly_revenue(month_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM financial_transactions
    WHERE transaction_type = 'income'
      AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM month_date)
      AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM month_date)
      AND is_active = true
      AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_monthly_expenses(month_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM financial_transactions
    WHERE transaction_type = 'expense'
      AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM month_date)
      AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM month_date)
      AND is_active = true
      AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUITE 'O' — Complete Database Schema
-- Supabase PostgreSQL (Free Tier Compatible)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'staff', 'receptionist');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'net_banking', 'wallet', 'split');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded', 'failed');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE service_category AS ENUM ('hair', 'skin', 'makeup', 'nails', 'spa', 'bridal', 'other');
CREATE TYPE inventory_transaction_type AS ENUM ('purchase', 'usage', 'adjustment', 'return', 'expired');
CREATE TYPE loyalty_transaction_type AS ENUM ('earned', 'redeemed', 'expired', 'bonus');
CREATE TYPE notification_type AS ENUM ('booking_confirmation', 'reminder', 'cancellation', 'promotion', 'birthday');
CREATE TYPE membership_status AS ENUM ('active', 'expired', 'cancelled', 'paused');

-- ============================================================
-- SALONS (Multi-tenant root)
-- ============================================================

CREATE TABLE salons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  cover_url     TEXT,
  phone         TEXT NOT NULL,
  email         TEXT,
  address       TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  pincode       TEXT,
  gst_number    TEXT,
  currency      TEXT NOT NULL DEFAULT 'INR',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  working_hours JSONB NOT NULL DEFAULT '{
    "monday":    {"open": "09:00", "close": "20:00", "is_open": true},
    "tuesday":   {"open": "09:00", "close": "20:00", "is_open": true},
    "wednesday": {"open": "09:00", "close": "20:00", "is_open": true},
    "thursday":  {"open": "09:00", "close": "20:00", "is_open": true},
    "friday":    {"open": "09:00", "close": "20:00", "is_open": true},
    "saturday":  {"open": "09:00", "close": "21:00", "is_open": true},
    "sunday":    {"open": "10:00", "close": "18:00", "is_open": true}
  }',
  booking_buffer_minutes  INTEGER NOT NULL DEFAULT 10,
  max_advance_booking_days INTEGER NOT NULL DEFAULT 30,
  auto_confirm_bookings   BOOLEAN NOT NULL DEFAULT false,
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (Auth integration via Supabase Auth)
-- ============================================================

CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id   UUID REFERENCES salons(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'staff',
  full_name  TEXT NOT NULL,
  phone      TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAFF
-- ============================================================

CREATE TABLE staff (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id       UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  avatar_url     TEXT,
  designation    TEXT,
  bio            TEXT,
  gender         gender,
  date_of_birth  DATE,
  date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
  specializations TEXT[] DEFAULT '{}',
  working_days   INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=Sun..6=Sat
  working_hours  JSONB NOT NULL DEFAULT '{"start": "09:00", "end": "20:00"}',
  break_times    JSONB NOT NULL DEFAULT '[]',
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'none')),
  commission_value DECIMAL(5,2) NOT NULL DEFAULT 0,
  salary         DECIMAL(10,2),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICE CATEGORIES & SERVICES
-- ============================================================

CREATE TABLE service_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id    UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT DEFAULT '#FF2070',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  base_price       DECIMAL(10,2) NOT NULL,
  gst_rate         DECIMAL(5,2) NOT NULL DEFAULT 18.0,
  is_gst_inclusive BOOLEAN NOT NULL DEFAULT false,
  pricing_tiers    JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"label": "Senior Stylist", "price": 800}, {"label": "Junior", "price": 500}]
  add_ons          JSONB NOT NULL DEFAULT '[]',
  image_url        TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff-service mapping (which staff can do which service)
CREATE TABLE staff_services (
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price_override DECIMAL(10,2), -- null = use service base price
  PRIMARY KEY (staff_id, service_id)
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id          UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  gender            gender,
  date_of_birth     DATE,
  anniversary_date  DATE,
  avatar_url        TEXT,
  address           TEXT,
  city              TEXT,
  referred_by       UUID REFERENCES customers(id),
  tags              TEXT[] DEFAULT '{}',
  notes             TEXT,
  skin_type         TEXT,
  hair_type         TEXT,
  allergies         TEXT,
  preferences       JSONB NOT NULL DEFAULT '{}',
  total_visits      INTEGER NOT NULL DEFAULT 0,
  total_spent       DECIMAL(12,2) NOT NULL DEFAULT 0,
  loyalty_points    INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, phone)
);

-- ============================================================
-- MEMBERSHIPS & PACKAGES
-- ============================================================

CREATE TABLE membership_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  validity_days INTEGER NOT NULL,
  benefits      JSONB NOT NULL DEFAULT '[]',
  -- [{type: "discount", value: 10, service_id: null}, {type: "free_service", service_id: "uuid"}]
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_memberships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES membership_plans(id),
  status        membership_status NOT NULL DEFAULT 'active',
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE NOT NULL,
  amount_paid   DECIMAL(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  staff_id         UUID NOT NULL REFERENCES staff(id),
  service_id       UUID NOT NULL REFERENCES services(id),
  status           appointment_status NOT NULL DEFAULT 'pending',
  appointment_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  service_price    DECIMAL(10,2) NOT NULL,
  add_ons          JSONB NOT NULL DEFAULT '[]',
  pricing_tier     TEXT,
  notes            TEXT,
  internal_notes   TEXT,
  source           TEXT NOT NULL DEFAULT 'walk_in' CHECK (source IN ('online', 'walk_in', 'phone', 'whatsapp')),
  reminder_sent    BOOLEAN NOT NULL DEFAULT false,
  confirmed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVOICES & PAYMENTS
-- ============================================================

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  appointment_id  UUID REFERENCES appointments(id),
  line_items      JSONB NOT NULL DEFAULT '[]',
  -- [{service_id, name, quantity, unit_price, gst_rate, gst_amount, discount, total}]
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_type   TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  coupon_code     TEXT,
  taxable_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  igst_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_tax       DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
  loyalty_points_used    INTEGER NOT NULL DEFAULT 0,
  loyalty_points_earned  INTEGER NOT NULL DEFAULT 0,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, invoice_number)
);

CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id       UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  amount         DECIMAL(12,2) NOT NULL,
  method         payment_method NOT NULL,
  status         payment_status NOT NULL DEFAULT 'paid',
  transaction_id TEXT,
  upi_ref        TEXT,
  notes          TEXT,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2),
  max_discount    DECIMAL(10,2),
  usage_limit     INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, code)
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  gst_number   TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  supplier_id      UUID REFERENCES suppliers(id),
  name             TEXT NOT NULL,
  sku              TEXT,
  category         TEXT,
  description      TEXT,
  unit             TEXT NOT NULL DEFAULT 'piece',
  current_stock    DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock    DECIMAL(10,2) NOT NULL DEFAULT 5,
  maximum_stock    DECIMAL(10,2),
  cost_price       DECIMAL(10,2),
  selling_price    DECIMAL(10,2),
  expiry_date      DATE,
  is_retail        BOOLEAN NOT NULL DEFAULT false, -- can be sold to customers
  is_active        BOOLEAN NOT NULL DEFAULT true,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, sku)
);

CREATE TABLE inventory_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES inventory_products(id),
  type         inventory_transaction_type NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL,
  unit_cost    DECIMAL(10,2),
  total_cost   DECIMAL(12,2),
  reference_id UUID, -- appointment_id or invoice_id
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service-product mapping (which products are used per service)
CREATE TABLE service_products (
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  quantity    DECIMAL(10,3) NOT NULL DEFAULT 1,
  PRIMARY KEY (service_id, product_id)
);

-- ============================================================
-- LOYALTY POINTS
-- ============================================================

CREATE TABLE loyalty_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id),
  type         loyalty_transaction_type NOT NULL,
  points       INTEGER NOT NULL,
  reference_id UUID, -- invoice_id
  description  TEXT,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAFF ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff(id),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, staff_id, date)
);

-- ============================================================
-- NOTIFICATIONS / WHATSAPP LOG
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id),
  type            notification_type NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  recipient       TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  external_id     TEXT,
  appointment_id  UUID REFERENCES appointments(id),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDIA GALLERY
-- ============================================================

CREATE TABLE media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id),
  staff_id     UUID REFERENCES staff(id),
  type         TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('before', 'after', 'before_after', 'portfolio')),
  url          TEXT NOT NULL,
  thumbnail_url TEXT,
  caption      TEXT,
  service_id   UUID REFERENCES services(id),
  appointment_id UUID REFERENCES appointments(id),
  tags         TEXT[] DEFAULT '{}',
  is_public    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Appointments
CREATE INDEX idx_appointments_salon_date ON appointments(salon_id, appointment_date);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_id, appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Customers
CREATE INDEX idx_customers_salon ON customers(salon_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name_trgm ON customers USING GIN(full_name gin_trgm_ops);

-- Invoices
CREATE INDEX idx_invoices_salon_date ON invoices(salon_id, created_at);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);

-- Inventory
CREATE INDEX idx_inventory_salon ON inventory_products(salon_id);
CREATE INDEX idx_inventory_low_stock ON inventory_products(salon_id, current_stock, minimum_stock);
CREATE INDEX idx_inventory_expiry ON inventory_products(expiry_date) WHERE expiry_date IS NOT NULL;

-- Loyalty
CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);

-- Attendance
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, date);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON salons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_products_updated_at BEFORE UPDATE ON inventory_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  salon_prefix TEXT;
  next_num INTEGER;
  inv_number TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(slug, 1, 3)) INTO salon_prefix FROM salons WHERE id = NEW.salon_id;
  SELECT COUNT(*) + 1 INTO next_num FROM invoices WHERE salon_id = NEW.salon_id;
  inv_number := salon_prefix || '-INV-' || LPAD(next_num::TEXT, 6, '0');
  NEW.invoice_number := inv_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Update customer stats on invoice paid
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE customers SET
      total_visits = total_visits + 1,
      total_spent = total_spent + NEW.grand_total,
      loyalty_points = loyalty_points + NEW.loyalty_points_earned
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_invoice_paid AFTER UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Update inventory on service completion
CREATE OR REPLACE FUNCTION deduct_service_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO inventory_transactions (salon_id, product_id, type, quantity, reference_id, notes)
    SELECT NEW.salon_id, sp.product_id, 'usage', sp.quantity, NEW.id, 'Auto: Service completion'
    FROM service_products sp
    WHERE sp.service_id = NEW.service_id;

    UPDATE inventory_products ip SET
      current_stock = current_stock - sp.quantity,
      updated_at = NOW()
    FROM service_products sp
    WHERE sp.service_id = NEW.service_id AND ip.id = sp.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_completed AFTER UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION deduct_service_inventory();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's salon_id
CREATE OR REPLACE FUNCTION get_my_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Salon access (own salon only)
CREATE POLICY "Users see their own salon" ON salons
  FOR ALL USING (id = get_my_salon_id());

-- Users (own salon)
CREATE POLICY "Users see salon members" ON users
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (salon_id = get_my_salon_id() AND get_my_role() IN ('admin', 'super_admin'));

-- Staff (own salon)
CREATE POLICY "Staff visible to salon members" ON staff
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Managers can manage staff" ON staff
  FOR ALL USING (salon_id = get_my_salon_id() AND get_my_role() IN ('admin', 'manager', 'super_admin'));

-- Customers (own salon)
CREATE POLICY "Customers visible to salon members" ON customers
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can manage customers" ON customers
  FOR ALL USING (salon_id = get_my_salon_id());

-- Appointments (own salon)
CREATE POLICY "Appointments visible to salon members" ON appointments
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can manage appointments" ON appointments
  FOR ALL USING (salon_id = get_my_salon_id());

-- Services (own salon)
CREATE POLICY "Services visible to salon members" ON services
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (salon_id = get_my_salon_id() AND get_my_role() IN ('admin', 'manager', 'super_admin'));

-- Invoices & Payments
CREATE POLICY "Invoices visible to salon members" ON invoices
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can create invoices" ON invoices
  FOR ALL USING (salon_id = get_my_salon_id());

CREATE POLICY "Payments visible to salon members" ON payments
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can record payments" ON payments
  FOR ALL USING (salon_id = get_my_salon_id());

-- Inventory
CREATE POLICY "Inventory visible to salon members" ON inventory_products
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Managers can manage inventory" ON inventory_products
  FOR ALL USING (salon_id = get_my_salon_id() AND get_my_role() IN ('admin', 'manager', 'super_admin'));

CREATE POLICY "Inventory transactions visible" ON inventory_transactions
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can add inventory transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (salon_id = get_my_salon_id());

-- Attendance
CREATE POLICY "Attendance visible to managers" ON attendance
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Managers can manage attendance" ON attendance
  FOR ALL USING (salon_id = get_my_salon_id() AND get_my_role() IN ('admin', 'manager', 'super_admin'));

-- Notifications
CREATE POLICY "Notifications visible to managers" ON notifications
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (salon_id = get_my_salon_id());

-- Media
CREATE POLICY "Media visible to salon members" ON media
  FOR SELECT USING (salon_id = get_my_salon_id());
CREATE POLICY "Staff can manage media" ON media
  FOR ALL USING (salon_id = get_my_salon_id());

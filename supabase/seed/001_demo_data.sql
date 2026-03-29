-- ============================================================
-- SUITE 'O' — Seed Data (Demo Salon)
-- Run AFTER creating auth users in Supabase dashboard
-- ============================================================

-- Demo Salon
INSERT INTO salons (id, name, slug, phone, email, address, city, state, pincode, gst_number, booking_buffer_minutes)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Glamour Studio by Suite O',
  'glamour-studio',
  '+91-9876543210',
  'owner@glamourstudio.in',
  '12-A, Hazratganj, Near Civil Lines',
  'Lucknow', 'Uttar Pradesh', '226001',
  '09AABCU9603R1ZX',
  10
);

-- Service Categories
INSERT INTO service_categories (id, salon_id, name, icon, color, sort_order) VALUES
('sc-0001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Hair', 'scissors', '#FF2070', 1),
('sc-0002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Skin', 'sparkles', '#7C3AED', 2),
('sc-0003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Makeup', 'palette', '#DC2626', 3),
('sc-0004-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Nails', 'gem', '#0891B2', 4),
('sc-0005-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Spa', 'leaf', '#059669', 5),
('sc-0006-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Bridal', 'crown', '#D97706', 6);

-- Services
INSERT INTO services (id, salon_id, category_id, name, description, duration_minutes, base_price, gst_rate, pricing_tiers) VALUES
-- Hair
('sv-001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0001-0000-0000-000000000001',
 'Haircut (Women)', 'Precision cut with blow dry', 60, 800, 18, '[{"label":"Senior Stylist","price":1200},{"label":"Junior","price":800}]'),
('sv-002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0001-0000-0000-000000000001',
 'Hair Color', 'Global hair color with ammonia-free dye', 120, 2500, 18, '[{"label":"Senior Stylist","price":3500},{"label":"Junior","price":2500}]'),
('sv-003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0001-0000-0000-000000000001',
 'Keratin Treatment', 'Smoothing keratin treatment', 180, 4500, 18, '[]'),
('sv-004-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0001-0000-0000-000000000001',
 'Hair Spa', 'Deep conditioning & steam treatment', 60, 1200, 18, '[]'),
-- Skin
('sv-005-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0002-0000-0000-000000000002',
 'Facial (Classic)', 'Cleansing, toning & moisturizing facial', 60, 1500, 18, '[]'),
('sv-006-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0002-0000-0000-000000000002',
 'Gold Facial', '24K gold infused luxury facial', 75, 2800, 18, '[]'),
('sv-007-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0002-0000-0000-000000000002',
 'Waxing (Full Body)', 'Full body waxing with soothing lotion', 90, 2200, 18, '[]'),
-- Makeup
('sv-008-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0003-0000-0000-000000000003',
 'Party Makeup', 'HD party makeup with setting spray', 90, 3000, 18, '[{"label":"Premium","price":5000},{"label":"Standard","price":3000}]'),
('sv-009-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0003-0000-0000-000000000003',
 'Bridal Makeup (Engagement)', 'Complete engagement day look', 120, 8000, 18, '[]'),
-- Nails
('sv-010-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0004-0000-0000-000000000004',
 'Gel Manicure', 'Gel polish manicure with nail art', 45, 900, 18, '[]'),
('sv-011-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 'sc-0004-0000-0000-000000000004',
 'Acrylic Nails', 'Full set acrylic nail extensions', 90, 2500, 18, '[]');

-- Customers
INSERT INTO customers (id, salon_id, full_name, phone, email, gender, date_of_birth, skin_type, hair_type, notes, total_visits, total_spent, loyalty_points) VALUES
('cu-001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Priya Sharma', '+91-9876501001', 'priya@email.com', 'female', '1992-05-15', 'Combination', 'Wavy', 'Prefers organic products', 12, 18500, 185),
('cu-002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Anjali Verma', '+91-9876501002', 'anjali@email.com', 'female', '1988-11-23', 'Dry', 'Straight', 'Allergy to ammonia dyes', 8, 12000, 120),
('cu-003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sneha Gupta', '+91-9876501003', NULL, 'female', '1995-03-08', 'Oily', 'Curly', '', 5, 7500, 75),
('cu-004-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Meera Patel', '+91-9876501004', 'meera@email.com', 'female', '1990-07-19', 'Normal', 'Wavy', 'VIP customer', 20, 35000, 350),
('cu-005-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Riya Singh', '+91-9876501005', NULL, 'female', '1997-01-30', 'Sensitive', 'Fine', '', 3, 4200, 42);

-- Suppliers
INSERT INTO suppliers (id, salon_id, name, contact_name, phone, email) VALUES
('su-001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'L''Oreal India Pvt Ltd', 'Rajesh Kumar', '+91-9911001001', 'sales@loreal.co.in'),
('su-002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wella India', 'Sunita Joshi', '+91-9911001002', 'wella@distributor.in'),
('su-003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Beauty Hub Wholesale', 'Amit Shah', '+91-9911001003', 'beautyhub@gmail.com');

-- Inventory Products
INSERT INTO inventory_products (id, salon_id, supplier_id, name, sku, category, unit, current_stock, minimum_stock, cost_price, selling_price, expiry_date) VALUES
('ip-001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-001-0000-0000-000000000001', 'L''Oreal Color Excellence (Dark Brown)', 'LOR-CE-DB', 'Hair Color', 'tube', 25, 10, 180, 280, '2025-12-31'),
('ip-002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-001-0000-0000-000000000001', 'L''Oreal Developer 20 Vol', 'LOR-DEV-20', 'Hair Color', 'ml', 2000, 500, 0.5, NULL, '2025-06-30'),
('ip-003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-002-0000-0000-000000000002', 'Wella Koleston Color', 'WEL-KOL-MX', 'Hair Color', 'tube', 8, 10, 220, NULL, '2025-09-15'),
('ip-004-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-003-0000-0000-000000000003', 'Olive Wax (Rica)', 'RIC-OLV-500', 'Waxing', 'gm', 3, 5, 90, NULL, '2025-03-20'),
('ip-005-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-003-0000-0000-000000000003', 'Keratin Treatment Solution', 'KER-SOL-250', 'Hair Treatment', 'ml', 1500, 300, 2.5, NULL, '2026-01-01'),
('ip-006-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-003-0000-0000-000000000003', 'Sanitizer (1L)', 'SAN-1L', 'Hygiene', 'bottle', 4, 5, 120, 180, '2025-12-31'),
('ip-007-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'su-003-0000-0000-000000000003', 'Face Massage Cream', 'FAC-MSG-200', 'Skin', 'gm', 400, 100, 1.5, NULL, '2025-08-01');

-- Membership Plans
INSERT INTO membership_plans (id, salon_id, name, description, price, validity_days, benefits) VALUES
('mp-001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Silver Plan', '3-month membership with 10% off all services', 2999, 90, '[{"type":"discount","value":10,"label":"10% off all services"},{"type":"points_multiplier","value":1.5,"label":"1.5x loyalty points"}]'),
('mp-002-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Gold Plan', '6-month membership with 15% off + free monthly facial', 5999, 180, '[{"type":"discount","value":15,"label":"15% off all services"},{"type":"free_service","service_id":"sv-005-0000-0000-000000000005","label":"1 free facial/month"},{"type":"points_multiplier","value":2,"label":"2x loyalty points"}]'),
('mp-003-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Platinum Plan', 'Annual membership with 20% off + priority booking', 9999, 365, '[{"type":"discount","value":20,"label":"20% off all services"},{"type":"priority_booking","label":"Priority slot booking"},{"type":"free_service","service_id":"sv-006-0000-0000-000000000006","label":"1 free gold facial/month"},{"type":"points_multiplier","value":3,"label":"3x loyalty points"}]');

-- Coupons
INSERT INTO coupons (salon_id, code, description, discount_type, discount_value, min_order_value, valid_until) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 'WELCOME20', 'Welcome discount for new customers', 'percentage', 20, 500, '2025-12-31'),
('a1b2c3d4-0000-0000-0000-000000000001', 'FLAT500', 'Flat ₹500 off on orders above ₹2000', 'fixed', 500, 2000, '2025-09-30'),
('a1b2c3d4-0000-0000-0000-000000000001', 'DIWALI25', 'Diwali special 25% off', 'percentage', 25, 1000, '2025-11-15');

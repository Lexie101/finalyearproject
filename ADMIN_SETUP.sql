-- Create admins table with role distinction (super_admin, admin, driver)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'driver')),
  name TEXT,
  phone TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for email lookup (faster queries)
CREATE INDEX IF NOT EXISTS idx_admins_email_role ON admins(email, role);

-- Insert SUPER ADMIN (has access to manage other admins)
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('jacobmusungwa@gmail.com', 'super_admin', 'Jacob Musungwa - Super Admin', '+260761234567')
ON CONFLICT (email) DO NOTHING;

-- Insert regular admins (can view dashboards, cannot manage users)
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('systems.admin@cavendish.co.zm', 'Admin@Cuz', 'admin', 'Systems Administrator', '+260761234568')
ON CONFLICT (email) DO NOTHING;

-- Insert drivers (can broadcast location, view assigned routes)
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('john.phiri@cavendish.co.zm', 'Driver@123456', 'driver', 'John Phiri', '+260761234569')
ON CONFLICT (email) DO NOTHING;

-- To add more admins, super admin can use the admin panel, or use SQL:
-- INSERT INTO admins (email, password, role, name, phone) VALUES
--   ('new.admin@cavendish.co.zm', 'Admin@123456', 'admin', 'New Admin Name', '+260761234572');



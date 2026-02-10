# Super Admin Setup Guide

## Overview

The system now supports a **Super Admin** role that can manage other admins and drivers. This is perfect for scaling your team across production environments.

### Role Hierarchy

```
Super Admin (highest privileges)
  ├── Can add/remove other admins
  ├── Can add/remove drivers
  ├── Can view all staff
  └── Can access admin dashboard

Admin (regular admin)
  ├── Can view dashboards
  ├── Cannot manage users
  └── Cannot access super admin panel

Driver (read-only)
  ├── Can broadcast location
  ├── Can view assigned routes
  └── Cannot manage anything

Student (lowest)
  └── Can view bus locations only
```

## Setup Instructions

### 1. Create the Admins Table

Run the SQL from `ADMIN_SETUP.sql` in your Supabase dashboard:

```sql
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

CREATE INDEX IF NOT EXISTS idx_admins_email_role ON admins(email, role);

-- Super Admin
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('jacobmusungwa@gmail.com', 'SuperAdmin@123456', 'super_admin', 'Jacob Musungwa - Super Admin', '+260761234567');

-- Regular Admin
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('systems.admin@cavendish.co.zm', 'Admin@123456', 'admin', 'Systems Administrator', '+260761234568');

-- Drivers
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('john.phiri@cavendish.co.zm', 'Driver@123456', 'driver', 'John Phiri', '+260761234569'),
  ('alice.banda@cavendish.co.zm', 'Driver@123456', 'driver', 'Alice Banda', '+260761234570');
```

### 2. Login as Super Admin

1. Go to the login page
2. Select "Admin" role (super admin logs in with admin credentials)
3. **Email:** `jacobmusungwa@gmail.com`
4. **Password:** `SuperAdmin@123456`
5. You'll be redirected to `/super-admin` dashboard

### 3. Super Admin Dashboard Features

Once logged in as super admin, you can:

- **View all staff**: See all admins and drivers with their details
- **Add new admin**: Create new admin accounts
- **Add new driver**: Create new driver accounts
- **Delete staff**: Remove admins or drivers (except your own account)
- **Manage credentials**: Each staff member gets a unique email and password

### 4. Adding New Admins/Drivers

From the Super Admin Dashboard:

1. Click **"Add New"** button
2. Fill in the form:
   - **Email**: Use format `firstname.lastname@cavendish.co.zm` (or any email)
   - **Password**: Strong password (recommend: `FirstName@123456`)
   - **Name**: Full name of the person
   - **Phone**: Contact number (optional)
   - **Role**: Select "Admin" or "Driver"
3. Click **"Create"**
4. New user can now login with their credentials

### 5. Email Format Standards

Follow these conventions for better organization:

**Super Admin Personal:** `jacobmusungwa@gmail.com` or any personal email

**Admins (University):** `firstname.lastname@cavendish.co.zm`
- Example: `systems.admin@cavendish.co.zm`

**Drivers (University):** `firstname.lastname@cavendish.co.zm`
- Example: `john.phiri@cavendish.co.zm`

**Students (University):** `[initials][6-8 digits]@students.cavendish.co.zm`
- Example: `JM123456@students.cavendish.co.zm`

## Test Credentials

| Role | Email | Password | Starting Route |
|------|-------|----------|-----------------|
| Super Admin | `jacobmusungwa@gmail.com` | `SuperAdmin@123456` | `/super-admin` |
| Admin | `systems.admin@cavendish.co.zm` | `Admin@123456` | `/admin` |
| Driver 1 | `john.phiri@cavendish.co.zm` | `Driver@123456` | `/driver` |
| Driver 2 | `alice.banda@cavendish.co.zm` | `Driver@123456` | `/driver` |

## API Endpoints

### Super Admin Management

**POST /api/admin/manage**

#### Create New Admin/Driver
```json
{
  "action": "create",
  "email": "new.admin@cavendish.co.zm",
  "password": "NewPassword@123456",
  "role": "admin",
  "name": "New Admin Name",
  "phone": "+260761234572"
}
```

#### List All Admins/Drivers
```json
{
  "action": "list"
}
```

#### Delete Admin/Driver
```json
{
  "action": "delete",
  "email": "email@example.com"
}
```

*Note: Only super admin can access these endpoints. Regular admins are blocked.*

## Database Schema

### admins Table

```sql
Column          | Type      | Description
----------------|-----------|------------------
id              | UUID      | Unique identifier
email           | TEXT      | Unique email address
password        | TEXT      | Login password (plain for now)
role            | TEXT      | 'super_admin', 'admin', or 'driver'
name            | TEXT      | Full name
phone           | TEXT      | Contact number
created_by      | UUID      | Email of who created this user
created_at      | TIMESTAMP | When created
updated_at      | TIMESTAMP | Last update
```

## Security Notes

### Current Implementation (Development)

⚠️ Passwords are stored in **plain text**. This is fine for development but **MUST NOT** be used in production.

### Production Security Checklist

- [ ] **Hash passwords with bcrypt**
  ```typescript
  import bcrypt from 'bcrypt';
  const hashed = await bcrypt.hash(password, 10);
  ```

- [ ] **Update comparison logic**
  ```typescript
  const isValid = await bcrypt.compare(password, hashedPassword);
  ```

- [ ] **Enable Row Level Security (RLS)** in Supabase
  ```sql
  ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "super_admin_can_manage" ON admins
    FOR ALL USING (auth.uid() = created_by);
  ```

- [ ] **Add password reset flow** - Email-based recovery

- [ ] **Implement 2FA** - Two-factor authentication for super admin

- [ ] **Add audit logging** - Track all admin actions

- [ ] **Use environment secrets** - Store passwords in `.env` for production

- [ ] **Rate limiting** - Prevent brute force attacks

## Scaling for Production

### Multi-Environment Setup

```
Development:   jacobmusungwa@gmail.com (dev version)
Staging:       jacob.dev@cavendish.co.zm
Production:    jacob@cavendish.co.zm
```

### Importing Existing Staff

To bulk import your existing university staff:

```sql
-- Bulk insert from CSV-like data
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('staff.member1@cavendish.co.zm', 'GeneratedPassword1@', 'admin', 'Staff Member 1', '+260761234567'),
  ('staff.member2@cavendish.co.zm', 'GeneratedPassword2@', 'admin', 'Staff Member 2', '+260761234568'),
  -- ... more staff
ON CONFLICT (email) DO NOTHING;
```

## File Changes Made

- `ADMIN_SETUP.sql` - Updated with super_admin support
- `app/api/auth/admin-login/route.ts` - Now supports super_admin role
- `app/api/admin/manage/route.ts` - New endpoint for super admin to manage staff
- `app/super-admin/page.tsx` - Super admin dashboard page
- `components/DashboardSuperAdmin.tsx` - Super admin interface
- `components/AuthProvider.tsx` - Added super_admin role support
- `lib/api.ts` - Added admin management API functions
- `lib/auth.ts` - Updated type definitions

## Next Steps

1. Run the SQL to create tables and super admin account
2. Login as super admin with the test credentials
3. Add your first admin/driver through the dashboard
4. Test other dashboards (admin, driver, student)
5. For production: Implement password hashing
6. Consider migrating to OAuth (Google, Microsoft)

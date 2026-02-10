# Admin Login Setup Guide

## Overview
The admin and driver login system uses email/password authentication instead of OTP (unlike students).

Uses actual Cavendish University email format: `firstname.lastname@cavendish.co.zm`

## Setup Steps

### 1. Create the Admins Table in Supabase

Go to your Supabase dashboard and run the SQL from `ADMIN_SETUP.sql`:

```sql
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email_role ON admins(email, role);

-- Admin users
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('jacob.musungwa@cavendish.co.zm', 'Admin@123456', 'admin', 'Jacob Musungwa', '+260761234567'),
  ('systems.admin@cavendish.co.zm', 'Admin@123456', 'admin', 'Systems Administrator', '+260761234568');

-- Driver users
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('john.phiri@cavendish.co.zm', 'Driver@123456', 'driver', 'John Phiri', '+260761234569'),
  ('alice.banda@cavendish.co.zm', 'Driver@123456', 'driver', 'Alice Banda', '+260761234570'),
  ('martin.chansa@cavendish.co.zm', 'Driver@123456', 'driver', 'Martin Chansa', '+260761234571');
```

### 2. Test Login Credentials

After running the SQL, you can login with any of these:

**Admin Accounts:**
- Email: `jacob.musungwa@cavendish.co.zm` | Password: `Admin@123456`
- Email: `systems.admin@cavendish.co.zm` | Password: `Admin@123456`

**Driver Accounts:**
- Email: `john.phiri@cavendish.co.zm` | Password: `Driver@123456`
- Email: `alice.banda@cavendish.co.zm` | Password: `Driver@123456`
- Email: `martin.chansa@cavendish.co.zm` | Password: `Driver@123456`

### 3. How It Works

1. Admin/Driver selects their role on the login page
2. Enters email (`firstname.lastname@cavendish.co.zm`) and password
3. Frontend calls `/api/auth/admin-login` with credentials
4. Backend queries the `admins` table and validates
5. On success, user is logged in and redirected to their dashboard

### 4. Add More Admin/Driver Users

In Supabase SQL editor, follow the Cavendish email format:

```sql
-- Add a new driver
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('new.driver@cavendish.co.zm', 'Driver@123456', 'driver', 'New Driver Name', '+260761234572');

-- Add a new admin
INSERT INTO admins (email, password, role, name, phone) VALUES
  ('new.admin@cavendish.co.zm', 'Admin@123456', 'admin', 'New Admin Name', '+260761234573');
```

### 5. Email Format Standards

- **Admins**: `firstname.lastname@cavendish.co.zm`
- **Drivers**: `firstname.lastname@cavendish.co.zm`
- **Students**: `[2-3 initials][6-8 digits]@students.cavendish.co.zm`

Example patterns:
- Admin: `jacob.musungwa@cavendish.co.zm`
- Driver: `john.phiri@cavendish.co.zm`
- Student: `JM123456@students.cavendish.co.zm`

### 6. Production Security Notes

⚠️ **Important:** The current setup stores passwords in **plain text**. For production:

1. **Hash passwords with bcrypt** before storing:
   ```typescript
   import bcrypt from 'bcrypt';
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **Update the login API** to compare hashed passwords:
   ```typescript
   const isValid = await bcrypt.compare(password, data.password);
   ```

3. **Enable Row Level Security (RLS)** in Supabase to restrict table access

4. **Use strong password policies**

5. **Consider OAuth** (Google, Microsoft) for enterprise use

## API Endpoint

### POST /api/auth/admin-login

**Request:**
```json
{
  "email": "john.phiri@cavendish.co.zm",
  "password": "Driver@123456",
  "role": "driver"
}
```

**Success Response (200):**
```json
{
  "message": "driver login successful",
  "verified": true,
  "user": {
    "email": "john.phiri@cavendish.co.zm",
    "role": "driver",
    "name": "John Phiri"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

## Database Schema

```sql
admins table:
- id (UUID, Primary Key)
- email (TEXT, Unique)
- password (TEXT) -- Store hashed in production
- role (TEXT) -- admin or driver
- name (TEXT) -- Full name
- phone (TEXT) -- Contact number
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## File Changes Made

- `app/api/auth/admin-login/route.ts` - API endpoint for admin/driver login
- `lib/api.ts` - Added `adminLogin()` function
- `components/AuthPanel.tsx` - Updated to use admin login API
- `ADMIN_SETUP.sql` - SQL script with realistic Cavendish emails
- `ADMIN_LOGIN_SETUP.md` - This setup guide

## Scaling for Production

To scale this system:

1. **Import existing staff/driver list** - Use Cavendish's HR database
2. **Implement password hashing** - Use bcrypt with salt rounds
3. **Add password reset** - Email-based recovery flow
4. **Implement 2FA** - Two-factor authentication for admins
5. **Add audit logs** - Track all admin/driver logins
6. **Enable RLS policies** - Restrict data access by role
7. **Use environment-specific passwords** - Different for dev/staging/prod

## Next Steps

1. Run the SQL to create the admins table with sample data
2. Test login with the provided credentials
3. Explore the admin/driver dashboards
4. Update emails/passwords as needed
5. Implement password hashing for production


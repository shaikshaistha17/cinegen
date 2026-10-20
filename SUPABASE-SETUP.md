# 🚀 Supabase Setup Complete!

## ✅ Configuration Done

Your `.env.local` file has been updated with your Supabase credentials:
- Project URL: https://hoiqipfguwpdihgfrqyy.supabase.co
- Anon Key: Configured ✓
- Service Key: Configured ✓

---

## 📊 NEXT STEP: Set Up Database

You need to run the database schema in Supabase. Here's how:

### **Step 1: Go to SQL Editor**
1. Go to your Supabase project: https://supabase.com/dashboard/project/hoiqipfguwpdihgfrqyy
2. In the left sidebar, click **"SQL Editor"** (looks like </> icon)

### **Step 2: Create New Query**
1. Click **"New query"** button (top right)

### **Step 3: Copy & Paste Schema**
1. Open the file: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/schema.sql`
2. Copy ALL the contents (Cmd+A, Cmd+C)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** button (or press Cmd+Enter)

### **Step 4: Wait for Success**
You should see: `Success. No rows returned`

---

## 🎯 Alternative: Quick Copy-Paste

**I'll give you the schema in smaller chunks. Copy each one and run in SQL Editor:**

### **Chunk 1: Users & Profiles Tables**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'creator', 'guest')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Creator Profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  location VARCHAR(255),
  hourly_rate_usd INTEGER NOT NULL,
  availability VARCHAR(20) NOT NULL,
  specializations TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  verified_tools JSONB NOT NULL DEFAULT '[]',
  languages TEXT[] NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  verification JSONB NOT NULL DEFAULT '{}',
  portfolio JSONB NOT NULL DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Profiles
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website TEXT,
  industry VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Run this first, then continue...**

---

## ⚡ FASTER METHOD: Use the Full Schema File

**Best approach:**
1. Open `database/schema.sql` in VS Code
2. Copy EVERYTHING (Cmd+A, Cmd+C)
3. Paste in Supabase SQL Editor
4. Click Run

This will create all 8 tables:
- users
- creator_profiles
- brand_profiles
- briefs
- proposals
- messages
- reviews
- verifications

---

## ✅ After Database Setup

Once you've run the schema:

1. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Test registration:**
   - Go to: http://localhost:3002/register
   - Register with your email: shaik.shaisthat7@gmail.com
   - Password: Any strong password
   - This will now work with REAL Supabase!

3. **Check Supabase Dashboard:**
   - Go to: Table Editor in Supabase
   - You should see your new user in the `users` table

---

## 🎉 What This Enables

✅ **Real email registration** - Any email works now
✅ **Email verification** - Supabase sends verification emails (if enabled)
✅ **Password reset** - Real password reset emails
✅ **Persistent data** - Data saved in Supabase, not browser
✅ **Multi-device login** - Login from any device

---

## 📧 Optional: Configure Email Settings

To enable email verification:

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Enable **"Confirm signup"**
3. Customize templates (optional)

For now, you can disable email confirmation to test faster:
1. Authentication → **Settings**
2. Toggle OFF: **"Enable email confirmations"**

---

## 🐛 Troubleshooting

**If you get errors:**
- Make sure you copied the FULL schema.sql file
- Run each section separately if needed
- Check for syntax errors in SQL Editor

**Database already exists:**
- If tables already exist, Supabase will skip them (that's fine!)

---

## ✅ Checklist

- [ ] Copied schema.sql to SQL Editor
- [ ] Ran the SQL (clicked "Run")
- [ ] Saw "Success" message
- [ ] Checked Table Editor - saw new tables
- [ ] Restarted dev server
- [ ] Tested registration with real email

---

**Let me know when you've run the SQL schema and I'll help test everything!** 🚀

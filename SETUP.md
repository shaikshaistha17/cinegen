# CineGen Supabase Setup Guide

This guide walks you through setting up Supabase for the CineGen AI Creator Marketplace.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Git repository cloned locally

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `cinegen` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your target users
   - **Pricing Plan**: Free tier is sufficient for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find these three values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (under "Service role" section - keep this secret!)

## Step 3: Configure Environment Variables

1. In your project root, create `.env.local` file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **Important**: Never commit `.env.local` to git. It should already be in `.gitignore`.

## Step 4: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open `database/schema.sql` from your project
4. Copy the entire contents and paste into SQL Editor
5. Click **"Run"** or press `Ctrl/Cmd + Enter`
6. Wait for success message: "Success. No rows returned"

## Step 5: Apply Row Level Security Policies

1. Still in **SQL Editor**, create another new query
2. Open `database/rls-policies.sql` from your project
3. Copy and paste the entire contents
4. Click **"Run"**
5. Verify success message appears

## Step 6: Create Storage Buckets

### Option A: Via Dashboard (Recommended)

1. Go to **Storage** in Supabase dashboard
2. Click **"New bucket"**

**Create "avatars" bucket:**
- Name: `avatars`
- Public: **Yes** ✓
- File size limit: `2 MB`
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

3. Click **"Create bucket"**

**Create "portfolios" bucket:**
- Name: `portfolios`
- Public: **Yes** ✓
- File size limit: `10 MB`
- Allowed MIME types: `image/*, video/mp4, video/webm`

4. Click **"Create bucket"**

5. Go back to **SQL Editor** and run `database/storage-buckets.sql` to apply storage policies

### Option B: Via SQL (Alternative)

1. Create buckets manually, then run `database/storage-buckets.sql` in SQL Editor

## Step 7: Install Dependencies

```bash
npm install
```

This will install:
- `tsx` - TypeScript execution for scripts
- `bcryptjs` - Password hashing
- `@types/bcryptjs` - TypeScript types

## Step 8: Seed the Database

Run the seeding script to populate initial data:

```bash
npm run db:seed
```

This will create:
- 18 creator profiles with complete portfolios
- 1 brand account (Nexus Brands)
- 4 sample briefs
- All users have password: `Demo@123`

Expected output:
```
🌱 Starting database seed...
📝 Seeding creator profiles...
✓ Created creator: @aryanvisuals
✓ Created creator: @priyamotion
...
✅ Database seeding complete!
```

## Step 9: Verify Data

1. Go to **Table Editor** in Supabase dashboard
2. Check these tables have data:
   - `users` - should have 19 rows (18 creators + 1 brand)
   - `creator_profiles` - should have 18 rows
   - `brand_profiles` - should have 1 row
   - `briefs` - should have 4 rows

## Step 10: Test the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Login Credentials

**Creator accounts** (any of these):
- Email: `aryan@example.com` / Password: `Demo@123`
- Email: `priya@example.com` / Password: `Demo@123`
- Email: `rahul@example.com` / Password: `Demo@123`
- _(See `lib/seed/creators.ts` for all 18 creator emails)_

**Brand account:**
- Email: `arjun@nexusbrands.com` / Password: `Demo@123`

## Troubleshooting

### Error: "relation does not exist"

**Cause**: Database schema not applied

**Fix**: Re-run `database/schema.sql` in SQL Editor

---

### Error: "permission denied for table"

**Cause**: RLS policies not applied correctly

**Fix**: 
1. Re-run `database/rls-policies.sql`
2. Verify you're using the correct API keys
3. Check that service role key is set for seeding

---

### Error: "Failed to create creator: duplicate key value"

**Cause**: Data already exists in database

**Fix**: 
1. Clear existing data via Table Editor
2. Or modify `lib/supabase-admin.ts` to handle duplicates
3. Or reset database:

```bash
# Drop all tables in SQL Editor:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Then re-run schema.sql and rls-policies.sql
```

---

### Error: "Invalid API key"

**Cause**: Incorrect or missing environment variables

**Fix**:
1. Double-check `.env.local` has correct keys
2. Restart dev server after changing env vars: `npm run dev`
3. Verify keys don't have extra spaces or quotes

---

### Seeding succeeds but no data visible

**Cause**: Using wrong Supabase project or viewing wrong table

**Fix**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` matches the project you're viewing
2. Check Table Editor in correct project
3. Run this query in SQL Editor to count rows:

```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM creator_profiles) as creators_count,
  (SELECT COUNT(*) FROM briefs) as briefs_count;
```

---

### Storage bucket policies failing

**Cause**: Buckets not created or auth.uid() not available

**Fix**:
1. Create buckets first via Dashboard
2. Then apply storage policies via SQL
3. Ensure buckets are named exactly `avatars` and `portfolios`

---

## Database Reset (Dangerous!)

To completely reset the database and reseed:

```bash
# 1. In Supabase SQL Editor, drop and recreate schema:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# 2. Re-run setup:
# - Run database/schema.sql
# - Run database/rls-policies.sql
# - Recreate storage buckets
# - Run database/storage-buckets.sql
# - Run: npm run db:seed
```

## Production Deployment

When deploying to production (Vercel, Render, etc.):

1. Add the same environment variables to your deployment platform
2. Use the same Supabase project or create a separate production project
3. **Never commit** `.env.local` or expose service role key
4. Consider using different passwords for production seed data
5. Set up proper authentication flow (not localStorage-based)

## Next Steps

- Implement proper authentication (replace localStorage with Supabase Auth)
- Add email verification for new users
- Implement file upload to Storage buckets
- Add real-time subscriptions for messages
- Set up database backups

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [CineGen GitHub Issues](https://github.com/your-repo/issues)

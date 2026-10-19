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

## Password Reset Flow

CineGen includes a complete password reset flow using Supabase Auth.

### How It Works

1. User clicks "Forgot password?" on the login page
2. Enters their email address
3. Supabase sends a magic link to their email (1-hour expiry)
4. User clicks the link, which redirects to `/auth/reset-password`
5. User enters a new password (validated: 8+ chars, 1 uppercase, 1 number)
6. Password is updated in Supabase Auth and the users table
7. User is redirected to login with their new password

### Supabase Email Configuration

For password reset to work in production, you must configure Supabase email:

1. Go to **Authentication** → **Email Templates** in Supabase dashboard
2. Find **"Reset Password"** template
3. Ensure the redirect URL contains: `{{ .SiteURL }}/auth/reset-password`
4. Go to **Authentication** → **URL Configuration**
5. Add your production URL to **Redirect URLs**: `https://your-app.com/auth/reset-password`
6. For local development, add: `http://localhost:3000/auth/reset-password`

### Environment Variable

Ensure your `.env.local` includes:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production, set this to your actual domain (e.g., `https://cinegen.com`).

### Testing Locally

#### With Email (Recommended)
1. Configure SMTP in Supabase dashboard (or use Supabase's test email service)
2. Go to `/login` → click "Forgot password?"
3. Enter any valid user email (e.g., `aryan@example.com`)
4. Check your email for the reset link
5. Click the link and set a new password

#### Without Email (Development)
1. In Supabase dashboard, go to **Authentication** → **Users**
2. Find the user you want to test with
3. Copy their User UID
4. In browser, navigate to: `http://localhost:3000/auth/reset-password#access_token=...`
   (The token is automatically set when clicking the email link)

### Demo Accounts
Demo accounts (with `@cinegen.demo` emails) cannot use password reset. The system shows an error message: "Password reset not available for demo accounts. Demo password is always Demo@123"

### Password Requirements

**Note**: Password reset enforces stricter requirements than registration:

- **Registration**: Requires minimum 6 characters (no complexity requirements)
- **Password Reset**: Requires 8+ characters, 1 uppercase letter, and 1 number

This is intentional to encourage users to upgrade to stronger passwords when resetting. If you want consistent validation:
1. Update `app/register/page.tsx` to match reset requirements, OR
2. Relax `app/auth/reset-password/page.tsx` and `app/api/auth/reset-password/route.ts` validation to match registration

The current design prioritizes security by requiring stronger passwords during the security-sensitive reset flow.

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

## Email Configuration

CineGen includes professional branded email templates for transactional emails.

### Available Email Templates

| Template | Purpose | Key Variables |
|----------|---------|---------------|
| **password-reset.html** | Password reset flow | `{{RESET_LINK}}` |
| **welcome-brand.html** | Brand account onboarding | `{{USER_NAME}}`, `{{CTA_LINK}}` |
| **welcome-creator.html** | Creator account onboarding | `{{USER_NAME}}`, `{{CTA_LINK}}` |
| **otp-verification.html** | Email/phone verification | `{{OTP_CODE}}` |
| **proposal-received.html** | Brand notification for new proposals | `{{CREATOR_NAME}}`, `{{BRIEF_TITLE}}`, `{{PROPOSAL_LINK}}` |
| **brief-match.html** | Creator notification for matched briefs | `{{BRIEF_TITLE}}`, `{{MATCH_SCORE}}`, `{{BRIEF_LINK}}`, `{{BRAND_NAME}}` |

### Preview Email Templates

To preview all email templates locally:

```bash
npm run dev
```

Navigate to: [http://localhost:3000/api/test-emails](http://localhost:3000/api/test-emails)

This shows all 6 templates with sample data. You can copy HTML or view plain text versions.

⚠️ **Important**: Remove the `/app/api/test-emails` route before production deployment.

### Customizing Email Templates

Email templates are stored in `/emails/` directory. To customize:

1. Open the HTML file you want to edit (e.g., `/emails/welcome-brand.html`)
2. Modify colors, text, or layout (all CSS is inline for email client compatibility)
3. Use `{{VARIABLE_NAME}}` syntax for dynamic content
4. Test changes by viewing `/api/test-emails`

**Design Guidelines:**
- All CSS must be inline styles (Outlook compatibility)
- Use table-based layouts (no flexbox or grid in emails)
- Keep width under 600px for mobile
- Use web-safe fonts: Arial, Helvetica, sans-serif
- Brand colors: `#7c3aed` (violet), `#06b6d4` (cyan), `#4f46e5` (indigo)

### Integrating with Email Service

CineGen templates are currently generated in `/lib/email-templates.ts` but not sent automatically. To integrate with an email service:

#### Option 1: Resend (Recommended for Next.js)

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key
3. Add to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@cinegen.ai
```

4. Install Resend SDK:

```bash
npm install resend
```

5. Create `/lib/email-sender.ts`:

```typescript
import { Resend } from 'resend';
import { EmailTemplate } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'CineGen <onboarding@resend.dev>',
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    console.log(`✅ Email sent to ${to}: ${template.subject}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}
```

6. Use in your API routes:

```typescript
import { generateWelcomeEmail } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email-sender';

// After user registration:
const emailTemplate = generateWelcomeEmail(userName, 'creator');
await sendEmail(userEmail, emailTemplate);
```

#### Option 2: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com) (free tier: 100 emails/day)
2. Create API key with "Mail Send" permissions
3. Add to `.env.local`:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@cinegen.ai
```

4. Install SendGrid SDK:

```bash
npm install @sendgrid/mail
```

5. Create `/lib/email-sender.ts`:

```typescript
import sgMail from '@sendgrid/mail';
import { EmailTemplate } from './email-templates';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<void> {
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cinegen.ai',
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    console.log(`✅ Email sent to ${to}: ${template.subject}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}
```

#### Option 3: Supabase SMTP (Custom SMTP)

1. Go to **Authentication** → **Email Templates** in Supabase dashboard
2. Click **"SMTP Settings"** at the bottom
3. Enter your SMTP provider details (Gmail, AWS SES, etc.)
4. Override email templates with CineGen branded versions
5. Use `supabase.auth.resetPasswordForEmail()` for password resets (auto-sends)

**Note**: Supabase Auth handles password reset emails automatically. For custom emails (welcome, proposals, matches), use Resend or SendGrid.

### Using Email Templates in Code

Import and use the template generators from `/lib/email-templates.ts`:

```typescript
import {
  generatePasswordResetEmail,
  generateWelcomeEmail,
  generateOTPEmail,
  generateProposalNotification,
  generateBriefMatchEmail,
} from '@/lib/email-templates';

// Example: Send welcome email
const template = generateWelcomeEmail('Arjun Mehta', 'brand');
await sendEmail('arjun@example.com', template);

// Example: Send OTP verification
const otpTemplate = generateOTPEmail('123456', 'user@example.com');
await sendEmail('user@example.com', otpTemplate);

// Example: Notify brand of new proposal
const proposalTemplate = generateProposalNotification(
  'Maya Patel',
  'Summer Campaign 2025',
  'https://cinegen.ai/proposals/abc123'
);
await sendEmail('brand@company.com', proposalTemplate);
```

### Production Checklist

Before deploying to production:

- [ ] Remove or protect `/api/test-emails` route (add auth middleware)
- [ ] Set up email service (Resend/SendGrid) with production API keys
- [ ] Verify DNS records for custom domain email sending
- [ ] Test all email templates with real email addresses
- [ ] Configure Supabase Auth email templates with production URLs
- [ ] Add unsubscribe functionality to footer links
- [ ] Set up email analytics/tracking (optional)
- [ ] Comply with email regulations (CAN-SPAM, GDPR)

### Troubleshooting Emails

**Templates not rendering correctly:**
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Validate HTML at [Email on Acid](https://www.emailonacid.com/) or [Litmus](https://www.litmus.com/)
- Ensure all CSS is inline (no external stylesheets)

**Variables not being replaced:**
- Check variable names match exactly (case-sensitive)
- Verify you're calling the right template generator function
- Use browser console to inspect generated HTML

**Emails going to spam:**
- Set up SPF, DKIM, and DMARC records for your domain
- Use a reputable email service (Resend/SendGrid)
- Avoid spam trigger words in subject lines
- Include unsubscribe link in footer

## Next Steps

- Implement proper authentication (replace localStorage with Supabase Auth)
- Add email verification for new users
- Implement file upload to Storage buckets
- Add real-time subscriptions for messages
- Set up database backups
- Integrate email templates with Resend or SendGrid

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [CineGen GitHub Issues](https://github.com/your-repo/issues)

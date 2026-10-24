# CineGen Docker Deployment Guide

## 🐳 Quick Start with Docker

This guide will help you deploy CineGen using Docker with all the new Kampus.VC features (notifications, payments, emails).

---

## 📋 Prerequisites

1. **Docker Desktop** installed
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Supabase Project** configured
   - Database migrations applied (010, 011, 012, 013, 016)
   - Get your credentials from: https://supabase.com/dashboard

3. **API Keys** (optional but recommended)
   - Stripe test keys: https://dashboard.stripe.com/test/apikeys
   - Resend email API: https://resend.com/api-keys

---

## 🚀 Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/shaikshaistha17/cinegen.git
cd cinegen

# Copy environment template
cp .env.example .env.local
```

---

## ⚙️ Step 2: Configure Environment Variables

Edit `.env.local` with your actual values:

```bash
# ============================================================================
# REQUIRED: Supabase Configuration
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key

# ============================================================================
# REQUIRED: Gemini API (for AI Director)
# ============================================================================
GEMINI_API_KEY=AIzaSy...your-gemini-key

# ============================================================================
# OPTIONAL: Stripe Payment Integration
# ============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================================================
# OPTIONAL: Email Notifications (Resend)
# ============================================================================
RESEND_API_KEY=re_...

# ============================================================================
# Base URL Configuration
# ============================================================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 🗄️ Step 3: Apply Database Migrations

Open your Supabase SQL Editor and run these migrations in order:

1. **010_notifications_system.sql** - Notification table
2. **011_payment_system.sql** - Payment tracking
3. **012_email_preferences.sql** - Email settings
4. **013_otp_storage.sql** - OTP persistence
5. **016_fix_users_rls_infinite_recursion.sql** - Security fix

All migration files are in: `database/migrations/`

---

## 🐳 Step 4: Build and Run with Docker

### Option A: Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

Your app will be available at: **http://localhost:3000**

### Option B: Using Docker CLI

```bash
# Build the image
docker build -t cinegen:latest .

# Run the container
docker run -d \
  --name cinegen-app \
  -p 3000:3000 \
  --env-file .env.local \
  cinegen:latest

# View logs
docker logs -f cinegen-app

# Stop the container
docker stop cinegen-app
docker rm cinegen-app
```

---

## ✅ Step 5: Verify Deployment

### Check Health Endpoint
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-10-24T...",
  "database": "connected",
  "version": "1.0.0"
}
```

### Check Notifications
1. Open http://localhost:3000
2. Login as demo brand: `brand@cinegen.demo` / `Demo@123`
3. Look for **bell icon** in navbar (top right)
4. Click it to see notification dropdown

### Check Payment Flow
1. Accept a proposal to create an agreement
2. Navigate to project page
3. Click **"Pay Milestone"** button
4. Payment form should load with Stripe Elements

---

## 🔧 Troubleshooting

### Container won't start
```bash
# Check container logs
docker-compose logs cinegen

# Common issues:
# - Missing .env.local file
# - Invalid Supabase URL
# - Port 3000 already in use
```

### Database connection fails
```bash
# Verify Supabase credentials
curl https://your-project-id.supabase.co/rest/v1/

# Check migrations applied
# Go to Supabase > Table Editor
# Verify these tables exist:
# - notifications
# - payment_intents
# - otp_verifications
```

### Payments not working
```bash
# Check if Stripe keys are set
docker exec cinegen-app printenv | grep STRIPE

# Demo mode will activate if keys are missing
# Look for "Demo Mode" message in payment UI
```

### Emails not sending
```bash
# Check if Resend key is set
docker exec cinegen-app printenv | grep RESEND

# App works without emails (just notifications won't send)
# Check server logs for email errors
```

---

## 🔄 Updating the Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild the Docker image
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or with Docker CLI
docker stop cinegen-app
docker rm cinegen-app
docker build -t cinegen:latest .
docker run -d --name cinegen-app -p 3000:3000 --env-file .env.local cinegen:latest
```

---

## 🌐 Production Deployment

### Deploy to Railway

1. **Push to GitHub** (already done ✅)

2. **Create Railway Project:**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select `shaikshaistha17/cinegen`
   - Railway will auto-detect Next.js

3. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   GEMINI_API_KEY=...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
   STRIPE_SECRET_KEY=...
   STRIPE_WEBHOOK_SECRET=...
   RESEND_API_KEY=...
   NEXT_PUBLIC_BASE_URL=https://your-app.up.railway.app
   ```

4. **Deploy:**
   - Railway will build using Dockerfile automatically
   - Get your deployment URL
   - Update `NEXT_PUBLIC_BASE_URL` with the Railway URL

5. **Configure Stripe Webhook:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-app.up.railway.app/api/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret and update `STRIPE_WEBHOOK_SECRET`

---

## 📊 Monitoring

### View Container Logs
```bash
# Follow logs in real-time
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service only
docker-compose logs -f cinegen
```

### Container Stats
```bash
# CPU and memory usage
docker stats cinegen-app

# Container info
docker inspect cinegen-app
```

### Health Check Status
```bash
# Check health endpoint
watch -n 5 'curl -s http://localhost:3000/api/health | jq'
```

---

## 🔒 Security Checklist

- [ ] Database migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to client
- [ ] Stripe keys in test mode (not live)
- [ ] `.env.local` not committed to Git
- [ ] Webhook signature verification enabled
- [ ] HTTPS enabled in production
- [ ] Rate limiting active (3 OTP/hour, 5 payments/hour)

---

## 📚 Additional Resources

- **Documentation:** See `KAMPUS_INTEGRATION_SUMMARY.md` for feature details
- **Email Setup:** See `EMAIL_SETUP.md` for email configuration
- **Security:** See `docs/SECURITY.md` for security best practices
- **Migrations:** See `database/migrations/` for all SQL files

---

## 🆘 Need Help?

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Change port in `docker-compose.yml` to `"3001:3000"` |
| Build fails | Run `docker-compose build --no-cache` |
| Database connection timeout | Check Supabase URL and anon key |
| Stripe webhook not receiving | Use ngrok or Railway for public URL |
| Migrations not applied | Run SQL files in Supabase SQL Editor |

**GitHub Issues:** https://github.com/shaikshaistha17/cinegen/issues

---

## ✅ Success Checklist

After deployment, verify:

- [ ] App loads at http://localhost:3000
- [ ] Login works
- [ ] Director chat responds
- [ ] Notification bell appears in navbar
- [ ] Payment form loads (even in demo mode)
- [ ] Email preferences page accessible at /settings/email
- [ ] Health endpoint returns 200 OK
- [ ] No errors in docker logs

---

**Last Updated:** October 24, 2024  
**Docker Support:** Added in commit `b1c5539`

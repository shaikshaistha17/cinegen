# 🚀 Deploy CineGen to Render - Quick Start

## ✅ Prerequisites (Already Done!)

- ✅ Docker image built and tested locally
- ✅ Code pushed to GitHub: https://github.com/shaikshaistha17/cinegen
- ✅ Dockerfile configured with build args
- ✅ render.yaml configuration file created

---

## 🎯 Deploy in 5 Minutes

### Step 1: Create Render Account (1 minute)

1. Go to **https://render.com**
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest method)
4. Authorize Render to access your repos

### Step 2: Create Web Service (2 minutes)

1. In Render Dashboard, click **"New +"** (top right)
2. Select **"Web Service"**
3. Connect repository: **`shaikshaistha17/cinegen`**
4. Click **"Connect"**

Render will detect `render.yaml` and auto-configure!

### Step 3: Add Environment Variables (2 minutes)

**Click "Advanced" and add these variables:**

#### REQUIRED (App won't work without these):

```bash
# Get these from your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://hoiqipfguwpdihgfrqyy.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy-from-your-env-local>

SUPABASE_SERVICE_ROLE_KEY=<copy-from-your-env-local>

GEMINI_API_KEY=<copy-from-your-env-local>

NEXT_PUBLIC_BASE_URL=https://cinegen.onrender.com
(⚠️ Update this after deployment with your actual URL)
```

#### OPTIONAL (for full features):

```bash
# For Stripe Payments (leave empty if not using)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# For Email Notifications (leave empty if not using)
RESEND_API_KEY=re_your_key
```

### Step 4: Add Docker Build Args

Still in "Advanced", add **Docker Build Arguments:**

```bash
# Copy these from your .env.local file
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>

NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

GEMINI_API_KEY=<your-gemini-key>
```

⚠️ **Why both?** Environment variables are for runtime, build args are for Next.js build process.

### Step 5: Deploy! (5-10 minutes)

1. Click **"Create Web Service"**
2. Wait for build to complete (~5-10 minutes first time)
3. Watch the build logs
4. ✅ Success! Your app is live!

Your app will be available at:
```
https://cinegen-xxxx.onrender.com
```

### Step 6: Update Base URL

1. Copy your Render URL
2. Go to **Environment** tab in Render
3. Update `NEXT_PUBLIC_BASE_URL` with your actual URL
4. Click **"Save Changes"** (triggers redeploy)

---

## ✅ Verify Deployment

Visit your Render URL and test:

- [ ] Landing page loads
- [ ] Login works (`brand@cinegen.demo` / `Demo@123`)
- [ ] Bell icon appears (notifications)
- [ ] Director chat responds
- [ ] Create brief works
- [ ] Health check: `https://your-url.onrender.com/api/health`

---

## 🔧 Post-Deployment

### If Using Stripe Payments:

1. Go to **Stripe Dashboard** → Webhooks
2. Add endpoint: `https://your-app.onrender.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret
5. Update `STRIPE_WEBHOOK_SECRET` in Render
6. Save (triggers redeploy)

### Update Supabase URLs:

1. Go to **Supabase** → Authentication → URL Configuration
2. Add Site URL: `https://your-app.onrender.com`
3. Add Redirect URL: `https://your-app.onrender.com/auth/callback`

---

## 🔄 Auto-Deploy

Every time you push to GitHub `main` branch, Render automatically:
1. Pulls latest code
2. Builds new Docker image
3. Deploys updated container
4. Zero downtime!

```bash
git add .
git commit -m "your changes"
git push origin main
# Render deploys automatically!
```

---

## 💰 Pricing

**Free Tier:**
- 750 hours/month free
- Sleeps after 15 min inactivity
- Wakes up on first request (~30 sec)

**Starter ($7/month):**
- Always-on (no sleep)
- Faster performance
- Custom domains

---

## 🐛 Troubleshooting

### Build Fails?

Check Render logs for errors. Common issues:
- Missing environment variables
- Wrong build args
- Database connection issues

**Solution:** Verify all env vars and build args are set correctly

### App Crashes?

Check logs in Render Dashboard. Common issues:
- Database migrations not applied
- Wrong Supabase credentials
- Missing required env vars

**Solution:** Apply migrations in Supabase dashboard (see `database/migrations/`)

### Slow Loading?

Free tier sleeps after 15 min inactivity.

**Solutions:**
- Upgrade to Starter plan ($7/mo)
- Or use cron-job.org to ping every 10 min
- Or accept 30 sec cold start

---

## 📚 Full Documentation

For detailed information, see:
- **RENDER_DEPLOYMENT_GUIDE.md** - Comprehensive guide
- **DOCKER_DEPLOYMENT_GUIDE.md** - Local Docker setup
- **DEPLOYMENT_COMPLETE.md** - Feature summary

---

## 🆘 Need Help?

**Render Issues:**
- Render Docs: https://render.com/docs/docker
- Render Community: https://community.render.com

**CineGen Issues:**
- GitHub: https://github.com/shaikshaistha17/cinegen/issues

---

## ✨ You're Ready!

Your CineGen app with:
- ✅ Real-time Notifications
- ✅ Stripe Payments (test mode)
- ✅ Email System
- ✅ Gemini Director
- ✅ Decision Room
- ✅ Complete Marketplace

**Is ready to deploy to Render!** 🚀

**Start here:** https://render.com

---

**Last Updated:** October 24, 2024  
**Status:** ✅ Ready for Production Deployment

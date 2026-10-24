# 🚀 CineGen - Render Deployment Guide (Docker)

## Overview

This guide will help you deploy your CineGen app to Render using Docker. Render will automatically build your Docker image from GitHub and deploy it.

---

## 📋 Prerequisites

1. ✅ **Docker image built locally** (already done!)
2. ✅ **Code pushed to GitHub** (already done!)
3. ⏳ **Render account** (we'll create this)
4. ✅ **Supabase database** with migrations applied

---

## 🎯 Step-by-Step Deployment

### Step 1: Create Render Account

1. Go to **https://render.com**
2. Click **"Sign Up"**
3. Choose **"Sign up with GitHub"** (recommended)
4. Authorize Render to access your GitHub account

### Step 2: Connect GitHub Repository

1. In Render Dashboard, click **"New +"**
2. Select **"Web Service"**
3. Click **"Connect GitHub"**
4. Find and select **`shaikshaistha17/cinegen`**
5. Click **"Connect"**

### Step 3: Configure Web Service

Fill in the following settings:

**Basic Settings:**
- **Name:** `cinegen` (or any name you prefer)
- **Region:** Choose closest to you (e.g., Oregon, Frankfurt)
- **Branch:** `main`
- **Root Directory:** Leave empty
- **Runtime:** Docker
- **Instance Type:** Free (or Starter for better performance)

**Docker Settings:**
- **Dockerfile Path:** `./Dockerfile`
- **Docker Build Context Directory:** Leave empty (uses root)

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these **REQUIRED** variables:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://hoiqipfguwpdihgfrqyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Gemini API (REQUIRED)
GEMINI_API_KEY=your-gemini-api-key-here

# Base URL (REQUIRED - will be provided after deployment)
NEXT_PUBLIC_BASE_URL=https://cinegen.onrender.com

# Node Environment
NODE_ENV=production
```

Add these **OPTIONAL** variables (for full features):

```bash
# Stripe (Optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Resend (Optional - for emails)
RESEND_API_KEY=re_your_key_here
```

### Step 5: Configure Build Arguments

Still in **"Advanced"** section, add **Docker Build Args**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://hoiqipfguwpdihgfrqyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

⚠️ **Important:** Build args are needed for the Next.js build process during Docker image creation.

### Step 6: Deploy

1. Scroll down and click **"Create Web Service"**
2. Render will automatically:
   - Clone your GitHub repository
   - Build the Docker image using your Dockerfile
   - Deploy the container
   - Provide you with a public URL

**Deployment takes 5-10 minutes** for first build.

### Step 7: Get Your Deployment URL

Once deployed, Render provides a URL like:
```
https://cinegen.onrender.com
```

**Update Environment Variable:**
1. Go to **Environment** tab
2. Update `NEXT_PUBLIC_BASE_URL` with your actual Render URL
3. Click **"Save Changes"**
4. Render will redeploy automatically

---

## 🔧 Post-Deployment Configuration

### Configure Stripe Webhooks (if using payments)

1. Go to **Stripe Dashboard** → Webhooks
2. Click **"Add Endpoint"**
3. **Endpoint URL:** `https://your-app.onrender.com/api/stripe/webhook`
4. **Events to send:** 
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing Secret**
6. In Render, update `STRIPE_WEBHOOK_SECRET` environment variable
7. Save and redeploy

### Update Supabase Allowed URLs (for OAuth)

1. Go to **Supabase Dashboard** → Authentication → URL Configuration
2. Add your Render URL to **Site URL:**
   ```
   https://your-app.onrender.com
   ```
3. Add to **Redirect URLs:**
   ```
   https://your-app.onrender.com/auth/callback
   ```

---

## ✅ Verification Checklist

After deployment, test these:

- [ ] App loads at Render URL
- [ ] Login works
- [ ] Director chat responds
- [ ] Notifications bell appears
- [ ] Database queries work (briefs, proposals load)
- [ ] Payment form loads (if Stripe configured)
- [ ] Email preferences page loads
- [ ] Health check works: `/api/health`

---

## 🔄 Updating Your Deployment

### Method 1: Auto-Deploy (Recommended)

Render automatically deploys when you push to `main`:

```bash
cd /Users/shaisthashaik/Desktop/Cinegen/cinegen
git add .
git commit -m "your changes"
git push origin main
```

Render detects the push and redeploys automatically.

### Method 2: Manual Deploy

In Render Dashboard:
1. Go to your service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Method 3: Deploy Specific Branch

1. Go to **Settings** tab
2. Change **Branch** to your desired branch
3. Save (triggers redeployment)

---

## 📊 Monitoring & Logs

### View Logs

In Render Dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. See real-time logs from your Docker container

### View Metrics

Click **"Metrics"** tab to see:
- CPU usage
- Memory usage
- Request rate
- Response times

### Alerts

1. Go to **"Notifications"** in Render Dashboard
2. Configure email/Slack alerts for:
   - Deploy failures
   - Service health
   - High memory usage

---

## 💰 Pricing

**Free Tier:**
- 750 hours/month
- Auto-sleep after 15 min of inactivity
- Spins up on request (cold start ~30 seconds)

**Starter Tier ($7/month):**
- No sleep
- Always running
- Better performance
- Custom domains

---

## 🐛 Troubleshooting

### Build Fails

**Error:** "Docker build failed"

**Solution:**
1. Check build logs in Render
2. Verify all build args are set correctly
3. Test locally: `docker build -t test .`

### Environment Variables Not Working

**Error:** "Supabase connection failed"

**Solution:**
1. Verify env vars in **Environment** tab
2. Check for typos in variable names
3. Ensure build args match env vars
4. Redeploy after updating env vars

### App Crashes on Startup

**Error:** "Service exited with code 1"

**Solution:**
1. Check logs for error messages
2. Verify database migrations applied
3. Test Supabase connection locally
4. Check health endpoint: `https://your-app.onrender.com/api/health`

### Slow Cold Starts (Free Tier)

**Issue:** App takes 30+ seconds to start

**Solution:**
- Upgrade to Starter tier ($7/mo) for always-on service
- Or accept cold starts on free tier
- Use cron-job.org to ping your app every 10 min

---

## 🔒 Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to Git
- ✅ Use Render's secret env vars
- ✅ Rotate keys regularly
- ✅ Use different keys for production vs development

### Database

- ✅ Enable RLS policies (already done ✅)
- ✅ Use service role key only in API routes
- ✅ Monitor Supabase logs for suspicious activity

### Docker

- ✅ Use non-root user (already configured ✅)
- ✅ Multi-stage build (already done ✅)
- ✅ Minimal Alpine images (already using ✅)

---

## 📚 Additional Resources

**Render Documentation:**
- https://render.com/docs/docker
- https://render.com/docs/deploy-nextjs-app

**CineGen Docs:**
- `DOCKER_DEPLOYMENT_GUIDE.md` - Local Docker deployment
- `EMAIL_SETUP.md` - Email configuration
- `docs/SECURITY.md` - Security best practices

---

## 🆘 Common Issues

### Issue: "Port already in use"

**Cause:** Container port 3000 is exposed but Render uses dynamic port

**Solution:** Already handled in Dockerfile:
```dockerfile
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
```

### Issue: "Database connection timeout"

**Cause:** Supabase firewall or wrong credentials

**Solution:**
1. Check Supabase URL in env vars
2. Verify anon key is correct
3. Test connection: `curl https://your-supabase-url/rest/v1/`

### Issue: "Build takes too long"

**Cause:** Installing dependencies and building Next.js

**Solution:**
- First build: 5-10 minutes (normal)
- Subsequent builds: 2-3 minutes (cached layers)
- Use Render's build cache (automatic)

---

## ✨ Quick Command Reference

```bash
# View your Render services
render services list

# View logs
render logs <service-name>

# Redeploy
render deploy <service-name>

# Open in browser
render open <service-name>
```

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Render build completes without errors
- ✅ Docker container starts successfully
- ✅ Health check returns 200 OK
- ✅ App loads at Render URL
- ✅ Login works
- ✅ Database queries succeed
- ✅ Notifications appear
- ✅ No errors in logs

---

## 📞 Support

**Render Support:**
- https://render.com/docs
- Community: https://community.render.com
- Email: support@render.com

**CineGen Issues:**
- GitHub Issues: https://github.com/shaikshaistha17/cinegen/issues

---

**Ready to Deploy?** Follow Step 1 above and create your Render account! 🚀

---

**Last Updated:** October 24, 2024  
**Docker Image:** `cinegen:latest` ✅  
**GitHub Repo:** https://github.com/shaikshaistha17/cinegen ✅

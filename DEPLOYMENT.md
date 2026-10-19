# 🚀 Deployment Guide

Complete guide to deploying CineGen to Render with Supabase backend.

---

## Prerequisites

- GitHub account with CineGen repository
- [Render account](https://render.com) (free tier available)
- [Supabase project](https://supabase.com) already set up (see [SETUP.md](./SETUP.md))
- All environment variables from your Supabase project

---

## Step 1: Push to GitHub

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

---

## Step 2: Create Web Service on Render

1. **Sign in to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Click **"Connect account"** to link your GitHub account
   - Find and select your CineGen repository
   - Click **"Connect"**

3. **Configure Service**
   - **Name**: `cinegen` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

---

## Step 3: Set Environment Variables

In the Render dashboard, scroll to **"Environment Variables"** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | From Supabase Settings → API (anon/public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | From Supabase Settings → API (service_role key - **keep secret!**) |
| `GEMINI_API_KEY` | `AIzaSy...` | (Optional) From [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `NEXT_PUBLIC_BASE_URL` | `https://cinegen.onrender.com` | Your Render URL (update after first deploy) |
| `NODE_ENV` | `production` | Auto-set by Render, but verify |

**Security Note**: Never commit these values to git or expose service role key in client code.

---

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Run `npm install && npm run build`
   - Start the app with `npm start`
3. Monitor build logs for errors
4. Once deployed, you'll get a URL like: `https://cinegen.onrender.com`

---

## Step 5: Update Base URL

After first deployment:

1. Copy your Render URL (e.g., `https://cinegen.onrender.com`)
2. In Render dashboard → Environment → Edit `NEXT_PUBLIC_BASE_URL`
3. Set it to your Render URL
4. Click **"Save Changes"** (triggers auto-redeploy)

---

## Step 6: Configure Supabase for Production

### Update Allowed Redirect URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add to **"Redirect URLs"**:
   ```
   https://cinegen.onrender.com/auth/callback
   ```
3. Add to **"Site URL"**:
   ```
   https://cinegen.onrender.com
   ```

### Update CORS (if needed)

If you encounter CORS errors:

1. Go to **Settings** → **API**
2. Add your Render URL to allowed origins

---

## Step 7: Custom Domain (Optional)

### Add Custom Domain in Render

1. Go to your service → **"Settings"** → **"Custom Domain"**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `cinegen.yourdomain.com`)
4. Render provides DNS records (CNAME or A record)

### Update DNS

Add the CNAME record from Render to your DNS provider:

```
Type: CNAME
Name: cinegen (or @)
Value: cinegen.onrender.com
```

DNS propagation takes 5 minutes to 48 hours.

### SSL Certificate

Render automatically provisions **free SSL certificates** via Let's Encrypt. HTTPS is enabled immediately.

---

## Step 8: Verify Deployment

### Test Core Features

- [ ] Visit your Render URL
- [ ] Login with demo credentials: `brand@cinegen.demo` / `Demo@123`
- [ ] Browse creators at `/creators`
- [ ] Create a brief with AI Brief Builder
- [ ] Check real-time messaging works
- [ ] Test Google OAuth login
- [ ] Verify images load from Supabase storage
- [ ] Check responsive design on mobile

### Check Logs

If anything fails:

1. Go to Render dashboard → **"Logs"**
2. Look for errors during build or runtime
3. Common issues listed in Troubleshooting below

---

## Troubleshooting

### Build Fails

**Error**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Test locally first
npm run build
# Fix all errors, then push
```

---

### Environment Variables Not Found

**Error**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**Solution**:
- Go to Render dashboard → Environment
- Verify all variables are set
- Click **"Save Changes"** to redeploy

---

### Supabase Connection Fails

**Error**: `Failed to connect to Supabase` or `Invalid API key`

**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is not paused (free tier pauses after 7 days inactivity)
- Go to Supabase Dashboard → restart project if needed

---

### Google OAuth Redirect Fails

**Error**: `Redirect URL not allowed`

**Solution**:
- Add `https://your-app.onrender.com/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs

---

### Images Not Loading

**Error**: Images from Supabase Storage return 403 or 404

**Solution**:
- Verify storage buckets (`avatars`, `portfolios`) exist in Supabase
- Check bucket policies allow public read:
  ```sql
  -- Run in Supabase SQL Editor
  CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  ```
- Update `next.config.mjs` with correct Supabase storage domain (see Step 9 below)

---

### App is Slow

**Solution**:
- Free tier Render services spin down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to paid plan for always-on instances

---

## Step 9: Update next.config.mjs (If Using Supabase Images)

If you're using Supabase Storage for images, add the domain to `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Or configure domains:
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@google/generative-ai"],
  },
};

export default nextConfig;
```

---

## Continuous Deployment

Render auto-deploys on every push to `main`:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Render auto-builds and deploys in ~2-3 minutes
```

To disable auto-deploy: Render dashboard → Settings → Build & Deploy → Toggle off "Auto-Deploy"

---

## Monitoring

### View Logs

Real-time logs in Render dashboard:
- Build logs (during deployment)
- Runtime logs (console.log, errors)

### Metrics

Render provides basic metrics:
- CPU usage
- Memory usage
- Request count

For advanced monitoring, integrate:
- [Sentry](https://sentry.io) for error tracking
- [Vercel Analytics](https://vercel.com/analytics) (if migrating)
- [Render metrics](https://render.com/docs/metrics)

---

## Rollback

If a deployment breaks production:

1. Go to Render dashboard → **"Deploys"**
2. Find the last working deploy
3. Click **"Redeploy"** on that version

---

## Migration from Vercel

If migrating from Vercel:

1. Update DNS to point to Render CNAME
2. Update all `NEXT_PUBLIC_BASE_URL` references
3. Test thoroughly on Render before switching DNS
4. Keep Vercel deployment active until verified

---

## Cost Estimates

### Render Free Tier
- 750 hours/month free compute
- App sleeps after 15 min inactivity
- Suitable for demos and testing

### Render Starter ($7/month)
- Always-on instance
- No sleep
- 512MB RAM
- Suitable for production with <1000 users

### Supabase Free Tier
- 500MB database
- 1GB file storage
- 2GB bandwidth/month
- Suitable for MVPs

---

## Production Checklist

Before launching:

- [ ] All environment variables set in Render
- [ ] `NEXT_PUBLIC_BASE_URL` points to production URL
- [ ] Supabase redirect URLs include production domain
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (auto-enabled by Render)
- [ ] Test login flow (demo + Google OAuth)
- [ ] Test brief creation and proposal submission
- [ ] Test real-time messaging
- [ ] Verify images load from Supabase storage
- [ ] Check mobile responsive design
- [ ] Set up error monitoring (Sentry)
- [ ] Monitor logs for first 24 hours

---

## Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

---

**🎉 Your CineGen app is now live!**

Share your URL: `https://cinegen.onrender.com`

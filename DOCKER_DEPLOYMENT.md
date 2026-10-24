# 🐳 Docker Deployment Guide - CineGen

This guide will help you deploy CineGen using Docker.

---

## 📋 Prerequisites

1. **Install Docker Desktop** (if not already installed):
   - **macOS:** https://docs.docker.com/desktop/install/mac-install/
   - **Windows:** https://docs.docker.com/desktop/install/windows-install/
   - **Linux:** https://docs.docker.com/desktop/install/linux-install/

2. **Verify Docker is installed:**
   ```bash
   docker --version
   docker-compose --version
   ```

---

## 🚀 Option 1: Quick Deploy with Docker Compose (Recommended)

### Step 1: Navigate to Project
```bash
cd /Users/shaisthashaik/Desktop/Cinegen/cinegen
```

### Step 2: Make sure .env.local exists
Your environment variables should be in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

✅ Your actual values are already in your local `.env.local` file

### Step 3: Build and Run
```bash
docker-compose up --build
```

This will:
- Build the Docker image (~5-10 minutes first time)
- Start the container
- Map port 3000 to your host

### Step 4: Access Your App
Open in browser: **http://localhost:3000**

### Step 5: Stop the Container
Press `Ctrl+C` or run:
```bash
docker-compose down
```

---

## 🔧 Option 2: Manual Docker Commands

### Build the Image
```bash
docker build -t cinegen:latest .
```

### Run the Container
```bash
docker run -p 3000:3000 \
  --env-file .env.local \
  --name cinegen-app \
  cinegen:latest
```

### Stop the Container
```bash
docker stop cinegen-app
docker rm cinegen-app
```

---

## 📊 Docker Commands Cheat Sheet

| Command | Purpose |
|---------|---------|
| `docker ps` | List running containers |
| `docker ps -a` | List all containers |
| `docker images` | List all images |
| `docker logs cinegen-app` | View container logs |
| `docker exec -it cinegen-app sh` | Access container shell |
| `docker-compose restart` | Restart services |
| `docker system prune -a` | Clean up unused Docker data |

---

## 🌐 Deploy to Cloud with Docker

### Option A: Railway (Easiest)
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `cinegen` repository
4. Railway auto-detects Dockerfile
5. Add environment variables in Railway dashboard
6. Deploy!

### Option B: Fly.io
```bash
# Install flyctl
brew install flyctl

# Login
flyctl auth login

# Launch app (follow prompts)
flyctl launch

# Deploy
flyctl deploy
```

### Option C: Google Cloud Run
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cinegen

# Deploy to Cloud Run
gcloud run deploy cinegen \
  --image gcr.io/YOUR_PROJECT_ID/cinegen \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🐛 Troubleshooting

### Build Fails
- **Error:** "Cannot find module"
  - Solution: Make sure `output: 'standalone'` is in `next.config.mjs` ✅ (Already added)

- **Error:** "Out of memory"
  - Solution: Increase Docker memory in Docker Desktop settings

### Container Won't Start
- Check logs: `docker logs cinegen-app`
- Verify environment variables: `docker exec cinegen-app env | grep SUPABASE`

### Port Already in Use
- Stop other services on port 3000
- Or change port: `docker run -p 8080:3000 ...` (access at localhost:8080)

---

## 📦 What's Included

**Files Created:**
- ✅ `Dockerfile` - Multi-stage build for production
- ✅ `.dockerignore` - Excludes unnecessary files
- ✅ `docker-compose.yml` - Easy orchestration
- ✅ `next.config.mjs` - Updated with `output: 'standalone'`

**Docker Image Details:**
- Base: Node 20 Alpine (lightweight)
- Multi-stage build (optimized size)
- Non-root user (security)
- Production-ready configuration

---

## 🎉 Success Indicators

When container starts successfully, you'll see:
```
✓ Ready in 1.2s
```

Then access: **http://localhost:3000**

---

## 🔐 Security Notes

- `.env.local` is excluded from Docker image via `.dockerignore`
- Environment variables passed at runtime
- Non-root user runs the application
- Service role key kept secret in environment

---

## 📝 Next Steps After Docker Setup

1. **Apply Database Migrations:**
   - Go to Supabase SQL Editor
   - Run `database/migrations/APPLY_NOW_007_AND_009.sql`

2. **Test the App:**
   - Login at http://localhost:3000/login
   - Try CineGen Director (type "hi")
   - Check Decision Room feature

3. **Deploy to Production:**
   - Use Railway, Fly.io, or Google Cloud Run
   - Add environment variables in their dashboard
   - Your app will be live!

---

**Need Help?** Check Docker logs: `docker logs cinegen-app -f`

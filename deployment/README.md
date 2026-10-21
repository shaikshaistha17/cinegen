# CineGen Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase project (existing: hoiqipfguwpdihgfrqyy)
- FFmpeg with ffprobe (for video inspection)

## Environment Variables

Create `.env.local` in project root:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://hoiqipfguwpdihgfrqyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Change for production

# Optional: Gemini AI for brief generation (Part 3)
GEMINI_API_KEY=your_gemini_key_here  # Get from https://aistudio.google.com/
```

## Database Setup

### 1. Run Migrations in Order

In Supabase SQL Editor, execute:

```sql
-- 1. Base schema (if not already done)
-- Run: database/schema.sql

-- 2. RLS policies (if not already done)
-- Run: database/rls-policies.sql

-- 3. Part 2 enhancements
-- Run: database/migrations/001_add_missing_fields.sql

-- 4. Part 4 delivery workflow
-- Run: database/migrations/002_delivery_workflow.sql
```

### 2. Storage Setup

In Supabase Dashboard > Storage:

1. **Create Bucket**: Name it `deliveries`
2. **Settings**:
   - Privacy: **Private** (participant-only access)
   - File size limit: **500 MB**
   - Allowed MIME types: `video/mp4, video/quicktime, video/webm, image/jpeg, image/png, image/webp`

3. **Storage Policies** (already in migration, but verify):
```sql
-- Allow participants to upload
CREATE POLICY "Participants can upload deliveries"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliveries' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agreements
    WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
  )
);

-- Allow participants to download
CREATE POLICY "Participants can download deliveries"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliveries' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agreements
    WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
  )
);
```

## Build & Deploy

### Local Development

```bash
# Install dependencies
npm install

# Install sharp for image inspection (required)
npm install sharp

# Run development server
npm run dev
# Open http://localhost:3000
```

### Production Build

```bash
# Build
npm run build

# Start production server
npm start
# Listens on port 3000
```

### Build Commands Summary

- **Install**: `npm install`
- **Build**: `npm run build`
- **Start**: `npm start` (or `npm run dev` for development)
- **Lint**: `npm run lint`

## Media Inspection Requirements

### For Image Inspection (✅ Already installed via npm)
- **sharp** library (Node.js)
- Handles: JPEG, PNG, WebP
- Extracts: dimensions, aspect ratio

### For Video Inspection (⚠️ Optional but recommended)
- **ffprobe** (part of FFmpeg)

#### Installing FFmpeg:

**macOS (Homebrew)**:
```bash
brew install ffmpeg
```

**Ubuntu/Debian**:
```bash
apt-get update && apt-get install -y ffmpeg
```

**Docker (add to Dockerfile)**:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

**Render.com** (add to `render.yaml`):
```yaml
services:
  - type: web
    buildCommand: |
      apt-get update && apt-get install -y ffmpeg
      npm install
      npm run build
```

#### Graceful Fallback
If ffprobe is not available:
- Video files return `inspection_status: 'unsupported'`
- Images still work via sharp
- No false passes - unsupported means unsupported

## Health Check

Endpoint: `GET /api/health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-10-19T...",
  "checks": {
    "database": "connected",
    "storage": "available",
    "mediaInspection": {
      "images": "available",
      "videos": "available"  // or "unavailable" if ffprobe missing
    }
  }
}
```

## Deployment Platforms

### Render.com

1. Create new Web Service
2. Connect GitHub repo
3. **Build Command**:
   ```bash
   apt-get update && apt-get install -y ffmpeg && npm install && npm run build
   ```
4. **Start Command**: `npm start`
5. Add environment variables from `.env.local`
6. Deploy

### Vercel (Note: ffprobe not available)

1. Connect GitHub repo
2. Framework: Next.js
3. Add environment variables
4. Deploy
5. **Limitation**: Video inspection will return `unsupported` (images work)

### Docker

```dockerfile
FROM node:18-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t cinegen .
docker run -p 3000:3000 --env-file .env.local cinegen
```

## Post-Deployment Checklist

1. ✅ Verify health check: `curl https://your-domain.com/api/health`
2. ✅ Test image upload (should pass inspection)
3. ✅ Test video upload (should pass if ffprobe available)
4. ✅ Test private storage access (non-participants get 403)
5. ✅ Test agreement acceptance (both parties required)
6. ✅ Test Production Passport generation
7. ✅ Run demo flow (see `demo-script.md`)

## Monitoring

### Logs to Watch
- API errors: Check `/api/*` routes for 500 errors
- Upload failures: Storage permission errors
- Inspection timeouts: ffprobe/sharp processing
- Rate limiting: AI endpoint throttling (10 req/min)

### Common Issues

**"Delivery upload failed"**
- Check Supabase Storage bucket exists and is private
- Verify storage policies applied
- Check file size < 500MB

**"Inspection status: unsupported"** for videos
- Install ffprobe: `which ffprobe` should return path
- Check `/api/health` media inspection status

**"Agreement not found"**
- Both parties must accept proposal first
- Check agreement created via POST /api/agreements

## Security Notes

- ✅ All delivery files private (participant-only)
- ✅ All API routes enforce ownership
- ✅ RLS policies on all tables
- ✅ File type validation (actual MIME check, not extension)
- ✅ File size limits enforced
- ✅ Rate limiting on AI endpoints
- ⚠️ Service role key must stay server-side only
- ⚠️ Demo accounts have shared access (label clearly)

## Support

For issues:
1. Check build: `npm run build` (should have 0 errors)
2. Check health: `GET /api/health`
3. Check logs: Browser console + server logs
4. Review PART4_IMPLEMENTATION.md for architecture details

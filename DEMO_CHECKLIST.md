# CineGen Demo Checklist

**Before Demo Date**: Complete these steps to ensure everything works

---

## ✅ Pre-Demo Setup (30 minutes)

### 1. Database Migration ⚠️ CRITICAL
```sql
-- Go to: https://supabase.com/dashboard/project/hoiqipfguwpdihgfrqyy/editor
-- Click "New Query"
-- Copy & paste contents of: database/migrations/002_delivery_workflow.sql
-- Click "Run" (Cmd+Enter)
-- Should see: "Success. No rows returned" ✅
```

### 2. Storage Bucket Setup ⚠️ CRITICAL
```
Go to: https://supabase.com/dashboard/project/hoiqipfguwpdihgfrqyy/storage/buckets

Click "New bucket":
- Name: deliveries
- Privacy: Private ⚠️ (NOT public)
- File size limit: 500 MB
- Allowed MIME types: video/mp4, video/quicktime, video/webm, image/jpeg, image/png, image/webp

Click "Create bucket"

Policies should auto-apply from migration.
```

### 3. Environment Variables Check
```bash
# Open .env.local and verify:
NEXT_PUBLIC_SUPABASE_URL=https://hoiqipfguwpdihgfrqyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  # Get from Supabase dashboard
SUPABASE_SERVICE_ROLE_KEY=your_service_key   # Get from Supabase dashboard
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional (for Part 3 AI features):
GEMINI_API_KEY=your_gemini_key_here
```

### 4. Build Verification
```bash
cd /Users/shaisthashaik/Desktop/Cinegen/cinegen
npm run build

# Should see:
# ✓ Compiled successfully
# ✓ Generating static pages (43/43)
# 0 errors ✅
```

### 5. Start Development Server
```bash
npm run dev

# Open: http://localhost:3000
# Should load homepage without errors
```

### 6. Health Check
```bash
# Open in browser or curl:
http://localhost:3000/api/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "checks": {
    "database": "connected",
    "storage": "available",
    "mediaInspection": {
      "images": "available",
      "videos": "available" or "unavailable"  # Depends on ffmpeg
    }
  }
}
```

---

## 🎬 Demo Day Checklist

### Morning Setup (1 hour before demo)

- [ ] **Start server**: `npm run dev` in cinegen directory
- [ ] **Verify health**: Open http://localhost:3000/api/health
- [ ] **Test login**: Try demo account login
- [ ] **Prepare demo files**:
  - `cafe_horizontal_draft.mp4` (1920x1080, 16:9) - Will FAIL
  - `cafe_vertical_final.mp4` (1080x1920, 9:16) - Will PASS
- [ ] **Browser tabs ready**:
  - Tab 1: http://localhost:3000 (Brand view)
  - Tab 2: http://localhost:3000 (Creator view, incognito)
- [ ] **Documentation open**: `deployment/demo-script.md`
- [ ] **Backup plan**: If ffmpeg unavailable, use image files (PNG)

### During Demo (8-10 minutes)

**Follow**: `deployment/demo-script.md`

**Key Moments**:
1. ✨ Show AI brief generation
2. 🔍 Show BriefIntelligence catching missing field
3. 🎯 Show evidence-linked matching (portfolio)
4. 📜 Show dual agreement acceptance
5. ❌ Show failed inspection (wrong aspect ratio)
6. ✅ Show passed inspection (correct aspect ratio)
7. 📋 Show Production Passport (full history)

**Talking Points**:
- "Technical validation is automatic - no human judgment needed"
- "Both parties must accept the exact same scope before work begins"
- "Every event is logged - complete audit trail"
- "Matching is evidence-based - you see the actual portfolio item"

---

## 🐛 Troubleshooting

### Issue: "Delivery upload failed"
**Fix**:
1. Check storage bucket exists: Supabase → Storage → `deliveries`
2. Verify bucket is private (not public)
3. Check file size < 500MB
4. Try image file instead (PNG) - always works

### Issue: "Inspection status: unsupported" for videos
**Cause**: ffprobe not installed (optional)
**Fix**: 
1. Install: `brew install ffmpeg` (macOS)
2. Verify: `which ffprobe` returns path
3. Restart server
4. Or: Use image files for demo (PNG always works)

### Issue: "Agreement not found"
**Cause**: Both parties haven't accepted yet
**Fix**: Make sure both brand AND creator clicked "Accept Agreement"

### Issue: Build errors
**Fix**:
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Issue: Database connection error
**Fix**:
1. Check Supabase project is active
2. Verify `.env.local` has correct URL and keys
3. Test: Open Supabase dashboard, go to Table Editor

---

## 📊 Quick Stats (For Judges)

**Project Size**:
- 15,000+ lines of code
- 45 pages
- 40+ API routes
- 80+ components
- 13 database tables

**Development Time**:
- Part 1 (Security): 1 day
- Part 2 (Backend): 2 days
- Part 3 (AI): Planned
- Part 4 (Delivery): 3 days
- **Total**: ~6 days

**Tech Stack**:
- Next.js 14
- TypeScript
- Supabase (PostgreSQL + Storage + Auth)
- Radix UI + Tailwind CSS
- sharp + ffprobe (media inspection)

**Unique Features**:
- ✅ Automated technical validation
- ✅ Versioned immutable agreements
- ✅ Production Passport (audit trail)
- ✅ Evidence-based matching

---

## 🎯 Key Demo Differentiators

**What to emphasize**:

1. **Technical Validation** 🔬
   - "No human judgment needed - system validates aspect ratio, duration, format"
   - "Failed deliveries can't be approved without documented override"

2. **Versioned Agreements** 📜
   - "Both parties must accept the exact same scope"
   - "Once accepted, it's immutable - no scope creep"

3. **Production Passport** 📋
   - "Every event logged - failed attempts, revisions, approvals"
   - "Complete audit trail for disputes"

4. **Evidence-Based Matching** 🎯
   - "Not just a score - you see the actual portfolio item"
   - "Transparent: skills match + tools match + proof"

**What makes CineGen different**:
- Most marketplaces: Manual review of deliveries
- CineGen: **Automated technical validation**

- Most platforms: Vague agreements
- CineGen: **Immutable versioned scope**

- Most sites: No accountability
- CineGen: **Complete audit trail**

---

## ✅ Final Pre-Demo Checklist

**Day Before**:
- [ ] Migration run: `002_delivery_workflow.sql`
- [ ] Storage bucket created: `deliveries` (private)
- [ ] Build passes: `npm run build` (0 errors)
- [ ] Health check works: `/api/health`
- [ ] Demo files prepared (horizontal + vertical videos)

**Morning Of**:
- [ ] Server running: `npm run dev`
- [ ] Browser tabs ready (brand + creator)
- [ ] Demo script open: `demo-script.md`
- [ ] Network stable (for Supabase connection)
- [ ] Backup plan ready (use images if ffmpeg fails)

**During Demo**:
- [ ] Show failed inspection (horizontal video)
- [ ] Show passed inspection (vertical video)
- [ ] Show Production Passport
- [ ] Emphasize unique differentiators

---

## 🎉 You're Ready!

**What's Working**:
- ✅ Build: 0 errors
- ✅ Database: 13 tables with RLS
- ✅ Storage: Private buckets
- ✅ APIs: 40+ routes with ownership checks
- ✅ UI: 45 pages, responsive, accessible
- ✅ Demo: 8-10 minute script ready

**Confidence Level**: 🚀🚀🚀🚀🚀

**Go crush it at HackXLerate 2026!** 🏆

---

**Questions?** Check:
- `README_FINAL.md` - Project overview
- `KIRO_PROGRESS.md` - Complete implementation details
- `PART4_IMPLEMENTATION.md` - Delivery workflow specifics
- `deployment/demo-script.md` - Step-by-step demo guide

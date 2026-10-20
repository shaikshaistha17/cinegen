# 🚀 Creator Services Testing Guide
**Feature:** Two-Way Marketplace - Creator Service Listings

---

## ⚡ STEP 1: Apply Database Migration

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/hoiqipfguwpdihgfrqyy

2. **Click:** SQL Editor (left sidebar)

3. **Click:** "+ New Query"

4. **Copy and paste** the entire contents of:
   ```
   database/APPLY-THIS-creator_services_complete.sql
   ```

5. **Click:** "Run" button (or press Cmd+Enter)

6. **✅ You should see:** "Success. No rows returned"

---

## ⚡ STEP 2: Test Creator Flow

### A. Login as Creator
1. Go to: http://localhost:3002/login
2. Login with: `creator@cinegen.demo` / `Demo@123`
3. Click "Continue as Creator" (quick button)

### B. Create Your First Service
1. **Navigate to:** Dashboard → Click "Manage My Services" card
   - OR go directly to: http://localhost:3002/dashboard/creator/services

2. **Click:** "Post New Service" button (top right)

3. **Fill in the form:**
   - **Title:** "Professional Tech Review Video"
   - **Description:** "I'll create a 60-second professional tech review video with AI-generated voiceovers, motion graphics, and custom transitions. Perfect for product launches and social media campaigns."
   - **Skills:** Select "Video Editing", "Motion Graphics", "AI Tools"
   - **Price Range:** Select "$1k-$3k"
   - **Delivery Time:** Select "3-5 days"
   - **Portfolio (Optional):** 
     - URL: https://youtube.com/watch?v=demo1
     - Title: Sample Tech Review

4. **Click:** "Create Service"

5. **✅ You should see:**
   - Success toast notification
   - Your service card appears in the grid
   - Service shows "Active" badge

### C. Test Edit/Delete
1. **Click:** "Edit" button on your service
2. Change the title to "Premium Tech Review Video"
3. **Click:** "Update Service"
4. **✅ Service title updates instantly**

5. **Toggle:** Active/Inactive switch
6. **✅ Badge changes color** (green → gray)

---

## ⚡ STEP 3: Test Brand Discovery

### A. Browse Services Page
1. **Logout** (or open incognito window)
2. **Go to:** http://localhost:3002/services
3. **✅ You should see:**
   - Your service card in the grid
   - Filters sidebar (Skills, Price Range, Delivery Time)
   - Search bar at top

### B. Test Filters
1. **Click:** Skills → "Video Editing" checkbox
2. **✅ Only video editing services show**
3. **Click:** "X" on the filter chip to remove
4. **✅ All services reappear**

### C. Test Search
1. **Type:** "tech review" in search bar
2. **✅ Only matching services show**

### D. Test Sort
1. **Select:** "Price: Low to High" from dropdown
2. **✅ Services reorder by price**

---

## ⚡ STEP 4: Test Service Detail Page

1. **Click:** "View Details" on any service card
2. **✅ You should see:**
   - Full service description
   - All skills as pills
   - Price range and delivery time in cards
   - Portfolio samples (if added)
   - **Right sidebar:** Creator profile card with:
     - Avatar
     - Name and handle
     - Bio
     - "View Full Profile" link
     - "Contact Creator" button
     - "Book Service" CTA button (gradient)

3. **Click:** "View Full Profile"
4. **✅ Navigates to:** /creators/[creatorId]

---

## ⚡ STEP 5: Check Navigation

### A. Main Navigation
1. **Check navbar** (top of any page)
2. **✅ You should see:** "Services" link between "Discover" and "Briefs"
3. **Click it:** Should go to /services

### B. Homepage Integration
1. **Go to:** http://localhost:3002
2. **Scroll down** to "Creator Services Marketplace" section
3. **✅ You should see:**
   - 2 featured services in cards
   - "Browse All Services" button
4. **Click button:** Should go to /services

### C. Creator Dashboard
1. **Login as creator**
2. **Go to:** /dashboard
3. **✅ You should see:** "Manage My Services" card in the dashboard grid
4. **Click it:** Goes to /dashboard/creator/services

---

## 🎯 Full Test Scenarios

### Scenario 1: Creator Posts Service → Brand Finds It
1. ✅ Login as creator
2. ✅ Post new service "Social Media Reel Package"
3. ✅ Logout
4. ✅ Go to /services
5. ✅ Search for "reel"
6. ✅ Service appears
7. ✅ Click "View Details"
8. ✅ See full service + creator profile
9. ✅ Click "Contact Creator" (shows login prompt if not logged in)

### Scenario 2: Multiple Creators, Filter by Skills
1. ✅ Login as creator 1, post "Video Editing" service
2. ✅ Logout, login as creator 2 (use `priya@cinegen.demo` / `Demo@123`)
3. ✅ Post "Copywriting" service
4. ✅ Logout, go to /services
5. ✅ Filter by "Video Editing" skill
6. ✅ Only creator 1's service shows
7. ✅ Filter by "Copywriting"
8. ✅ Only creator 2's service shows

### Scenario 3: Creator Edits Live Service
1. ✅ Login as creator
2. ✅ Go to /dashboard/creator/services
3. ✅ Edit a service title
4. ✅ Open /services in another tab (incognito)
5. ✅ Refresh that tab
6. ✅ Updated title appears immediately

---

## 🐛 What to Watch For

### Potential Issues:
- **"creator_services does not exist"** → Database migration not applied yet
- **Services not showing in /services** → Check `is_active = true` on services
- **Can't create service** → Make sure you're logged in as a CREATOR (not brand)
- **Filters not working** → Check browser console for JS errors

### Quick Fixes:
- **Clear browser cache:** Cmd+Shift+R (hard refresh)
- **Restart dev server:** Ctrl+C, then `npm run dev` again
- **Check Supabase logs:** Dashboard → Logs → API

---

## 📊 Success Checklist

Before demo, verify:
- [ ] Database migration applied (no SQL errors)
- [ ] Can login as creator
- [ ] Can create new service with all fields
- [ ] Service appears in creator's dashboard
- [ ] Can edit/delete service
- [ ] Active/inactive toggle works
- [ ] Service appears in /services browse page
- [ ] Filters work (skills, price, delivery time)
- [ ] Search works
- [ ] Sort works (newest, price low/high)
- [ ] Service detail page loads correctly
- [ ] Creator profile card shows in detail page
- [ ] "Services" link in navbar works
- [ ] Homepage shows featured services
- [ ] Mobile responsive (test on phone or DevTools)
- [ ] No console errors

---

## 🏆 Demo Script for Judges

**"Let me show you CineGen's two-way marketplace:**

1. **"Creators post their services..."** [Navigate to creator dashboard, click "Post Service", fill form, create]

2. **"Brands can discover services proactively..."** [Logout, go to /services, show grid]

3. **"Advanced filters help find the perfect match..."** [Apply skill filter, price filter, search]

4. **"Each service has full details and creator profile..."** [Click a service, show detail page]

5. **"This creates a TRUE two-way marketplace - brands post briefs, creators respond, AND creators post services, brands discover. Unlike CREVO which is one-way only."** 🎯

---

## 🚀 You're Ready!

Once all checkboxes above are ✅, you have:
- ✅ Full two-way marketplace
- ✅ Database-backed services (not localStorage)
- ✅ Real-time updates
- ✅ Beautiful glassmorphism UI
- ✅ Mobile responsive
- ✅ Security with RLS policies

**BEAT CREVO! 🏆**

---

**Need Help?**
- Database issues: Check Supabase Dashboard → Logs
- Frontend issues: Check browser console (F12)
- Auth issues: Verify you're logged in as creator (not brand)

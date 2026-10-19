# 🧪 CineGen Testing Guide

Comprehensive test scenarios and QA checklist for CineGen v2.0.

---

## Table of Contents

1. [Testing Environment](#testing-environment)
2. [Authentication Tests](#authentication-tests)
3. [Creator Discovery Tests](#creator-discovery-tests)
4. [Brief Creation Tests](#brief-creation-tests)
5. [Proposal Flow Tests](#proposal-flow-tests)
6. [Real-time Messaging Tests](#real-time-messaging-tests)
7. [Review System Tests](#review-system-tests)
8. [Verification Flow Tests](#verification-flow-tests)
9. [UI/Animation Tests](#uianimation-tests)
10. [Responsive Design Tests](#responsive-design-tests)
11. [Cross-Browser Tests](#cross-browser-tests)
12. [Performance Tests](#performance-tests)
13. [Security Tests](#security-tests)

---

## Testing Environment

### Test Accounts

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Brand | `brand@cinegen.demo` | `Demo@123` | Primary brand testing |
| Creator 1 | `aryan@cinegen.demo` | `Demo@123` | Main creator (AI Filmmaker) |
| Creator 2 | `priya@cinegen.demo` | `Demo@123` | Animator |
| Creator 3 | `marcus@cinegen.demo` | `Demo@123` | VFX Director |

### Test URLs

- **Production**: `https://cinegen.onrender.com`
- **Local**: `http://localhost:3000`

### Test Data

- 18 pre-seeded creator profiles
- Demo credentials bypass OTP verification
- Supabase test database with sample briefs and proposals

---

## Authentication Tests

### 1. Demo Login (1-Click)

**Test Case**: Brand demo login

**Steps**:
1. Navigate to `/login`
2. Click **"Continue as Brand"** button
3. Observe loading spinner

**Expected**:
- ✅ Redirects to `/dashboard` within 2 seconds
- ✅ Navbar shows "Arjun Mehta" with avatar
- ✅ Role switcher shows "Brand" badge
- ✅ Session persists on page refresh

---

**Test Case**: Creator demo login

**Steps**:
1. Navigate to `/login`
2. Click **"Continue as Creator"** button

**Expected**:
- ✅ Redirects to `/dashboard`
- ✅ Navbar shows "Aryan Kapoor" (or selected creator)
- ✅ Dashboard shows creator-specific stats

---

### 2. Manual Login

**Test Case**: Valid credentials

**Steps**:
1. Navigate to `/login`
2. Enter email: `brand@cinegen.demo`
3. Enter password: `Demo@123`
4. Click **"Log In"**

**Expected**:
- ✅ Success toast appears
- ✅ Redirects to `/dashboard`
- ✅ Session stored in cookies (check DevTools → Application → Cookies)

---

**Test Case**: Invalid credentials

**Steps**:
1. Navigate to `/login`
2. Enter email: `test@example.com`
3. Enter password: `wrongpassword`
4. Click **"Log In"**

**Expected**:
- ✅ Error toast: "Invalid credentials"
- ✅ Stays on `/login` page
- ✅ Password field cleared

---

### 3. Registration

**Test Case**: New creator registration

**Steps**:
1. Navigate to `/register`
2. Select role: **Creator**
3. Fill form:
   - Email: `testcreator@example.com`
   - Password: `Test@12345`
   - Name: `Test Creator`
4. Click **"Sign Up"**

**Expected**:
- ✅ Success message: "Check your email for verification code"
- ✅ Redirects to `/verify-otp` page
- ✅ Email received with 6-digit OTP (check inbox)

---

**Test Case**: Email already exists

**Steps**:
1. Navigate to `/register`
2. Enter email: `brand@cinegen.demo` (existing)
3. Fill other fields
4. Click **"Sign Up"**

**Expected**:
- ✅ Error toast: "Email already registered"
- ✅ Stays on `/register` page

---

### 4. OTP Verification

**Test Case**: Valid OTP

**Steps**:
1. Complete registration (see above)
2. Copy OTP from email
3. Enter OTP on `/verify-otp` page
4. Click **"Verify"**

**Expected**:
- ✅ Success toast: "Email verified!"
- ✅ Redirects to `/onboarding` (creators) or `/dashboard` (brands)
- ✅ Session created

---

**Test Case**: Invalid OTP

**Steps**:
1. Enter wrong OTP: `999999`
2. Click **"Verify"**

**Expected**:
- ✅ Error toast: "Invalid or expired OTP"
- ✅ Stays on `/verify-otp` page

---

### 5. Google OAuth

**Test Case**: Google login flow

**Steps**:
1. Navigate to `/login`
2. Click **"Continue with Google"** button
3. Select Google account (or sign in)
4. Grant permissions

**Expected**:
- ✅ Redirects to Google consent screen
- ✅ After approval, redirects to `/auth/callback`
- ✅ Then redirects to `/dashboard`
- ✅ Profile populated with Google data (name, avatar)

---

### 6. Logout

**Test Case**: Logout flow

**Steps**:
1. Login as any user
2. Click avatar in navbar → **"Logout"**

**Expected**:
- ✅ Redirects to `/login` page
- ✅ Session cleared (check cookies)
- ✅ Accessing `/dashboard` redirects to `/login`

---

## Creator Discovery Tests

### 1. Browse All Creators

**Test Case**: Load creator list

**Steps**:
1. Navigate to `/creators`

**Expected**:
- ✅ 18 creator cards displayed
- ✅ Skeleton loaders shown during fetch (<1 second)
- ✅ Cards have: avatar, name, headline, rate, verified badge, tools
- ✅ Hover effects: gradient border, slight scale

---

### 2. Search Functionality

**Test Case**: Search by name

**Steps**:
1. Navigate to `/creators`
2. Type in search: `Aryan`
3. Wait for debounce (300ms)

**Expected**:
- ✅ Results filtered to 1 creator: Aryan Kapoor
- ✅ Other creators hidden
- ✅ Search term highlighted (optional)

---

**Test Case**: Search by tool

**Steps**:
1. Type in search: `Runway`

**Expected**:
- ✅ Results show all creators with "Runway" in verified_tools
- ✅ Count: ~8-10 creators

---

**Test Case**: No results

**Steps**:
1. Type in search: `zzzzz`

**Expected**:
- ✅ Empty state shown: "No creators found"
- ✅ Message: "Try adjusting your filters or search terms"

---

### 3. Filter by Tools

**Test Case**: Single tool filter

**Steps**:
1. Navigate to `/creators`
2. Click **"AI Tools"** dropdown
3. Select: **Runway**

**Expected**:
- ✅ Results filtered to creators with Runway
- ✅ Badge shown: "Runway ✕" (removable)
- ✅ Count updated: "Showing X of 18 creators"

---

**Test Case**: Multiple tools (AND logic)

**Steps**:
1. Select: **Runway**
2. Add: **Midjourney**

**Expected**:
- ✅ Results show only creators with BOTH tools
- ✅ Count decreases

---

### 4. Filter by Rate Range

**Test Case**: Max rate filter

**Steps**:
1. Set slider: Max $100/hr

**Expected**:
- ✅ Only creators with hourly_rate_usd ≤ 100 shown
- ✅ Slider value displayed: "$100/hr"

---

### 5. Filter by Availability

**Test Case**: Available only

**Steps**:
1. Click **"Availability"** dropdown
2. Select: **Available**

**Expected**:
- ✅ Only creators with "Available" status shown
- ✅ "Busy" and "Unavailable" creators hidden

---

### 6. Sort Creators

**Test Case**: Sort by rate (low to high)

**Steps**:
1. Click **"Sort"** dropdown
2. Select: **"Rate: Low to High"**

**Expected**:
- ✅ Creators reordered
- ✅ Lowest rate first (e.g., $45/hr)
- ✅ Highest rate last (e.g., $150/hr)

---

**Test Case**: Sort by rating

**Steps**:
1. Select: **"Top Rated"**

**Expected**:
- ✅ Highest rated creator first (5.0 stars)
- ✅ Order descending by rating

---

### 7. Creator Profile Page

**Test Case**: View full profile

**Steps**:
1. Navigate to `/creators`
2. Click on **Aryan Kapoor** card

**Expected**:
- ✅ Redirects to `/creators/[id]`
- ✅ Cover image displayed with parallax effect
- ✅ Avatar with gradient ring
- ✅ Verified badges with pulse glow
- ✅ **Style DNA** radar chart animates on scroll
- ✅ Portfolio grid loads (3-4 items)
- ✅ Tools with proficiency levels (Expert, Advanced, Intermediate)
- ✅ Stats: projects, rating, response time
- ✅ **"Invite to Brief"** button

---

**Test Case**: Portfolio modal

**Steps**:
1. On creator profile, click any portfolio item

**Expected**:
- ✅ Modal opens with full-screen view
- ✅ Shows: title, thumbnail, tools used
- ✅ **Workflow steps** displayed (3-5 steps)
- ✅ Close button (X) works
- ✅ ESC key closes modal

---

## Brief Creation Tests

### 1. AI Brief Builder

**Test Case**: Generate brief with Gemini

**Steps**:
1. Login as brand
2. Navigate to `/briefs/new`
3. Select **"AI Brief Builder"** tab
4. Type idea: `A cinematic 30-second ad for luxury skincare targeting Gen Z`
5. Click **"Generate Brief with Gemini AI"**

**Expected**:
- ✅ Loading spinner shown
- ✅ Fields populate progressively with typing animation
- ✅ Brief Intelligence panel updates in real-time
- ✅ Score ring animates from 0 to final score (e.g., 85/100)
- ✅ All required fields filled within 3-5 seconds
- ✅ **"Publish Brief"** button enabled

---

**Test Case**: Brief Intelligence audit

**Steps**:
1. Generate brief (see above)
2. Observe right sidebar

**Expected**:
- ✅ Score out of 100 displayed prominently
- ✅ Color-coded: Green (>80), Yellow (60-80), Red (<60)
- ✅ **Errors** section (red): missing required fields
- ✅ **Warnings** section (yellow): recommended additions
- ✅ **Tips** section (blue): improvement suggestions
- ✅ Each item has icon and description
- ✅ Clicking item scrolls to relevant field

---

**Test Case**: Low score scenario

**Steps**:
1. Select **"Manual Entry"** tab
2. Fill only: Campaign Title
3. Leave all other fields empty

**Expected**:
- ✅ Score: ~20/100 (red)
- ✅ Errors shown: "Missing objective", "Missing content type", etc.
- ✅ **"Publish Brief"** button disabled

---

### 2. Manual Brief Entry

**Test Case**: Complete manual form

**Steps**:
1. Fill all fields manually:
   - Campaign Title: `Test Campaign`
   - Objective: `Increase brand awareness`
   - Content Type: **Film**
   - Style: **Cinematic**
   - Budget: $2000-$5000
   - Deadline: Select date picker
2. Click **"Publish Brief"**

**Expected**:
- ✅ Success toast: "Brief published!"
- ✅ Confetti explosion animation
- ✅ Redirects to `/briefs` with new brief in list

---

**Test Case**: Form validation

**Steps**:
1. Leave Campaign Title empty
2. Click **"Publish Brief"**

**Expected**:
- ✅ Error message below field: "Campaign title is required"
- ✅ Field highlighted in red
- ✅ Brief not submitted

---

### 3. Match Results

**Test Case**: View top creator matches

**Steps**:
1. Publish brief (see above)
2. Scroll to **"Top Creator Matches"** section

**Expected**:
- ✅ Top 5 creators shown
- ✅ Each has:
   - Circular score ring (animated SVG)
   - % match score (e.g., 92%)
   - Reason tags: "Tool overlap ✓", "Specialization match ✓", "Budget fit ✓"
- ✅ Click creator card → redirects to profile
- ✅ **"Invite"** button on each card

---

## Proposal Flow Tests

### 1. Submit Proposal (Creator)

**Test Case**: Apply to brief

**Steps**:
1. Login as creator (`aryan@cinegen.demo`)
2. Navigate to `/briefs`
3. Click **"Apply"** on any Open brief
4. Fill modal:
   - Message: `I'd love to work on this project...`
   - Price: $3500
   - Timeline: 10 days
5. Click **"Submit Proposal"**

**Expected**:
- ✅ Success toast: "Proposal submitted!"
- ✅ Modal closes
- ✅ Brief status changes to "Applied" (from creator's view)
- ✅ Proposal appears in creator's dashboard

---

### 2. View Proposals (Brand)

**Test Case**: See incoming proposals

**Steps**:
1. Login as brand
2. Navigate to `/dashboard`
3. Scroll to **"Recent Proposals"** section

**Expected**:
- ✅ Proposals listed with:
   - Creator avatar, name, headline
   - Price, timeline
   - **"Accept"** and **"Reject"** buttons
- ✅ Hover effects on proposal cards

---

### 3. Accept Proposal (Brand)

**Test Case**: Accept creator's proposal

**Steps**:
1. Click **"Accept"** on a proposal

**Expected**:
- ✅ Confirmation modal: "Accept this proposal?"
- ✅ Click **"Confirm"**
- ✅ Success toast: "Proposal accepted!"
- ✅ Proposal status changes to "Accepted"
- ✅ Other proposals for same brief auto-rejected (optional)
- ✅ Engagement appears in **"Active Projects"**

---

### 4. Reject Proposal (Brand)

**Test Case**: Reject creator's proposal

**Steps**:
1. Click **"Reject"** on a proposal

**Expected**:
- ✅ Confirmation modal: "Reject this proposal?"
- ✅ Click **"Confirm"**
- ✅ Proposal status changes to "Rejected"
- ✅ Proposal removed from dashboard

---

### 5. Mark Delivered (Brand)

**Test Case**: Complete engagement lifecycle

**Steps**:
1. Accept a proposal (see above)
2. On dashboard, find engagement in **"Active Projects"**
3. Click **"✓ Mark Delivered"** button

**Expected**:
- ✅ Confetti explosion animation
- ✅ Success toast: "Project marked as delivered!"
- ✅ Engagement moves to "Completed" section
- ✅ **"Write Review"** button appears

---

## Real-time Messaging Tests

### 1. Send Message (Brand → Creator)

**Test Case**: Start conversation

**Steps**:
1. Login as brand
2. Navigate to creator profile
3. Click **"Message"** button
4. Type message: `Hi, I'd like to discuss the brief details`
5. Click **"Send"** (or press Enter)

**Expected**:
- ✅ Message appears in thread immediately
- ✅ Sent by: Brand (right-aligned, different color)
- ✅ Timestamp shown (e.g., "Just now")
- ✅ Input field cleared

---

### 2. Receive Message (Creator)

**Test Case**: Real-time delivery

**Steps**:
1. Open second browser window
2. Login as creator (`aryan@cinegen.demo`)
3. Navigate to `/messages`
4. Keep window visible
5. In first window (brand), send message (see above)

**Expected**:
- ✅ Message appears in creator's window within 500ms
- ✅ No manual refresh needed
- ✅ Notification bell badge increments (+1 unread)
- ✅ Conversation moves to top of sidebar

---

**Test Case**: Polling fallback (if Realtime fails)

**Steps**:
1. Disable Realtime (simulate quota exceeded)
2. Send message

**Expected**:
- ✅ Message appears within 10 seconds (polling interval)
- ✅ No errors in console

---

### 3. Conversation List

**Test Case**: View all conversations

**Steps**:
1. Login as brand
2. Navigate to `/messages`

**Expected**:
- ✅ Sidebar shows all conversations
- ✅ Each conversation has:
   - Participant avatar
   - Last message preview (truncated)
   - Timestamp (e.g., "2h ago")
   - Unread badge (if unread > 0)
- ✅ Conversations sorted by most recent first

---

### 4. Mark as Read

**Test Case**: Read notification

**Steps**:
1. Creator receives message (unread badge shows)
2. Creator clicks conversation in sidebar
3. Message thread opens

**Expected**:
- ✅ Unread badge disappears immediately
- ✅ Notification bell count decrements (-1)
- ✅ Message marked as read in database (read_at timestamp set)

---

## Review System Tests

### 1. Submit Review (Brand)

**Test Case**: Write review after delivery

**Steps**:
1. Login as brand
2. Complete engagement (mark delivered)
3. Click **"Write Review"** button
4. Fill modal:
   - Rating: 5 stars (click 5th star)
   - Comment: `Excellent work! Delivered ahead of schedule.`
5. Click **"Submit Review"**

**Expected**:
- ✅ Success toast: "Review submitted!"
- ✅ Modal closes
- ✅ Review appears on creator's profile immediately
- ✅ Creator's average rating updates

---

**Test Case**: Cannot review without hiring

**Steps**:
1. Login as brand
2. Navigate to creator profile (no prior engagement)
3. Attempt to submit review

**Expected**:
- ✅ **"Write Review"** button disabled or hidden
- ✅ Tooltip: "You can only review creators you've worked with"

---

**Test Case**: Cannot review twice

**Steps**:
1. Submit review (see above)
2. Attempt to submit another review for same engagement

**Expected**:
- ✅ Error toast: "You've already reviewed this creator"
- ✅ Submit button disabled

---

### 2. View Reviews (Public)

**Test Case**: See creator reviews

**Steps**:
1. Navigate to any creator profile
2. Scroll to **"Reviews"** section

**Expected**:
- ✅ Average rating displayed prominently (large number + stars)
- ✅ Total review count (e.g., "23 reviews")
- ✅ Individual reviews listed:
   - Brand name (or anonymous)
   - Star rating
   - Comment
   - Timestamp (e.g., "2 weeks ago")
- ✅ Reviews sorted by most recent first

---

## Verification Flow Tests

### 1. Request Verification (Creator)

**Test Case**: Submit verification request

**Steps**:
1. Login as creator
2. Navigate to own profile (`/creators/[myId]`)
3. Scroll to **"Verification"** section
4. Click **"Request Verification"** button
5. Fill modal:
   - Type: **Tools**
   - Evidence URL: `https://example.com/runway-proof.jpg`
6. Click **"Submit Request"**

**Expected**:
- ✅ Success toast: "Verification request submitted!"
- ✅ Status changes to "Pending" (yellow badge)
- ✅ Request appears in admin dashboard

---

### 2. Admin Review (Approve)

**Test Case**: Approve verification

**Steps**:
1. Login as admin (need admin account)
2. Navigate to `/admin/verifications`
3. See pending requests list
4. Click **"View Evidence"** → opens URL in new tab
5. Review evidence
6. Click **"Approve"** button
7. Fill admin notes: `Verified Runway Pro subscription screenshot`
8. Click **"Confirm"**

**Expected**:
- ✅ Success toast: "Verification approved!"
- ✅ Request removed from pending list
- ✅ Creator's profile updates:
   - Verified badge shown (green checkmark + pulse glow)
   - Evidence panel updated

---

**Test Case**: Reject verification

**Steps**:
1. Click **"Reject"** button
2. Fill admin notes: `Screenshot is unclear. Please provide recent proof.`
3. Click **"Confirm"**

**Expected**:
- ✅ Request status changes to "Rejected"
- ✅ Creator receives notification with admin notes
- ✅ Verified badge NOT shown on profile

---

## UI/Animation Tests

### 1. Homepage Hero

**Test Case**: Gradient animation

**Steps**:
1. Navigate to `/` (homepage)
2. Observe hero section

**Expected**:
- ✅ Animated gradient background (purple → indigo → teal, 10s loop)
- ✅ Particle background with ~30 floating orbs
- ✅ Hero heading fades in with gradient text
- ✅ CTA buttons have glow + scale on hover

---

### 2. Creator Card Animations

**Test Case**: Hover effects

**Steps**:
1. Navigate to `/creators`
2. Hover over any creator card

**Expected**:
- ✅ Gradient border animates (gradient-shift)
- ✅ Card lifts slightly (translateY -8px)
- ✅ Verified badge pulses with glow
- ✅ Avatar scales slightly (scale-105)
- ✅ **"View Profile"** overlay appears with backdrop-blur

---

### 3. Score Ring Animation

**Test Case**: Brief Intelligence score

**Steps**:
1. Generate brief with AI
2. Observe score ring on right sidebar

**Expected**:
- ✅ SVG circle animates from 0% to final score (e.g., 85%)
- ✅ Stroke-dashoffset transition (1.5s ease-out)
- ✅ Number counts up from 0 to 85
- ✅ Color changes based on score:
   - Green (>80)
   - Yellow (60-80)
   - Red (<60)

---

### 4. Confetti Effect

**Test Case**: Brief published

**Steps**:
1. Publish brief
2. Observe animation

**Expected**:
- ✅ Confetti explodes from center of screen
- ✅ ~50 particles with random colors (purple, pink, teal)
- ✅ Particles fall with gravity
- ✅ Animation completes in 3 seconds
- ✅ Confetti removed from DOM after animation

---

**Test Case**: Mark delivered

**Steps**:
1. Click **"✓ Mark Delivered"** button

**Expected**:
- ✅ Confetti explosion (same as above)

---

### 5. Typing Animation

**Test Case**: AI brief generation

**Steps**:
1. Generate brief with Gemini
2. Observe fields populating

**Expected**:
- ✅ Text appears with typing effect (react-type-animation)
- ✅ Cursor blinks during typing
- ✅ Speed: ~50 characters per second

---

### 6. Scroll Animations

**Test Case**: Fade-in on scroll

**Steps**:
1. Navigate to homepage
2. Scroll down to **"How It Works"** section

**Expected**:
- ✅ Section fades in when 30% visible (react-intersection-observer)
- ✅ Each step card slides up with stagger (0.1s delay between cards)
- ✅ Animation only plays once (not on every scroll)

---

### 7. Navbar Active Link

**Test Case**: Animated underline

**Steps**:
1. Navigate to `/creators`
2. Observe **"Discover"** link in navbar

**Expected**:
- ✅ Gradient underline appears (width 0 → 100%, 300ms)
- ✅ Underline color: purple-to-teal gradient
- ✅ Active link text is brighter

---

### 8. Notification Bell

**Test Case**: Pulse animation

**Steps**:
1. Login as creator
2. Receive unread message (see messaging tests)
3. Observe bell icon in navbar

**Expected**:
- ✅ Red badge appears with unread count
- ✅ Bell icon pulses (scale animation, 2s interval)
- ✅ After reading message, badge disappears and pulse stops

---

## Responsive Design Tests

Test on 5 viewports: **320px, 375px, 768px, 1024px, 1920px**

### 1. Mobile (320px - 375px)

**Test Case**: Homepage hero

**Expected**:
- ✅ Hero heading: text-3xl (scaled down from text-6xl)
- ✅ CTA buttons stack vertically
- ✅ Particle count reduced (10 instead of 30)
- ✅ No horizontal scroll

---

**Test Case**: Creator cards

**Expected**:
- ✅ Grid: 1 column
- ✅ Card width: 100% minus padding
- ✅ Avatar size: 60px (scaled down from 80px)
- ✅ Text: text-sm for bio

---

**Test Case**: Navbar

**Expected**:
- ✅ Logo centered
- ✅ Hamburger menu icon (3 lines) shown on right
- ✅ Desktop links hidden
- ✅ Click hamburger → slide-out drawer from right
- ✅ Drawer has all nav links stacked vertically

---

**Test Case**: Dashboard stats

**Expected**:
- ✅ Grid: 2x2 (2 columns, 2 rows)
- ✅ Stat cards: full width of column
- ✅ Font sizes reduced (text-2xl for number)

---

**Test Case**: Touch targets

**Expected**:
- ✅ All buttons: min 44x44px (iOS guideline)
- ✅ Links have adequate spacing (not overlapping)
- ✅ Form inputs: min height 48px

---

### 2. Tablet (768px)

**Test Case**: Creator cards

**Expected**:
- ✅ Grid: 2 columns
- ✅ Cards have more space (gap-6)
- ✅ Hover effects still work (for tablets with mouse)

---

**Test Case**: Dashboard stats

**Expected**:
- ✅ Grid: 4 columns (1 row)
- ✅ Stats side-by-side

---

### 3. Desktop (1024px - 1920px)

**Test Case**: Creator cards

**Expected**:
- ✅ Grid: 3-4 columns (depends on screen width)
- ✅ Full hover effects (gradient border, lift, overlay)

---

**Test Case**: Brief builder

**Expected**:
- ✅ Two-column layout: form on left, Brief Intelligence on right
- ✅ Split: 60% form, 40% sidebar

---

### 4. Ultra-wide (2560px+)

**Test Case**: Max-width constraint

**Expected**:
- ✅ Content max-width: 1920px
- ✅ Centered on screen with equal margins
- ✅ Background extends full width (gradient)

---

## Cross-Browser Tests

Test on: **Chrome, Firefox, Safari, Edge**

### 1. Chrome (Latest)

**Test All Core Flows**:
- ✅ Demo login
- ✅ Creator discovery
- ✅ Brief creation
- ✅ Messaging
- ✅ Animations smooth (60fps)

---

### 2. Firefox (Latest)

**Test**:
- ✅ All animations work
- ✅ Backdrop-blur supported (check glass effects)
- ✅ SVG animations (score rings)

---

### 3. Safari (macOS & iOS)

**Test**:
- ✅ Webkit-specific styles applied (-webkit-backdrop-filter)
- ✅ Touch events work (iOS)
- ✅ Scroll animations
- ✅ No visual glitches on glassmorphism

---

### 4. Edge (Latest)

**Test**:
- ✅ Same as Chrome (Chromium-based)
- ✅ No regressions

---

## Performance Tests

### 1. Lighthouse Audit

**Steps**:
1. Open homepage in Chrome
2. DevTools → Lighthouse
3. Run audit (Desktop, Performance)

**Expected**:
- ✅ Performance score: >85
- ✅ First Contentful Paint: <1.5s
- ✅ Largest Contentful Paint: <2.5s
- ✅ Time to Interactive: <3.5s
- ✅ Cumulative Layout Shift: <0.1

---

### 2. Animation Frame Rate

**Steps**:
1. Navigate to creator list
2. DevTools → Performance
3. Record while scrolling and hovering

**Expected**:
- ✅ Frame rate: 60fps (no drops below 50fps)
- ✅ No jank during scroll animations

---

### 3. Network Performance

**Steps**:
1. DevTools → Network
2. Load creator list
3. Observe requests

**Expected**:
- ✅ Total requests: <20
- ✅ Page load time: <2s (with cache)
- ✅ Images lazy-loaded (only above-the-fold images load initially)

---

### 4. Real-time Latency

**Steps**:
1. Send message from brand to creator
2. Measure time until creator receives

**Expected**:
- ✅ Latency: <500ms (same region)
- ✅ Latency: <2s (cross-region)

---

## Security Tests

### 1. Authentication Bypass

**Test Case**: Access protected route without login

**Steps**:
1. Logout
2. Navigate to `/dashboard`

**Expected**:
- ✅ Redirects to `/login` immediately
- ✅ No flash of dashboard content

---

### 2. Role-Based Access

**Test Case**: Creator cannot access brand-only route

**Steps**:
1. Login as creator
2. Navigate to `/briefs/new` (brand-only)

**Expected**:
- ✅ Error toast: "Access denied"
- ✅ Redirects to `/dashboard` or `/login`

---

### 3. SQL Injection Prevention

**Test Case**: Malicious input in search

**Steps**:
1. Navigate to `/creators`
2. Type in search: `' OR 1=1 --`

**Expected**:
- ✅ No SQL error
- ✅ Treated as literal string
- ✅ No results (or safe results)

---

### 4. XSS Prevention

**Test Case**: Script injection in message

**Steps**:
1. Send message: `<script>alert('XSS')</script>`

**Expected**:
- ✅ Script NOT executed
- ✅ Displayed as plain text: `<script>alert('XSS')</script>`
- ✅ React auto-escapes JSX

---

### 5. Password Security

**Test Case**: Password hashing

**Steps**:
1. Register new user
2. Check database (Supabase Table Editor → users table)

**Expected**:
- ✅ `password` field does NOT exist (stored in auth.users)
- ✅ `password_hash` is bcrypt hash (starts with `$2b$10$`)
- ✅ Hash length: 60 characters

---

### 6. Token Expiry

**Test Case**: Expired session

**Steps**:
1. Login
2. Manually set access token expiry to past (DevTools → Application → Cookies)
3. Refresh page

**Expected**:
- ✅ Auto-refresh using refresh_token
- ✅ If refresh fails: redirect to `/login`

---

## Accessibility Tests

### 1. Keyboard Navigation

**Test Case**: Tab through forms

**Steps**:
1. Navigate to `/login`
2. Press **Tab** key repeatedly

**Expected**:
- ✅ Focus moves through: Email → Password → Login Button → Demo Buttons
- ✅ Focus indicator visible (blue outline)
- ✅ No tab traps

---

### 2. Screen Reader

**Test Case**: Creator card announcements

**Steps**:
1. Use screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to `/creators`
3. Tab through creator cards

**Expected**:
- ✅ Announces: "Aryan Kapoor, AI Filmmaker, 95 dollars per hour, Verified, View Profile button"
- ✅ All images have alt text

---

### 3. Color Contrast

**Test Case**: WCAG AA compliance

**Steps**:
1. Use browser extension (e.g., WAVE)
2. Scan homepage

**Expected**:
- ✅ No contrast errors
- ✅ Text on dark backgrounds: contrast ratio >4.5:1
- ✅ Large text (>18px): contrast ratio >3:1

---

### 4. Reduced Motion

**Test Case**: Disable animations

**Steps**:
1. System Settings → Accessibility → Reduce Motion (enable)
2. Reload CineGen homepage

**Expected**:
- ✅ Complex animations disabled (particles, confetti, 3D tilt)
- ✅ Simple transitions remain (fade, opacity)
- ✅ Page still usable and visually cohesive

---

## Bug Tracking

### High Priority (Blockers)

- [ ] Authentication fails with valid credentials
- [ ] Real-time messaging not working
- [ ] Brief creation crashes app
- [ ] Database RLS blocking legitimate queries

### Medium Priority (Functional Issues)

- [ ] Search results incorrect
- [ ] Animations janky (low FPS)
- [ ] Mobile layout broken
- [ ] Images not loading from Supabase Storage

### Low Priority (UI/UX Polish)

- [ ] Toast notification z-index too low
- [ ] Hover effect inconsistent
- [ ] Minor text alignment issues
- [ ] Empty state copy needs improvement

---

## Test Coverage Summary

| Category | Tests | Pass | Fail | Pending |
|----------|-------|------|------|---------|
| Authentication | 12 | - | - | - |
| Creator Discovery | 8 | - | - | - |
| Brief Creation | 6 | - | - | - |
| Proposal Flow | 5 | - | - | - |
| Messaging | 4 | - | - | - |
| Reviews | 4 | - | - | - |
| Verifications | 3 | - | - | - |
| UI/Animations | 8 | - | - | - |
| Responsive | 8 | - | - | - |
| Cross-Browser | 4 | - | - | - |
| Performance | 4 | - | - | - |
| Security | 6 | - | - | - |
| Accessibility | 4 | - | - | - |
| **TOTAL** | **76** | **-** | **-** | **-** |

---

**Last Updated**: January 2024  
**Tested By**: QA Team  
**Version**: 2.0.0

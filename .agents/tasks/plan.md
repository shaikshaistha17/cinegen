# Implementation Plan: Change Password Feature

## Overview
Add a "Change Password" feature for authenticated users who want to update their password from the dashboard/settings area. This complements the existing "Forgot Password" flow and follows CREVO-style messaging patterns.

## Key Decisions

**Decision 1: Use `verifyPassword` helper**  
The codebase uses `verifyPassword(password, hash)` from `lib/auth-helpers.ts` for password comparison (confirmed by reading the file). This will be used to verify the current password before allowing a change.

**Decision 2: Place Change Password page at `/app/settings/password/page.tsx`**  
Following REST conventions for settings resources. The dashboard currently has no explicit settings section, so we'll add a navigation link in the dashboard's action area or as a standalone settings menu item.

**Decision 3: Match the split-screen auth page pattern**  
The login and forgot-password pages use a consistent pattern: left side = form card, right side = info/help card, both with `glass` styling, `border border-white/10`, motion animations, and violet/cyan gradient accents. The change password page will match this exactly.

**Decision 4: CREVO-style messaging**  
- Success: "Password updated successfully ✓" (green toast with checkmark)
- Error: Friendly messages like "Current password is incorrect" (not raw API errors)
- Use `toast` from `sonner` (already used throughout the app)

**Decision 5: Protected route with client-side redirect**  
Use `useSession` hook (already exists) to check if user is authenticated. If not, redirect to `/login`. No middleware change needed since this is a client component.

**Decision 6: Support both demo and real users**  
Demo accounts (@cinegen.demo) should see a friendly message that they cannot change their password (always `Demo@123`). Real Supabase users can change their password normally.

## Implementation Steps

### ✅ Step 1: Create the Change Password API endpoint

**What:** Create `app/api/settings/change-password/route.ts` that:
- Validates the authenticated session (JWT from Supabase or demo session)
- Verifies `currentPassword` against `password_hash` in the `users` table using `verifyPassword` from `lib/auth-helpers.ts`
- Returns 401 `{ error: 'Current password is incorrect' }` if mismatch
- Validates `newPassword`: min 8 chars, 1 uppercase, 1 number (same rules as reset-password)
- Calls `supabase.auth.updateUser({ password: newPassword })` to update in Supabase Auth
- Updates `password_hash` in the `users` table using `hashPassword` from `lib/auth-helpers.ts`
- Returns `{ message: 'Password updated successfully' }` on success

**Files:**
- `app/api/settings/change-password/route.ts` (create new)

**Verify:**
```bash
npm run dev
```
Test the endpoint manually with curl or Postman:
```bash
curl -X POST http://localhost:3000/api/settings/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-jwt-token>" \
  -d '{"currentPassword":"Demo@123","newPassword":"NewPass123"}'
```
Should return 200 with success message for valid credentials, 401 for wrong current password.

---

### ✅ Step 2: Create the Change Password page UI

**What:** Create `app/settings/password/page.tsx` with:
- Split-screen layout matching `/app/login/page.tsx` and `/app/auth/forgot-password/page.tsx`:
  - Left card: form with "Current Password", "New Password", "Confirm New Password" fields
  - Right card: password requirements checklist (reuse pattern from `app/auth/reset-password/page.tsx`)
- Protected route: `useSession` hook to check authentication; redirect to `/login` if not logged in
- Form validation: same requirements as reset-password (min 8 chars, 1 uppercase, 1 number, passwords match)
- Eye icons to toggle password visibility
- Submit button disabled until all validations pass
- Loading state during submission
- Success: show green toast "Password updated successfully ✓" and optionally redirect to dashboard
- Error: show red toast with friendly error message
- Demo account check: if user email ends with `@cinegen.demo`, show a notice that demo accounts cannot change passwords

**Files:**
- `app/settings/password/page.tsx` (create new)

**Verify:**
```bash
npm run dev
```
Navigate to `http://localhost:3000/settings/password`:
- Without login: should redirect to `/login`
- With demo login: should show form but display notice about demo accounts
- With real user login: should show form, validate inputs, and successfully change password

---

### ✅ Step 3: Add "Change Password" navigation link in dashboard

**What:** Modify `app/dashboard/page.tsx` to add a "Change Password" or "Settings" link:
- For Brand Dashboard: add a link in the stats/action area or below the primary action card
- For Creator Dashboard: add similarly placed link
- Link text: "⚙️ Account Settings" or "🔒 Change Password" pointing to `/settings/password`
- Match existing nav link styles (e.g., small text with hover transition)

**Alternative:** If the navbar already has a user menu/dropdown, add the link there instead. (Note: checking the dashboard code, there's no explicit user menu visible, so we'll add it to the dashboard page itself.)

**Files:**
- `app/dashboard/page.tsx` (modify)

**Verify:**
```bash
npm run dev
```
Login as brand or creator, navigate to dashboard, confirm the new link appears and points to `/settings/password`. Click it and verify you land on the change password page.

---

### ✅ Step 4: Update messaging in forgot-password page (optional UX polish)

**What:** Minor text improvements to match CREVO-style messaging in `app/auth/forgot-password/page.tsx`:
- After email sent: change "Check your email" text to "Check your email for a reset link ✉️"
- Error messages: ensure they are friendly (already looks good from reading the code, but confirm during testing)

**Files:**
- `app/auth/forgot-password/page.tsx` (modify text only)

**Verify:**
```bash
npm run dev
```
Navigate to `/auth/forgot-password`, submit a real email, confirm the success message shows the friendly text with email icon.

---

### ✅ Step 5: Update .env.example with SMTP comment (optional)

**What:** Add a comment block to `.env.example` documenting that Supabase sends password reset emails by default, and optionally users can configure custom SMTP in the Supabase dashboard if needed (no new env vars required in the app).

**Files:**
- `.env.example` (add comment only)

**Verify:**
Read `.env.example` to confirm the comment is clear and helpful for future contributors.

---

### ✅ Step 6: End-to-end test the full flow

**What:** Manually test the complete user journey:
1. Register a new user (real email, not demo)
2. Login with that user
3. Navigate to dashboard → click "Change Password"
4. Enter current password, new password (meeting requirements), confirm
5. Submit → verify success toast appears
6. Logout
7. Login again with the NEW password → should succeed
8. Login with the OLD password → should fail

**Files:** None (testing only)

**Verify:**
All steps above pass successfully. Password change persists across sessions. Error messages are friendly and actionable.

---

## File Summary

**Files to Create:**
- `app/api/settings/change-password/route.ts` — API endpoint
- `app/settings/password/page.tsx` — Change password UI

**Files to Modify:**
- `app/dashboard/page.tsx` — Add "Change Password" link
- `app/auth/forgot-password/page.tsx` — Polish messaging (optional)
- `.env.example` — Add SMTP documentation comment (optional)

**Files to Read (for patterns):**
- `lib/auth-helpers.ts` — Use `verifyPassword` and `hashPassword`
- `app/login/page.tsx` — Match split-screen layout pattern
- `app/auth/reset-password/page.tsx` — Reuse password requirements UI
- `app/auth/forgot-password/page.tsx` — Match messaging style

## Build & Test Commands

- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Lint check:** `npm run lint`

No dedicated test framework is configured in `package.json`, so verification is manual testing using the dev server.

## Notes

- The app uses `sonner` for toast notifications (already imported in all auth pages)
- All auth pages use Framer Motion for animations
- Password hashing uses bcryptjs with 10 salt rounds
- Supabase handles JWT sessions; demo sessions use a local fallback in `useSession`
- Demo accounts cannot reset or change passwords (always `Demo@123`)

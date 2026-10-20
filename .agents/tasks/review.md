# Change Password Feature with Session-Based Auth

Adds a password change feature accessible from the dashboard, allowing authenticated users to update their password by verifying their current password first. The implementation blocks demo accounts from changing passwords and maintains dual-database password storage (Supabase Auth + users table).

The API endpoint verifies the current password against the stored hash, validates the new password format (8+ characters, uppercase, number), updates Supabase Auth, and syncs the hash to the users table. The UI redirects unauthenticated users to login, displays real-time validation feedback, and follows the existing auth page design pattern with glassmorphic cards and gradient accents.

**Watch for:** Missing atomic transaction guarantees between Supabase Auth and users table updates **(confirmed)**, no test coverage for the new feature **(confirmed)**, password validation logic duplicated between client and server **(confirmed)**.

**Verdict**: CHANGES_REQUESTED

## High-level view

The password change flow requires three inputs (current, new, confirm) and validates the current password by fetching the hash from the users table and comparing with bcrypt. The API updates Supabase Auth first, then the users table hash separately—no transaction wraps them, so Auth could succeed while the table update fails, creating inconsistent state.

Demo accounts are blocked at both UI and API levels by checking the @cinegen.demo domain suffix. The new password must meet the same requirements as registration: 8 characters, uppercase letter, number.

The Change Password page lives at /settings/password and matches the visual style of forgot-password and login pages: two-column layout, glassmorphic cards, real-time validation with checkmarks, CREVO-style informational messages. The dashboard adds a "Change Password" link in both brand and creator views.

Session protection happens via the useSession hook—the page redirects to /login if no session is found. The API checks `supabase.auth.getUser()` and returns 401 if not authenticated.

<details>
<summary>Issues (4)</summary>

1. **Dual password update not atomic** — Supabase Auth and users table are updated in separate operations. If the second fails, Auth has the new password but the table still has the old hash. Wrap in a transaction or add compensating rollback logic.

2. **No test coverage** — The change-password API route and settings/password page have no automated tests. Add tests for: current password verification, new password validation, demo account blocking, unauthenticated access, Auth/table sync failure scenarios.

3. **Password validation duplicated** — The same regex patterns (`/[A-Z]/`, `/\d/`) and length check (8 characters) exist in both the UI (page.tsx) and API (route.ts). Extract to a shared validation utility to ensure consistency.

4. **Error message leaks database structure** — The API returns "User not found in database" when the users table query fails. This reveals that password hashes are stored separately from Supabase Auth. Use a generic message like "Failed to verify current password".

</details>

<details>
<summary>Details</summary>

## Dual-database password storage creates sync risk

The change-password API updates two password stores: Supabase Auth (via `supabase.auth.updateUser({ password })`) and the local users table (via `supabase.from('users').update({ password_hash })`). These operations run sequentially without a transaction:

```typescript
// Update password in Supabase Auth
const { error: updateError } = await supabase.auth.updateUser({
  password: newPassword,
});

if (updateError) {
  // Auth update failed, return early
  return NextResponse.json({ error: ... }, { status: 400 });
}

// Update password hash in users table to stay in sync
const newPasswordHash = await hashPassword(newPassword);
const { error: tableError } = await supabase
  .from('users')
  .update({ password_hash: newPasswordHash, updated_at: ... })
  .eq('id', user.id);

if (tableError) {
  // Table update failed, but Auth already has new password
  return NextResponse.json({ error: 'Failed to complete password update' }, { status: 500 });
}
```

If the Auth update succeeds but the table update fails (network blip, database constraint, permissions issue), Supabase Auth accepts the new password at login while the users table still has the old hash. This breaks any code path that checks `password_hash` directly (e.g., current password verification for future changes).

The failure mode is asymmetric: Auth is authoritative for login, but the table hash becomes stale. A user who hits this edge case can log in with the new password but cannot change their password again (current password verification will fail against the stale hash).

Supabase doesn't expose database-level transactions across Auth and table operations. Options: (1) accept the risk and add compensating logic (detect stale hash, force re-sync), (2) make the users table hash read-only and derive it from Auth on demand (requires Auth API access), or (3) add idempotent retry logic for the table update.

## Current password verification trusts the users table hash

The API fetches `password_hash` from the users table and verifies the submitted current password with bcrypt:

```typescript
const { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('password_hash')
  .eq('id', user.id)
  .single();

// ...

const isValidPassword = await verifyPassword(currentPassword, userData.password_hash);
```

This assumes the users table hash is in sync with Supabase Auth. If they diverge (see issue above), the user cannot change their password even if they know the correct Auth password.

The 404 error path ("User not found in database") reveals implementation details: it tells an attacker that password hashes are stored separately from Auth. Replace with a generic 401 error ("Failed to verify current password").

## Demo account blocking at both layers

The UI disables form inputs and shows a warning banner for demo accounts (email ends with `@cinegen.demo`). The API duplicates this check and returns 403. The 403 response includes the hardcoded demo password (`Demo@123`) in the error message—not a security issue (demo accounts are public knowledge) but the password appears in API responses and browser network logs.

## Password validation duplicated between client and server

The UI and API both validate the new password format:

**UI (page.tsx):**
```typescript
const hasMinLength = newPassword.length >= 8;
const hasUppercase = /[A-Z]/.test(newPassword);
const hasNumber = /\d/.test(newPassword);
```

**API (route.ts):**
```typescript
if (newPassword.length < 8) {
  return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
}

const hasUppercase = /[A-Z]/.test(newPassword);
const hasNumber = /\d/.test(newPassword);

if (!hasUppercase || !hasNumber) {
  return NextResponse.json({ error: 'New password must contain at least 1 uppercase letter and 1 number' }, { status: 400 });
}
```

If requirements change (e.g., add special character requirement), both locations need updates. Extract to a shared utility (`lib/password-validation.ts`) that exports a `validatePassword` function returning `{ valid: boolean; errors: string[] }`.

## Session protection redirects unauthenticated users

The page uses the `useSession` hook to redirect unauthenticated users to /login via a `useEffect` that checks `!session && !sessionLoading`. The API separately checks `supabase.auth.getUser()` and returns 401 if no user is found. The double-check is appropriate: the UI redirect is UX polish, the API check is the security boundary.

One gap: the page briefly renders before the redirect fires (the useEffect runs after mount). An attacker with DevTools open could see the form HTML. Not a practical exploit (the API blocks submission), but the page could show a loading spinner instead of the full form until `sessionLoading` completes.

## UI matches CREVO-style auth page patterns

The Change Password page follows the same two-column layout as forgot-password and login: form on the left, requirements on the right, glassmorphic cards with `border-white/10`, gradient accent blobs, violet-to-cyan color scheme. Real-time validation feedback: checkmarks turn green as requirements are met, the submit button stays disabled until all criteria pass. The "Forgot your current password?" info box links to the forgot-password flow.

Success state: a green banner appears above the form for 3 seconds after a successful update, the form clears, and a toast notification confirms the change. The user stays on the page (not redirected).

## Dashboard integration adds password change link

Both dashboard views now include a "🔒 Change Password" link. The brand dashboard adds it below the header (right-aligned), the creator dashboard adds it next to the welcome message (inline flex). The placement is slightly inconsistent but both are visible and accessible.

## No test coverage for the new feature

The change-password API route and settings/password page have no automated tests. No test files exist in the project at all.

Critical scenarios not tested:

**API route:**
- Current password incorrect → 401
- New password too short, missing uppercase, missing number → 400
- Demo account attempts change → 403
- Unauthenticated request → 401
- Successful password change → 200, both Auth and users table updated
- Auth update succeeds but table update fails → failure mode unchecked

**UI page:**
- Unauthenticated user redirected to /login
- Demo account shows warning banner and disables form
- Real-time validation: checkmarks appear as requirements met
- Submit button disabled until all criteria pass
- Success and error states render correctly

The build passes with no type errors. Functional correctness needs tests.

## .env.example documents SMTP configuration

The .env.example file adds a comment block explaining that Supabase handles password reset emails automatically, and that custom SMTP can be configured in the Supabase dashboard for production. No new environment variables are required for this feature.

</details>

## File map

<details>
<summary>8 files changed</summary>

- `.agents/tasks/email-review.json` — updated verdict from CHANGES_REQUESTED to APPROVED (previous review iteration)
- `.agents/tasks/plan.md` — plan document updated (869 lines removed, agent workflow artifact)
- `.env.example` — added SMTP configuration documentation comment
- `app/api/settings/change-password/route.ts` — new API endpoint for password changes (120 lines)
- `app/auth/forgot-password/page.tsx` — minor: fixed import formatting
- `app/dashboard/page.tsx` — added "Change Password" links to brand and creator dashboard views
- `app/settings/password/page.tsx` — new Change Password page with two-column layout (326 lines)

Full diff: `git diff HEAD~1`

</details>

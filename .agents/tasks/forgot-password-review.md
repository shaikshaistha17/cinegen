# Forgot Password Flow with Supabase Auth

Adds complete password reset functionality to CineGen using Supabase Auth's built-in email-based reset flow. Users can click "Forgot password?" on the login page, receive a magic link via email, and set a new password through a guided UI with real-time validation. The implementation blocks demo accounts from resetting passwords and maintains visual consistency with the existing glassmorphism design system.

**Watch for:** Demo account detection uses substring matching on the email field (confirmed), which could false-positive on legitimate emails containing "demo" (likely). Token verification relies entirely on Supabase's automatic session validation without explicit expiry checks (confirmed). Password hash sync to the users table fails silently (confirmed), which could cause login issues if the Supabase Auth update succeeds but table update fails.

**Verdict**: NEEDS_CHANGES

## High-level view

The flow introduces two new routes and three API endpoints. The forgot-password page accepts an email, checks for demo accounts client-side, and calls Supabase's resetPasswordForEmail to send a magic link. The reset-password page displays password requirements with real-time checkmarks, validates on submission, and redirects to login on success. Both pages use the same two-column grid layout as login/register with glassmorphism cards and violet-cyan gradients.

Demo account handling blocks password resets by checking if the email includes "@cinegen.demo" or "demo" anywhere in the address. This prevents demo accounts from triggering email sends but doesn't handle edge cases like legitimate users with "demo" in their email.

Token handling delegates entirely to Supabase. The reset-password API calls `supabase.auth.getUser()` to verify the session established by the magic link. There's no explicit expiry check beyond what Supabase enforces (1 hour by default). If the link expires, getUser returns an error and the user sees "Invalid or expired reset link."

Password persistence updates both Supabase Auth (via updateUser) and the users table (via direct update). The table update wraps in a try-catch and logs errors but continues if it fails, which could desync the two password stores.

The UI matches existing auth pages: split-screen layout with form on the left and contextual info on the right, real-time validation indicators (green checkmarks for met requirements, gray X for unmet), loading states on buttons, toast notifications for errors and success. The forgot-password page shows a success state after submission instead of immediately showing a toast and clearing the form.

Documentation covers Supabase email template configuration, redirect URL setup, environment variables, and two testing approaches (with SMTP or by manually constructing tokens). The demo account constraint is documented in the forgot-password page UI and in SETUP.md.

<details>
<summary>Issues (5)</summary>

1. **Overly broad demo detection** — Checking `email.toLowerCase().includes('demo')` will false-positive on legitimate emails like "demonstration@company.com" or "democorp@example.org". Use exact domain match: `email.toLowerCase().endsWith('@cinegen.demo')`.

2. **Silent password hash sync failure** — If Supabase Auth password update succeeds but the users table update fails, the user can log in via Supabase but any direct database password checks will use the old hash. Either fail the entire operation if the table update fails, or remove the table update entirely and rely only on Supabase Auth.

3. **No explicit token expiry surface** — The reset-password page has no logic to detect token expiry before submission. If the user lands on the page with an expired token, they won't know until they fill out the form and click submit. Check `supabase.auth.getUser()` on page load and show an error state immediately if the session is invalid.

4. **Missing NEXT_PUBLIC_BASE_URL fallback warning** — The forgot-password API falls back to `http://localhost:3000` if NEXT_PUBLIC_BASE_URL is unset, but production deployments without this variable will send reset links pointing to localhost. Add a warning log or fail the request in production if the variable is missing.

5. **Password validation discrepancy** — The reset-password page validates 8+ chars, uppercase, and number. The API enforces the same. But nowhere is it validated whether this matches the password requirements enforced during registration. Confirm that register uses the same rules, or document why reset has stricter requirements.

</details>

<details>
<summary>Details</summary>

## Supabase Auth integration via magic links

The forgot-password API accepts an email, validates format with a regex, and calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`. The redirectTo URL is constructed from `process.env.NEXT_PUBLIC_BASE_URL` with `/auth/reset-password` appended. The reset-password API then calls `supabase.auth.getUser()` to retrieve the authenticated user and `supabase.auth.updateUser({ password })` to change their password.

Token generation, email delivery, verification, and expiry are delegated to Supabase. The 1-hour expiry mentioned in the UI comes from Supabase's default configuration, not from any code in this PR. If the link expires, `getUser()` returns an error, and the API responds with "Invalid or expired reset link."

The forgot-password API returns the same message regardless of whether the email exists ("If an account exists with this email, you will receive a password reset link"), preventing email enumeration attacks.

## Demo account blocking at submission time

The forgot-password page checks `email.toLowerCase().includes('@cinegen.demo') || email.toLowerCase().includes('demo')` before calling the API. If true, it shows a toast: "Password reset not available for demo accounts. Demo password is always Demo@123" and exits without making the request. Detection happens entirely client-side with no server-side enforcement.

The substring check on "demo" is broader than necessary. It will block emails like "demo@legitcompany.com" or "democracy@example.org". The @cinegen.demo check is precise, but the second clause should be removed or replaced with an exact domain match.

## Password validation with real-time UI feedback

The reset-password page computes four boolean flags from the password and confirmPassword state:

- `hasMinLength = password.length >= 8`
- `hasUppercase = /[A-Z]/.test(password)`
- `hasNumber = /\d/.test(password)`
- `passwordsMatch = password === confirmPassword && password.length > 0`

These drive the checkmark/X icons next to each requirement in the right-hand card. The submit button is disabled unless `isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch`. The API enforces the same rules. Frontend and backend validation logic matches.

## Dual password persistence to Auth and users table

The reset-password API updates the password in two places:

1. `await supabase.auth.updateUser({ password })` — Updates Supabase Auth's internal password store
2. `await supabase.from('users').update({ password_hash: await hashPassword(password), updated_at })` — Updates the users table

The table update is wrapped in a try-catch. If it fails, the error is logged and the function continues, returning success. The comment says "auth password is updated, table update is secondary."

This creates a desync risk. If Supabase Auth succeeds but the table update fails, the user can log in via `supabase.auth.signInWithPassword`, but any code that checks password_hash directly in the users table will see the old hash. The login flow (from prior commits) uses Supabase Auth for regular users, so the desync might not break login, but it breaks the assumption that password_hash in the table reflects the current password.

The safer approach is either to fail the entire operation if the table update fails (remove the try-catch and let the error propagate), or to remove the table update entirely and rely only on Supabase Auth as the source of truth for passwords. The current behavior papers over the failure silently, which could lead to confusing states where a user reports "I reset my password but it doesn't work" (if they're hitting a code path that checks the table).

## Split-screen layout and glassmorphism consistency

Both new pages use a two-column `lg:grid-cols-2` layout with `glass rounded-2xl border border-white/10` classes, matching the login and register pages. The forgot-password page shows a stepped flow on the right ("What happens next?" with numbered steps) and switches the left card to a success state after submission. The reset-password page shows "Password requirements" on the right with real-time checkmarks and replaces the entire page with a centered success screen after completion. The setTimeout redirect is hardcoded to 2 seconds.

## Documentation for Supabase email setup

SETUP.md adds a "Password Reset Flow" section before "Troubleshooting". It explains the 7-step user flow, Supabase email template configuration (Authentication → Email Templates, ensure redirect URL is `{{ .SiteURL }}/auth/reset-password`), URL configuration (add the reset page URL to Authentication → Redirect URLs for both local and production), and the NEXT_PUBLIC_BASE_URL environment variable requirement. It provides two testing approaches: with SMTP (test the full flow) and without SMTP (manually construct a token in the Supabase dashboard).

## "Forgot password?" link placement on login page

The link appears below the password field, right-aligned via `flex justify-end`. The styling is `text-sm text-violet-400 hover:text-violet-300 transition-colors`, matching other tertiary links in the auth UI. The link navigates to `/auth/forgot-password`.

</details>

<details>
<summary>File map</summary>

- `app/login/page.tsx` — Added "Forgot password?" link below password field
- `app/auth/forgot-password/page.tsx` — New page: email input form with success state and demo account blocking
- `app/auth/reset-password/page.tsx` — New page: password and confirm fields with real-time validation UI
- `app/api/auth/forgot-password/route.ts` — New API route: calls Supabase resetPasswordForEmail
- `app/api/auth/reset-password/route.ts` — New API route: validates password, updates Supabase Auth and users table
- `SETUP.md` — Added "Password Reset Flow" section with configuration and testing instructions
- `.agents/tasks/forgot-password-plan.md` — Implementation plan file (not production code)

Full diff: `git show 77ff545`

</details>

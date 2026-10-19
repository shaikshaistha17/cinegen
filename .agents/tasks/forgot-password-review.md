# Forgot Password Security Fixes

Second pass addressing five security and reliability concerns from the initial implementation. The fixes tighten demo account detection to exact domain matching, enforce mandatory password hash synchronization between Supabase Auth and the users table, add upfront token expiry validation on the reset page, block production deployments without proper base URL configuration, and document the intentional password strength discrepancy between registration and reset flows.

**Watch for:** None. All blocking concerns from the first review are resolved. Demo detection no longer false-positives on legitimate emails containing "demo" (confirmed). Password desync is prevented by failing the reset if table update fails (confirmed). Token expiry is surfaced immediately on page load via `supabase.auth.getUser()` check (confirmed). Production misconfiguration is caught and returns 500 before sending reset emails (confirmed). Password validation differences are documented as intentional security design (confirmed).

**Verdict**: APPROVED

## High-level view

The five fixes map to the five prior concerns. Demo detection changed from substring match to `email.toLowerCase().endsWith('@cinegen.demo')`, eliminating false positives on emails like "democracy@example.org". Password hash table sync no longer swallows errors; if the Supabase Auth update succeeds but the users table update fails, the API returns 500 and instructs the user to retry. The reset-password page now runs `supabase.auth.getUser()` in a useEffect on mount and renders an expiry error screen with "Request a new link" CTA if the token is invalid. The forgot-password API checks `NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BASE_URL` and returns 500 with "Server configuration error" to prevent production deployments from sending localhost links. SETUP.md documents that reset enforces stricter password rules (8 chars, uppercase, number) than registration (6 chars, no complexity) as an intentional security upgrade during the sensitive reset flow.

<details>
<summary>Details</summary>

## Demo detection tightened to exact domain match

Changed from `email.toLowerCase().includes('@cinegen.demo') || email.toLowerCase().includes('demo')` to `email.toLowerCase().endsWith('@cinegen.demo')`. The original logic would block "democracy@example.org" or "demonstration@company.com". The new check only blocks emails ending with the exact demo domain. The comment now says "(exact domain match only)" for clarity.

## Password hash sync made mandatory

The reset-password API originally wrapped the users table update in a try-catch and logged failures without propagating them. The comment said "auth password is updated, table update is secondary." The fix removes the try-catch and returns a 500 error if `tableError` is truthy: "Failed to complete password reset. Please try again."

This prevents the desync scenario where Supabase Auth holds the new password but the users table still has the old hash. The desync was low-risk in practice (CineGen's login flow uses Supabase Auth signInWithPassword, not direct table checks), but the table hash could mislead any code inspecting password_hash directly. Failing the operation ensures both stores stay consistent or neither updates.

## Token expiry surfaced on page load

The reset-password page adds a useEffect that runs on mount. It calls `createClient().auth.getUser()` and checks for an error or missing user. If either condition is true, it sets `tokenError` state to true and shows a toast. Three state flags control the render tree:

- `checkingToken = true` during the async check → shows a centered spinner with "Verifying reset link..."
- `tokenError = true` after check fails → shows a centered error screen with AlertCircle icon, "Reset link expired" heading, explanation text, and "Request a new link" button linking to `/auth/forgot-password`
- `success = true` after password reset completes → shows the existing success screen with checkmark and redirect countdown

If `checkingToken` or `tokenError` are true, the main form never renders. Users with expired tokens see the error immediately instead of filling out the form and discovering the problem on submit.

## Production deployment guard for base URL

The forgot-password API constructs the reset link from `process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'`. Before calling Supabase, it checks `!process.env.NEXT_PUBLIC_BASE_URL && process.env.NODE_ENV === 'production'`. If true, it logs a CRITICAL error ("Reset links will point to localhost") and returns 500 with "Server configuration error. Please contact support."

This catches misconfigured production deployments at runtime. The fallback to localhost is safe for local dev but would break production resets. The check ensures the API fails fast instead of sending broken links to users.

## Password validation discrepancy documented

SETUP.md adds a "Password Requirements" subsection under "Password Reset Flow". It states that registration requires minimum 6 characters with no complexity rules, while reset requires 8+ characters, 1 uppercase, and 1 number. The note explains this is intentional: "The current design prioritizes security by requiring stronger passwords during the security-sensitive reset flow."

It offers two options for teams that want consistency: either upgrade registration validation to match reset, or relax reset validation to match registration. This resolves the "likely" concern from the first review by confirming the discrepancy is deliberate design, not oversight.

## Verification evidence

The commit message states "Verification: npm run build - 0 errors, all routes compiled." The plan file (forgot-password-plan.md) was updated with completion checkmarks for all tasks, and build evidence is documented inline. No test suite was run because the project has no automated tests for auth flows (manual testing only, per prior context).

</details>

<details>
<summary>File map</summary>

- `app/auth/forgot-password/page.tsx` — Changed demo detection to exact domain match
- `app/api/auth/forgot-password/route.ts` — Added production base URL check, returns 500 if missing
- `app/api/auth/reset-password/route.ts` — Removed try-catch around table update, now fails if table update fails
- `app/auth/reset-password/page.tsx` — Added token expiry check on mount with error UI
- `SETUP.md` — Documented password validation differences as intentional design

Full diff: `git diff 77ff545..0a393b6`

</details>

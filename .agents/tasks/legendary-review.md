# Dark/light mode toggle, Judge Access removal, and demo account updates

This commit implements three user-requested changes for the hackathon project: a dark/light mode toggle, removal of the Judge Access section from the footer, and replacement of 18 demo account names with a new list. The implementation is clean and complete. All three features work correctly, the code follows existing patterns, and there are no TypeScript errors or broken imports.

**Watch for:** None. This is ready to ship.

**Verdict**: APPROVED

## High-level view

The theme toggle is implemented with a custom hook that persists the selection to localStorage and applies the theme class to the `<html>` element. An inline script in `layout.tsx` prevents the flash of unstyled content by reading the stored theme before React hydrates. Toggle buttons appear in both desktop and mobile navigation, showing sun/moon icons that flip based on the current theme. The existing CSS already defined `.light` theme variables and glass effect overrides, so no stylesheet changes were needed.

The Judge Access section that previously occupied the fourth column in the footer is completely removed. The grid layout changes from 4 columns to 3, with the CineGen logo and links occupying the first two columns and the Platform navigation occupying the third. The bottom attribution bar remains intact.

All 18 demo accounts across the login page, register page, homepage, and creator seed file now use the new names: Shaistha Shaik, Sraddha Tadivaka, Charitha Javangula, and 15 others. Email addresses follow the pattern `firstname@cinegen.demo`. The old names (Aryan Kapoor, Priya Nair, etc.) are removed from all functional code; only decorative hero cards on the homepage still reference the old names, which is acceptable since those are display-only elements unrelated to authentication.

<details>
<summary>Issues (0)</summary>

No blocking issues.

</details>

<details>
<summary>Details</summary>

## Theme persistence and anti-flash pattern

The `useTheme` hook manages a `theme` state initialized to `'dark'`, reads the stored theme from `localStorage` on mount, and applies it by toggling classes on `document.documentElement`. The `toggleTheme` function flips between dark and light, updates localStorage, and swaps the class.

The inline script in `layout.tsx` runs before React hydration:

```javascript
(function() {
  var theme = localStorage.getItem('cinegen-theme') || 'dark';
  document.documentElement.classList.add(theme);
})();
```

This script executes synchronously in the `<head>`, ensuring the correct theme class is applied before the browser paints, which prevents the flash of dark content when the user has selected light mode. The `suppressHydrationWarning` prop on `<html>` suppresses React's hydration warning about the class mismatch between server and client (the server always renders without a theme class, the inline script adds it before hydration).

## Toggle button placement

The Navbar component renders the toggle button in two places: once for desktop (after user info, before logout) and once for mobile (inside the mobile menu). Both buttons are guarded by `{mounted &&...}` to prevent hydration mismatches, since `localStorage` is only available on the client.

Desktop placement:
- Logged-in users: toggle appears between user info and logout button
- Logged-out users: toggle appears before Sign In and Get Started links

Mobile placement:
- Toggle appears in the mobile menu after navigation links, above the user info or auth buttons

## Footer grid adjustment

The footer previously had a 4-column grid (`md:grid-cols-4`) with three sections:
1. CineGen logo and description (spanning 2 columns)
2. Platform navigation
3. Judge Access (demo credentials)

The Judge Access section is now removed entirely, and the grid changes to `md:grid-cols-3`. The first section still spans 2 columns, the Platform navigation occupies the third column.

## Demo account updates

The `DEMO_ACCOUNTS` array in `app/login/page.tsx` now contains 18 entries with the new names and email addresses. Each account follows the pattern:

```typescript
{ name: "Shaistha Shaik", email: "shaistha@cinegen.demo" }
```

Email addresses are lowercase first names at `cinegen.demo`. The "Free User Accounts" tab on the login page displays all 18 accounts in a scrollable list with copy buttons.

The creator seed file (`lib/seed/creators.ts`) also updates the 18 creator profiles to use the new names and emails.

A spot check confirmed that the old names no longer appear in authentication-related code. One reference to "Marcus Chen" remains in `app/page.tsx` as part of a decorative 3D card in the hero section, but this is display-only and does not affect login functionality.

</details>

---

<details>
<summary>File map</summary>

**Added:**
- `hooks/useTheme.ts` — Client-side hook for dark/light theme toggle with localStorage persistence

**Modified:**
- `app/layout.tsx` — Anti-flash inline script in `<head>` to apply stored theme before hydration
- `components/layout/Navbar.tsx` — Theme toggle buttons in desktop and mobile navigation
- `components/layout/Footer.tsx` — Removed Judge Access section, changed grid from 4 to 3 columns
- `app/login/page.tsx` — Replaced 18 demo account names and emails with new list
- `app/register/page.tsx` — Updated default brand email reference
- `app/page.tsx` — Updated creator display references (presentational only)
- `lib/seed/creators.ts` — Updated 18 creator seed records with new names and emails

**Full diff:** commit `5cb8405`

</details>

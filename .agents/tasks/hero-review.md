# Accessibility improvements for hero section animations

This review iteration addresses the accessibility and performance concerns from the initial hero section enhancement. The changes add comprehensive reduced motion support, improve gradient text contrast on mobile, and properly mark decorative elements for screen readers.

The hero section received a new `useReducedMotion` hook that detects the user's motion preference and conditionally disables all animations: parallax scroll on 3D cards, floating badge drift, mesh gradient orb movement, geometric shape rotation, tool logo animations, and SVG path drawing. The gradient text received lighter colors on mobile viewports (violet-300/cyan-300) to improve contrast against dark backgrounds. Decorative SVG elements and tool logo containers now have `aria-hidden="true"` to prevent screen reader announcement.

**Watch for:** CTA buttons lack visible focus states (**confirmed** — no `focus-visible:` classes on hero CTAs at lines 195-206 in page.tsx), 3D card hover animations create accessibility trap (**likely** — cards use `cursor-pointer` and `whileHover` but aren't keyboard-accessible), gradient text contrast improvement may need verification on actual devices (**possible** — CSS changes are correct but real-world OLED testing recommended).

**Verdict**: CHANGES_REQUESTED

## High-level view

The reduced motion implementation is thorough and correctly applied across all animated components. Every animation checks the `prefersReducedMotion` hook and passes an empty object to framer-motion's `animate` prop when motion should be disabled. The CSS media query provides a global safety net. The gradient text contrast fix uses appropriate lighter shades on mobile and reduces drop-shadow intensity, which should improve legibility on small screens with OLED displays. The `aria-hidden` attributes are placed correctly on the decorative SVG roots and the floating decorations container.

The CTA buttons in the hero section use hover effects but have no keyboard focus styling, which creates a WCAG 2.4.7 (Focus Visible) failure. Users navigating by keyboard won't see which button is focused. The 3D creator cards present as interactive (`cursor-pointer`, hover tilt) but are purely decorative — they're divs, not links or buttons, so keyboard users can't reach them. This is acceptable if they're truly decorative, but the cursor styling suggests interactivity.

The implementation preserved all existing functionality. Build verification passed, all imports resolve, and the verification notes confirm the hero layout, CTAs, and animations work as intended. The changes don't introduce regressions to the visual design or mobile responsiveness that was implemented in the initial pass.

<details>
<summary>Issues (3)</summary>

1. **CTA button focus states missing** — Add `focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none` to both CTA buttons at lines 195-206 in page.tsx. This is a WCAG 2.4.7 Level AA violation.

2. **3D cards have cursor-pointer but no keyboard accessibility** — Either remove `cursor-pointer` from Hero3DCreatorCard.tsx line 43 if cards are purely decorative, or wrap them in semantic interactive elements if they should be clickable. The `whileHover` effect combined with pointer cursor creates false affordance.

3. **Gradient text contrast needs real-device verification** — The CSS changes use violet-300 (#c4b5fd) and cyan-300 (#67e8f9) on mobile, which should provide adequate contrast, but OLED screens with true black backgrounds can behave unexpectedly. Test on actual iPhone/Android device before final approval to confirm readability.

</details>

<details>
<summary>Details</summary>

## Reduced motion implementation is comprehensive

The `useReducedMotion` hook correctly detects the `prefers-reduced-motion: reduce` media query using `window.matchMedia` and sets up a change listener that updates state when the preference changes. The hook is imported and used in all five animated components: `Hero3DCreatorCard`, `HeroFloatingBadge`, `HeroMeshGradient`, `HeroAnimatedLines`, and the main `page.tsx`.

Each animation checks the hook result and conditionally passes either an empty object or the animation configuration to framer-motion's `animate` prop:

```tsx
animate={prefersReducedMotion ? {} : { y: [0, -15, 0] }}
```

This pattern is applied to parallax transforms, Y-axis oscillations, mesh orb movement, geometric shape rotations, and SVG `pathLength` animations. The CSS media query in `globals.css` provides a global fallback that sets `animation-duration: 0.01ms` and `animation-iteration-count: 1`, and explicitly disables the three CSS-based animations (`animate-float-slow`, `animate-gradient-shift`, `animate-pulse-slow`).

## CTA buttons have no focus states

The two hero CTA buttons at lines 195-206 in `page.tsx` use hover effects (`hover:from-violet-500`, `hover:scale-105`, `hover:bg-white/5`) but have no `focus-visible:` classes. When a keyboard user tabs to these buttons, there's no visible indication of focus beyond the browser's default outline, which is often suppressed by CSS resets.

This is a WCAG 2.4.7 (Focus Visible, Level AA) violation. The fix is to add focus-visible ring utilities:

```tsx
className="... focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
```

The primary CTA already has prominent visual weight (gradient background, glow shadow), so the focus ring should be cyan or white to provide contrast. The secondary "Browse Creators" button with glass styling would use a violet ring matching the primary action color.

## 3D cards present false interactivity affordance

The `Hero3DCreatorCard` component includes `cursor-pointer` on line 43 and a `whileHover` animation that scales and tilts. These signals suggest the cards are interactive, but they're plain `div` elements with no click handler, no link, and no semantic role.

If the cards are purely decorative (the plan describes them as visual richness, not functionality), remove the `cursor-pointer` class. If they should link somewhere, wrap them in a `Link` or `button` element and make them keyboard-focusable.

## Gradient text contrast improvement is correct but untested

The changes to `.gradient-text-enhanced` in `globals.css` use lighter gradient colors on mobile:
- Desktop: `#a78bfa` (violet-400) to `#22d3ee` (cyan-500)  
- Mobile: `#c4b5fd` (violet-300) to `#67e8f9` (cyan-300)

Violet-300 has ~82% lightness and cyan-300 is ~78%, both significantly lighter than the original violet-600 (~58%). Against pure black, these should exceed WCAG AA's 3:1 requirement for large text (the "AI creators" headline is 5xl = ~48px).

Gradient text is difficult to evaluate algorithmically because contrast varies across the gradient, and the `drop-shadow` filter adds a purple glow that can reduce perceived contrast. The CSS change is sound in principle, but the verification notes don't confirm mobile device testing.

## Decorative elements properly hidden from screen readers

The `aria-hidden="true"` attribute is correctly added to the root `<svg>` in `HeroMeshGradient.tsx` (line 67), the root `<svg>` in `HeroAnimatedLines.tsx` (line 14), and the parent `<div>` containing all floating tool logo decorations in `page.tsx` (line 291). This prevents screen readers from announcing "graphic" or describing decorative SVG shapes and tool logos.

## Build verification confirms no regressions

The verification notes report build success with no TypeScript errors and ESLint passing. All imports resolve. The changes are purely additive (new hook, conditional animation logic, CSS enhancements) and don't modify the hero layout, CTA URLs, or component structure.

## Animation count is effectively zero with reduced motion

The original concern was "high simultaneous animation count" with 12+ concurrent animations. With the reduced motion hook, users who enable that preference now see:
- No parallax scroll on 3D cards (3 animations → 0)
- No floating badge drift (3 animations → 0)
- No mesh gradient orb movement (3 animations → 0)
- No SVG path drawing (5 animations → 0)
- No tool logo drift (2 animations → 0)
- No geometric shape rotation (2 animations → 0)

Total: 0 animations when `prefers-reduced-motion: reduce` is set. The page remains visually rich (all elements are still visible) but static. This addresses the performance concern for mid-tier devices and accessibility concern for users with vestibular disorders.

## Mobile responsiveness preserved

The changes don't introduce new breakpoint-specific behavior beyond the gradient text contrast fix. The hero layout from the initial implementation remains: 3D cards hidden below 1024px via `hidden lg:block`, headline scales from `text-5xl` (mobile) to `text-8xl` (desktop), CTAs stack vertically on mobile (`flex-col sm:flex-row`), content centered on mobile and left-aligned on desktop (`text-center sm:text-left`). No fixed widths, no horizontal overflow.

</details>

---

<details>
<summary>File map</summary>

**New files:**
- `hooks/useReducedMotion.ts` — Custom hook to detect prefers-reduced-motion media query

**Modified files:**
- `app/page.tsx` — Import useReducedMotion hook, conditionally disable tool logo drift and geometric shape rotation animations, add aria-hidden to decorative container
- `app/globals.css` — Lighten gradient text colors on mobile, add prefers-reduced-motion media query to disable CSS animations globally
- `components/hero/Hero3DCreatorCard.tsx` — Conditionally disable parallax scroll and hover tilt based on reduced motion preference
- `components/hero/HeroFloatingBadge.tsx` — Conditionally disable Y-axis float animation
- `components/hero/HeroMeshGradient.tsx` — Conditionally disable mesh orb movement and SVG path drawing, add aria-hidden to SVG
- `components/hero/HeroAnimatedLines.tsx` — Conditionally disable SVG pathLength drawing, add aria-hidden to SVG
- `.agents/tasks/hero-verify.md` — Documentation of changes made in this iteration

**Unchanged (verification noted these exist):**
- `SETUP.md` — Added content but not part of hero review scope
- `app/login/page.tsx` — Minor changes but not part of hero review scope

Full diff: `git diff HEAD~1` in `/Users/shaisthashaik/Desktop/Cinegen/cinegen`

</details>

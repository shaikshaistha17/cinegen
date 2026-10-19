# Hero Section Enhancement — Code Review

Enhanced hero with 3D creator cards, asymmetric editorial layout, and animated mesh background

The hero section has been transformed from a centered gradient design into an asymmetric editorial layout with 3D creator cards, enhanced typography, and rich animated background. The implementation follows the plan's vision of surpassing Crevo's visual impact while maintaining CineGen's purple/cyan brand identity. All existing CTAs and functionality remain intact. Two review iterations addressed accessibility gaps: reduced motion support, ARIA attributes for decorative elements, improved gradient text contrast, CTA focus states, and removal of false interactivity signals.

**Watch for:** Missing real-device verification of gradient text contrast on OLED screens (confirmed: likely) — the CSS changes are in place but verification notes flag this as requiring hardware testing. All other accessibility and performance concerns have been addressed.

**Verdict**: APPROVED

---

## High-level view

The 3D creator cards use framer-motion's perspective transforms with realistic box shadows and parallax scroll effects, achieving the depth and visual richness outlined in the plan. The cards stack at different angles with z-index layering and respond to hover with subtle tilt animations, all disabled cleanly when users prefer reduced motion.

Typography breaks from the centered template pattern with an asymmetric 7-5 grid layout, left-aligned on desktop, larger scale (8xl on desktop), and mixed font weights (semibold, extrabold italic gradient, light) that create editorial hierarchy. The "AI creators" span uses the enhanced gradient with drop shadow for visual pop.

The background layers animated mesh gradient orbs, noise texture overlay, and SVG geometric shapes over the existing ParticleBackground. The mesh gradient uses three large blurred orbs that drift slowly across the viewport, with decorative circles drawn via SVG path animation. Noise texture sits at 0.04 opacity to add grit without overwhelming content.

Accessibility implementation covers reduced motion (via custom hook disabling parallax, hover tilt, badge float, mesh movement, and CSS animations), ARIA attributes on decorative SVGs, improved gradient text contrast for mobile (lighter violet-300/cyan-300), focus-visible rings on CTA buttons, and removal of cursor-pointer from non-interactive cards. The reduced motion media query in globals.css disables all CSS-based animations globally.

Floating badges and decorative tool logo elements scatter throughout the hero at low opacity (20%), drifting with slow Y-axis oscillation. Geometric shapes (circle, square) rotate continuously. These elements live in an absolute-positioned layer with `pointer-events-none` and `hidden lg:block`, keeping mobile clean.

Mobile responsiveness hides all 3D cards, floating badges, animated lines, and decorative elements below 1024px. Content centers on small viewports with `text-center sm:text-left`, CTAs stack vertically, and headline scales down to 5xl. Section uses `overflow-hidden` to prevent horizontal scroll, and all positioning uses percentage-based values.

---

<details>
<summary>Issues (1)</summary>

1. **Gradient text OLED contrast** — Verification notes flag that the mobile gradient text contrast improvement (lighter violet-300/cyan-300) requires real-device testing on iPhone/Android OLED screens to confirm readability against true black. CSS changes are in place, but this is unverified. Test on actual hardware or accept the risk. (confirmed: likely)

</details>

<details>
<summary>Details</summary>

## 3D creator cards with parallax and perspective

Three Hero3DCreatorCard components render in absolute-positioned divs within a relative container (lg:col-span-5), each with unique rotation values and z-index for depth layering. Card 1 at top-left uses `rotateY(-12deg) rotateZ(3deg)` with z-20, Card 2 at center-right uses `rotateY(8deg) rotateZ(-2deg)` with z-30 (front-most), Card 3 at bottom-left uses `rotateY(-5deg) rotateZ(1deg)` with z-10 (back).

The parallax effect uses framer-motion's `useScroll` and `useTransform` to map scrollY position (0 to 1000) to translateY (-150px multiplied by parallaxMultiplier prop: 0.3, 0.5, 0.2 respectively). This creates differential movement where the center card (0.5 multiplier) moves fastest, enhancing depth perception. The `useReducedMotion` hook zeroes out the transform when `prefers-reduced-motion: reduce` is detected, making parallax opt-in.

Box shadows layer multiple effects: `0 20px 60px rgba(139, 92, 246, 0.4)` for the purple glow, `0 8px 16px rgba(0, 0, 0, 0.3)` for realistic depth, and `inset 0 1px 0 rgba(255, 255, 255, 0.1)` for a subtle top highlight. The glass-strong utility provides `backdrop-filter: blur(20px)` with semi-transparent background.

Hover interaction applies `scale: 1.02` and adjusts rotateY by +2 degrees when not in reduced motion mode. The interaction is purely visual — the cursor-pointer class was removed in review iteration 2 to eliminate false affordance, since cards aren't clickable.

## Typography hierarchy with mixed weights and italic gradient

The headline structure uses three spans with different font weights. "Hire the world's best" gets font-semibold (600), "AI creators" gets font-extrabold italic with the gradient-text-enhanced class, and "for your brand" gets font-light (300).

Scale progression is aggressive: `text-5xl sm:text-6xl md:text-7xl lg:text-8xl`, reaching 8xl (6rem / 96px) on desktop. Line-height at 1.1 keeps lines tight, and tracking-tight reduces letter-spacing for a denser, more impactful look.

The gradient-text-enhanced class in globals.css uses a lighter purple (#a78bfa instead of #8b5cf6) for better contrast. On mobile (max-width 640px), it shifts to even lighter colors (violet-300 #c4b5fd and cyan-300 #67e8f9) and reduces drop-shadow intensity from 20px to 12px. This addresses the contrast concern raised in review iteration 1, though verification notes flag that OLED screen testing is still pending.

Alignment shifts from centered on mobile to left-aligned on desktop via `text-center sm:text-left`. The max-w-4xl constrains headline width on wide viewports, and `mx-auto sm:mx-0` centers on mobile but left-aligns on small breakpoint and up.

## Mesh gradient background with noise texture and geometric patterns

HeroMeshGradient renders three large blurred orbs (w-96 h-96, w-80 h-80, w-72 h-72) with different colors (violet-600/30, cyan-500/25, indigo-500/20) positioned at top-left, top-right, and bottom-center. Each animates X and Y position in a loop (20s, 18s, 22s durations) with staggered delays (0s, 2s, 4s) to create asynchronous movement.

SVG geometric shapes (two circles at cx="20%" cy="30%" r="150" and cx="75%" cy="60%" r="120") use gradient strokes and pathLength animation to "draw" themselves on page load. The animation runs from pathLength: 0 to pathLength: 1 over 2-2.5 seconds. These paths also respect reduced motion, shifting to just { opacity: 0.3 } without the drawing effect.

The noise texture sits in a separate absolute div with a data URI SVG using feTurbulence (baseFrequency 0.9, 4 octaves) at 0.04 opacity. This adds subtle grain similar to the film aesthetic in the plan. Below that, gradient vignettes (bg-gradient-to-b and bg-gradient-to-r) fade the background at edges to prevent overwhelming the content.

## Asymmetric layout with 7-5 grid split

The grid uses `grid-cols-1 lg:grid-cols-12` with the content div spanning `lg:col-span-7` and the cards div spanning `lg:col-span-5`. Content column uses `text-center sm:text-left` and `justify-center sm:justify-start` for flex containers, centering on mobile and left-aligning on small breakpoint (640px) and up. The plan specified left alignment for desktop asymmetry, but pragmatically centers on mobile where asymmetry doesn't translate well.

The cards column uses `hidden lg:block`, appearing only at the large breakpoint (1024px). Individual card wrapper divs use `absolute top-0 left-0`, `absolute top-32 right-0`, and `absolute bottom-0 left-12` to stagger positions vertically and horizontally.

## Floating badges and decorative elements

Three HeroFloatingBadge components scatter around the card cluster: "Verified" at top-16 right-20 with violet color, "Top Rated" at bottom-24 right-8 with amber, and "Studio Pro" at top-48 left-32 with cyan. The float animation oscillates Y position from 0 to -12px and back over 4 seconds, or stays static when reduced motion is preferred.

Tool logo decorations (Runway, Midjourney) render as small 12×12px boxes with backdrop-blur-sm at 20% opacity, positioned at top-24 left-15% and bottom-32 right-20%, drifting vertically with slow oscillation (4-5s duration). Decorative geometric shapes (24×24px circle, 16×16px square with border-only) rotate continuously (20-25s duration) at low opacity (border-violet-500/10, border-cyan-500/10).

All decorative elements live in a div with `absolute inset-0 pointer-events-none overflow-hidden hidden lg:block aria-hidden="true"`. The aria-hidden was added in review iteration 1 to clarify for screen readers that this entire layer is decorative.

## Animated connection lines

HeroAnimatedLines renders an SVG with three curved paths using quadratic bezier syntax. Each motion.path animates pathLength from 0 to 1 over 2-2.5 seconds with staggered delays (0s, 0.3s, 0.6s), creating a drawing effect. Stroke uses `url(#lineGradient)` which defines a purple-to-cyan gradient, and strokeDasharray="5 5" makes the line dotted. Opacity is 0.15 to keep lines subtle.

When reduced motion is preferred, lines appear instantly at full pathLength. The SVG uses `hidden lg:block` since connection lines don't make sense on mobile where cards are hidden.

## Reduced motion accessibility

The useReducedMotion hook in hooks/useReducedMotion.ts queries `(prefers-reduced-motion: reduce)` on mount and listens for changes via mediaQuery.addEventListener. It returns a boolean that all animated components consume.

Hero3DCreatorCard: disables parallax by passing 0 to useTransform when prefersReducedMotion is true, and makes whileHover an empty object to skip the tilt effect. HeroFloatingBadge: makes animate an empty object to skip Y oscillation. HeroMeshGradient: makes animate empty on all three orbs and changes SVG circle animation to just { opacity: 0.3 } without pathLength drawing. HeroAnimatedLines: makes animate empty so lines appear instantly. Page.tsx: makes animate empty on tool logo drift and geometric shape rotation.

The globals.css file includes `@media (prefers-reduced-motion: reduce)` block that sets `animation: none !important` on .animate-float-slow, .animate-gradient-shift, and .animate-pulse-slow, catching any CSS-based animations. This dual approach (hook for framer-motion, media query for CSS) ensures comprehensive coverage.

## CTA focus states and keyboard accessibility

Review iteration 2 added `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none` to the primary "Try Demo" button and `focus-visible:ring-2 focus-visible:ring-violet-400 ...` to the secondary "Browse Creators" button.

The cyan ring on the primary button provides contrast against the violet gradient background, while the violet ring on the secondary button matches brand colors and contrasts against the glass background. Focus-visible triggers only on keyboard navigation, avoiding visual noise for mouse users. This addresses WCAG 2.4.7 (Focus Visible, Level AA).

## Mobile responsiveness and overflow prevention

The hero section uses `overflow-hidden` at the section level. All absolute-positioned decorative elements use percentage-based positioning (left-[15%], right-[20%], etc.) rather than fixed pixel values.

Cards, badges, animated lines, and decorative elements all use `hidden lg:block`, removing them entirely below 1024px rather than just hiding visually.

Headline scales down progressively: 5xl (3rem/48px) on mobile fits within the 390px viewport (minus 32px horizontal padding = 358px content width). At 48px font size with tight tracking, the longest line "Hire the world's best" spans roughly 350-360px, fitting comfortably. The responsive scale (6xl at sm:640px, 7xl at md:768px, 8xl at lg:1024px) grows the headline as viewport widens.

CTAs use `flex-col sm:flex-row` to stack vertically on mobile, ensuring each button gets full width for easy tapping (py-4 = 48px tap target).



</details>

<details>
<summary>File map</summary>

**New files created:**
- `components/hero/Hero3DCreatorCard.tsx` — 3D creator card with parallax scroll and perspective transform
- `components/hero/HeroFloatingBadge.tsx` — animated floating badge with Y oscillation
- `components/hero/HeroMeshGradient.tsx` — animated mesh gradient background with orbs and SVG shapes
- `components/hero/HeroAnimatedLines.tsx` — SVG connection lines with gradient stroke and path drawing animation
- `hooks/useReducedMotion.ts` — custom hook to detect prefers-reduced-motion media query

**Modified files:**
- `app/page.tsx` — hero section rebuilt with asymmetric layout, enhanced typography, 3D cards, floating elements, and decorative layer; added focus states to CTA buttons
- `app/globals.css` — added .gradient-text-enhanced class with mobile contrast improvements, prefers-reduced-motion media query

**Full diff:** Compare working tree against commit c5d3a93 (before hero work) to see complete transformation.

</details>

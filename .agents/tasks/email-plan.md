# Implementation Plan: Professional Email Templates for CineGen

## Project Context

**Project Type**: Next.js 14 (App Router) + TypeScript + Supabase Backend  
**Build System**: npm with Next.js build pipeline  
**Test Framework**: Manual testing via test API route  
**Build Command**: `npm run build`  
**Dev Command**: `npm run dev`  
**UI Theme**: Dark glassmorphism with violet-600 (#7c3aed), cyan-500 (#06b6d4), indigo-600 (#4f46e5) gradient palette

**Current State**: 
- Supabase Auth handles password reset emails via `resetPasswordForEmail()` (uses Supabase's default template)
- OTP verification exists but uses in-memory storage (not production-ready)
- No custom branded email templates exist
- No email sending infrastructure beyond Supabase Auth built-in

**Design Decision**: Use table-based HTML email layouts with inline CSS for maximum email client compatibility (Outlook, Gmail, Apple Mail). Emails will mirror CineGen's dark glassmorphic aesthetic while maintaining readability in light-mode email clients.

---

## Implementation Steps

- [ ] 1. Create emails directory structure and welcome email template for brands
      Create `/emails/welcome-brand.html` with table-based layout, inline CSS, glassmorphic header with purple-cyan gradient, CTA button linking to dashboard, footer with social links. Include CineGen logo placeholder (text-based), greeting with recipient name variable `{{name}}`, brief introduction to posting briefs, AI Brief Builder, and discovering creators.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/welcome-brand.html`
      Verify: Open the HTML file in a browser and confirm the layout renders correctly with proper spacing, colors (violet #7c3aed, cyan #06b6d4), and responsive table structure.

- [ ] 2. Create welcome email template for creators
      Create `/emails/welcome-creator.html` following the same table-based layout pattern as welcome-brand. Include sections: greeting with `{{name}}`, onboarding progress tracker (3 steps), CTA to complete profile, benefits summary (browse briefs, submit proposals, get verified), footer matching welcome-brand. Use cyan-indigo gradient for creator-specific accent.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/welcome-creator.html`
      Verify: Open in browser and confirm creator-specific styling (cyan-indigo), proper variable placeholders, and mobile-responsive layout.

- [ ] 3. Create OTP verification email template
      Create `/emails/otp-verification.html` with prominent 6-digit code display in large monospace font inside a bordered box, 15-minute expiry warning, security notice (never share OTP), alternate "Use magic link" button with `{{magicLink}}` variable. Match CineGen branding with violet-cyan gradient header.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/otp-verification.html`
      Verify: Open in browser, confirm OTP code `{{otpCode}}` placeholder is visually prominent and centered, expiry time is clear, and layout works on narrow mobile viewports.

- [ ] 4. Create password reset email template
      Create `/emails/password-reset.html` with clear "Reset Your Password" heading, security context ("You requested a password reset"), prominent reset button with `{{resetLink}}` variable, link expiry notice (1 hour per Supabase default), "Didn't request this?" section, footer. Use violet-indigo gradient for urgency signaling.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/password-reset.html`
      Verify: Open in browser, confirm reset button is visually distinct and clickable-looking, security messaging is clear, and link placeholder is properly formatted.

- [ ] 5. Create proposal received notification email for brands
      Create `/emails/proposal-received.html` notifying brand that a creator submitted a proposal. Include: creator name `{{creatorName}}`, creator handle `{{creatorHandle}}`, brief title `{{briefTitle}}`, proposal price `{{proposalPrice}}`, timeline `{{timelineDays}}` days, preview of proposal message (first 150 chars `{{messagePreview}}`), CTA button "View Full Proposal" linking to `{{proposalUrl}}`, footer.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/proposal-received.html`
      Verify: Open in browser, confirm all variable placeholders are present, proposal details are clearly structured in a card-like section, and CTA button stands out.

- [ ] 6. Create brief match notification email for creators
      Create `/emails/brief-match.html` notifying creator of a new brief matching their profile. Include: brief title `{{briefTitle}}`, brand name `{{brandName}}`, content type `{{contentType}}`, budget range `{{budgetMin}}-{{budgetMax}}`, deadline `{{deadline}}`, tools preferred `{{toolsList}}`, match score badge (visual element with `{{matchScore}}%`), CTA "View Brief & Apply" linking to `{{briefUrl}}`, footer.
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/emails/brief-match.html`
      Verify: Open in browser, confirm match score is visually highlighted with circular badge styling, brief details are scannable, and tools list renders properly.

- [ ] 7. Create TypeScript email template utility module
      Create `/lib/email-templates.ts` exporting: 
      - `EmailTemplate` type with `{ subject: string; html: string; text?: string }`
      - `renderEmailTemplate(templateName: string, variables: Record<string, any>): Promise<EmailTemplate>` function that reads HTML from `/emails/`, replaces `{{variable}}` placeholders using regex, and returns subject + HTML
      - `sendEmail(to: string, template: EmailTemplate): Promise<void>` placeholder function (logs to console with TODO comment for Resend/SendGrid integration)
      - Template name enum: `'welcome-brand' | 'welcome-creator' | 'otp-verification' | 'password-reset' | 'proposal-received' | 'brief-match'`
      - Subject line mapping for each template
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/email-templates.ts`
      Verify: Run `npm run build` and confirm TypeScript compiles without errors. Check that function signatures match expected usage patterns.

- [ ] 8. Create test API route for email preview
      Create `/app/api/test-emails/route.ts` as a GET handler that returns an HTML page listing all 6 email templates with sample data. For each template, call `renderEmailTemplate()` with mock variables (name: "Arjun Mehta", otpCode: "123456", resetLink: "#", etc.). Render each email in an iframe for side-by-side preview. Include "Copy HTML" button per template. Add warning banner: "⚠️ For development only - remove before production".
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/test-emails/route.ts`
      Verify: Run `npm run dev`, navigate to `http://localhost:3000/api/test-emails`, confirm all 6 emails render in iframes, sample variables are replaced correctly, and "Copy HTML" buttons work.

- [ ] 9. Update SETUP.md with email configuration section
      Add new section after "Password Reset Flow" titled "## Email Templates". Document: (1) Available templates and their use cases, (2) How to customize templates (edit HTML in `/emails/`, use `{{variable}}` syntax), (3) Variable reference table for each template, (4) Instructions to integrate with Resend or SendGrid (add API key to `.env.local`, install package, update `sendEmail()` in `email-templates.ts`), (5) Link to test route for previewing emails, (6) Production considerations (remove test route, configure SMTP in Supabase for transactional emails).
      Files: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/SETUP.md`
      Verify: Run `npm run dev`, open SETUP.md in editor, confirm new section is properly formatted with markdown tables for variables, code blocks for env vars, and clear step-by-step instructions. Check that internal links resolve correctly.

---

## Technical Decisions & Rationale

### Email Layout Architecture
**Decision**: Table-based layouts with inline CSS, no external stylesheets or `<style>` blocks.  
**Rationale**: Outlook 2007-2021 uses Microsoft Word rendering engine which strips `<style>` tags and external CSS. Gmail app on mobile has inconsistent CSS support. Tables with inline styles have 99%+ compatibility across email clients per Email on Acid testing data.

### Color Palette Adaptation
**Decision**: Use CineGen's violet-cyan-indigo palette but with increased contrast and fallback background colors.  
**Rationale**: Email clients often force light backgrounds. Dark glassmorphism won't render properly. Solution: Use gradient headers (violet-to-cyan) with white text, light gray body backgrounds (#f4f4f5), and high-contrast CTAs (violet #7c3aed button with white text). This maintains brand identity while ensuring readability in all clients.

### Variable Substitution Pattern
**Decision**: Use `{{variableName}}` mustache-style syntax with regex replacement.  
**Rationale**: Simple, framework-agnostic, no template engine dependency. Regex `{{(\w+)}}` provides clear variable identification. Falls back gracefully (leaves `{{name}}` if variable missing) allowing for easy debugging.

### File Storage Location
**Decision**: Store templates in `/emails/` at project root, not in `/public/` or `/app/`.  
**Rationale**: Email templates are server-side assets (never served to client), not public static assets. Separating them from Next.js app directory prevents accidental routing conflicts and clearly signals server-only usage.

### Email Sending Abstraction
**Decision**: Create `sendEmail()` stub that logs to console initially, with TODO for Resend/SendGrid integration.  
**Rationale**: CineGen currently uses Supabase Auth's built-in email for password reset. Custom transactional emails require third-party service (Resend recommended for Next.js per Vercel docs). Stub allows template development and testing without committing to email provider now. Future integration is isolated to one function in `email-templates.ts`.

### Test Route Design
**Decision**: Single GET route at `/api/test-emails` rendering all templates in iframes with mock data.  
**Rationale**: Allows visual QA of all templates simultaneously. Iframes provide isolation (prevent CSS conflicts). Mock data tests variable substitution. Includes warning banner to remind developer to remove before production deploy. No POST endpoints or email sending (avoids accidental spam during testing).

---

## Variable Reference

### welcome-brand.html
- `{{name}}` - Brand contact name (e.g., "Arjun")
- `{{companyName}}` - Company name from brand_profiles
- `{{dashboardUrl}}` - Link to `/dashboard`

### welcome-creator.html  
- `{{name}}` - Creator name
- `{{handle}}` - Creator @handle
- `{{onboardingUrl}}` - Link to `/onboarding` if incomplete, else `/dashboard`

### otp-verification.html
- `{{name}}` - User name
- `{{otpCode}}` - 6-digit numeric code
- `{{expiryMinutes}}` - "15" 
- `{{magicLink}}` - Alternative verification URL

### password-reset.html
- `{{name}}` - User name
- `{{resetLink}}` - URL to `/auth/reset-password` with token
- `{{expiryHours}}` - "1"

### proposal-received.html
- `{{brandName}}` - Recipient brand name
- `{{creatorName}}` - Proposal sender name
- `{{creatorHandle}}` - @handle
- `{{briefTitle}}` - Brief campaign title
- `{{proposalPrice}}` - Formatted currency (e.g., "$1,200")
- `{{timelineDays}}` - Integer days
- `{{messagePreview}}` - First 150 chars of proposal.message
- `{{proposalUrl}}` - Link to proposal view page

### brief-match.html
- `{{creatorName}}` - Recipient creator name
- `{{briefTitle}}` - Brief campaign title
- `{{brandName}}` - Brand company name
- `{{contentType}}` - From briefs.content_type
- `{{budgetMin}}` - Formatted currency
- `{{budgetMax}}` - Formatted currency
- `{{deadline}}` - Formatted date
- `{{toolsList}}` - Comma-separated tools from briefs.tools_preferred
- `{{matchScore}}` - Integer 0-100
- `{{briefUrl}}` - Link to `/briefs/[id]`

---

## Verification Evidence

After completing all steps, verification evidence should include:
1. Screenshots of all 6 email templates rendered in browser (from test route)
2. TypeScript compilation success (no errors in `npm run build`)
3. Test route accessible at `http://localhost:3000/api/test-emails` showing all templates
4. SETUP.md section visible with complete variable reference table
5. All `{{variables}}` replaced with sample data in test route preview

---

## Future Integration Notes

**Resend Integration** (recommended for production):
```bash
npm install resend
```

Update `lib/email-templates.ts`:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  await resend.emails.send({
    from: 'CineGen <noreply@cinegen.com>',
    to,
    subject: template.subject,
    html: template.html,
  });
}
```

Add to `.env.local`:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Supabase Auth Email Override** (for password reset):
Follow Supabase docs to configure custom SMTP and redirect to custom template URL.


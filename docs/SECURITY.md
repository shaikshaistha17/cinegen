# CineGen Security Documentation

This document outlines the security features, policies, and best practices implemented in the CineGen platform.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Row-Level Security (RLS)](#row-level-security-rls)
3. [Rate Limiting](#rate-limiting)
4. [OTP Security](#otp-security)
5. [Payment Security](#payment-security)
6. [Demo Account Isolation](#demo-account-isolation)
7. [Admin Permissions](#admin-permissions)
8. [Threat Model & Mitigations](#threat-model--mitigations)
9. [Security Checklist](#security-checklist)

---

## Authentication & Authorization

### Overview

CineGen uses Supabase Auth for user authentication with the following features:

- Email/password authentication
- OAuth (Google)
- OTP-based email verification
- Password reset via secure tokens
- JWT-based session management

### Session Management

- Sessions are stored in HTTP-only cookies (managed by Supabase)
- Session tokens expire after 7 days of inactivity
- Refresh tokens enable automatic session renewal
- All API routes verify authentication via `supabase.auth.getUser()`

### User Roles

CineGen supports three primary roles:

- **Brand**: Companies looking to hire creators
- **Creator**: Content creators offering services
- **Admin**: Platform administrators with elevated privileges
- **Guest**: Unauthenticated users (limited access)

Role-based access is enforced at:
1. API route level (checking user role)
2. Database level (RLS policies based on profile type)
3. UI level (conditional rendering)

---

## Row-Level Security (RLS)

### Overview

All database tables use PostgreSQL Row-Level Security (RLS) to enforce access control at the database layer. This ensures that even if API authentication is bypassed, users cannot access unauthorized data.

### RLS Policy Patterns

#### 1. Ownership Pattern
Users can only access their own data.

**Example: Notifications**
```sql
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

#### 2. Participation Pattern
Users can access data where they are a participant (creator or brand).

**Example: Agreements**
```sql
CREATE POLICY "Participants can read agreements"
  ON agreements FOR SELECT
  USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR
    brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
  );
```

#### 3. Service Role Only Pattern
No direct user access; only service role (API routes) can access.

**Example: OTP Verifications**
```sql
CREATE POLICY "Service role only access"
  ON otp_verifications FOR ALL
  USING (false);
```

#### 4. Admin Pattern
Only users with `role = 'admin'` can access.

**Example: Verifications (Admin Review)**
```sql
CREATE POLICY "Admins can review verifications"
  ON verifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### RLS-Protected Tables

All tables have RLS enabled:

| Table | RLS Policies |
|-------|-------------|
| `users` | Own profile only |
| `creator_profiles` | Own profile + public read |
| `brand_profiles` | Own profile only |
| `briefs` | Brand ownership + public read for open briefs |
| `proposals` | Creator ownership + brand can read proposals on their briefs |
| `agreements` | Participants (creator + brand) |
| `deliveries` | Participants (creator upload, brand approve) |
| `project_messages` | Participants only |
| `scope_changes` | Participants only |
| `messages` | Sender + recipient only |
| `reviews` | Creator + brand + public read |
| `verifications` | Creator + admin |
| `director_conversations` | User ownership |
| `director_messages` | Via conversation ownership |
| `decision_rooms` | User ownership |
| `notifications` | User ownership |
| `payment_intents` | Participants (creator + brand) |
| `otp_verifications` | Service role only (no user access) |

### Testing RLS Policies

To verify RLS policies in Supabase SQL Editor:

```sql
-- Verify all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Test policy as specific user (replace with actual user UUID)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
SELECT * FROM notifications; -- Should only return user's notifications
RESET ROLE;
```

---

## Rate Limiting

### Overview

Rate limiting prevents abuse and protects sensitive endpoints from brute-force attacks, spam, and resource exhaustion.

### Implementation

CineGen uses an in-memory rate limiter (`lib/rate-limit.ts`) with the following characteristics:

- **Storage**: In-memory Map (resets on server restart)
- **Cleanup**: Automatic cleanup of expired entries
- **Production Note**: For multi-server deployments, consider Redis-based rate limiting

### Rate-Limited Endpoints

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/auth/otp` | 3 requests | 15 minutes | Prevent OTP spam/abuse |
| `POST /api/stripe/create-payment-intent` | 5 requests | 1 hour | Prevent payment testing abuse |
| `POST /api/proposals` | 10 requests | 1 hour | Prevent proposal spam |

### Rate Limit Response

When rate limited, endpoints return `429 Too Many Requests`:

```json
{
  "error": "Too many requests. Please try again in 14 minutes.",
  "retryAfter": 840
}
```

### Example Usage

```typescript
import { checkRateLimit, getRateLimitResetTime } from '@/lib/rate-limit';

const rateLimitKey = `otp:${email}`;
const isAllowed = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000);

if (!isAllowed) {
  const resetTime = getRateLimitResetTime(rateLimitKey);
  return { error: `Try again in ${Math.ceil(resetTime / 60)} minutes`, status: 429 };
}
```

---

## OTP Security

### Persistent Storage

OTPs are stored in the `otp_verifications` table (not in-memory) to ensure:

- Persistence across server restarts
- Horizontal scaling support
- Audit trail for security reviews

### OTP Lifecycle

1. **Generation**: 6-digit random code (`generateOTP()`)
2. **Storage**: Saved in database with 15-minute expiry
3. **Verification**: Query database, check expiry, mark as used
4. **Cleanup**: Automatic cleanup of expired OTPs (1 hour after expiry)

### Security Features

- ✅ **Expiration**: 15 minutes after generation
- ✅ **Single-use**: OTPs marked `used_at` to prevent reuse
- ✅ **Rate limiting**: Max 3 OTP requests per email per 15 minutes
- ✅ **Service role only**: No direct user access to OTP table
- ✅ **Case-insensitive**: Email normalized to lowercase

### OTP Verification Flow

```typescript
// Request OTP
POST /api/auth/otp
Body: { "email": "user@example.com" }

// Verify OTP
POST /api/auth/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
```

### Database Schema

```sql
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_verifications_email_expires ON otp_verifications(email, expires_at);
```

### Cleanup

```sql
-- Manual cleanup (or schedule with pg_cron)
SELECT cleanup_expired_otps();

-- Schedule with pg_cron (hourly)
SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT cleanup_expired_otps()');
```

---

## Payment Security

### PCI Compliance

CineGen uses Stripe for payment processing, ensuring PCI DSS compliance:

- **No card data storage**: Card details never touch CineGen servers
- **Stripe Elements**: Client-side tokenization
- **PaymentIntents API**: Server-side payment creation
- **Webhook validation**: Stripe signature verification

### Payment Flow

1. **Client**: Collects card details via Stripe Elements
2. **Server**: Creates PaymentIntent via Stripe API
3. **Client**: Confirms payment with Stripe
4. **Webhook**: Stripe notifies CineGen of payment status
5. **Server**: Updates `payment_intents` table

### Escrow Workflow

- Payments held in escrow (Stripe balance)
- Released to creator after milestone approval
- Refunds possible before release

### Payment Security Features

- ✅ **Rate limiting**: Max 5 payment attempts per user per hour
- ✅ **Auth required**: Only authenticated brands can create payments
- ✅ **Ownership verification**: Brand must own the agreement
- ✅ **Duplicate prevention**: Check if milestone already paid
- ✅ **Demo mode**: Simulated payments for testing (no real charges)

### Demo Mode

```typescript
// .env.local
NEXT_PUBLIC_STRIPE_DEMO_MODE=true

// In code
if (isStripeDemoMode()) {
  // Create mock payment record, no real charge
}
```

### Payment Intent Status

| Status | Description |
|--------|-------------|
| `pending` | Payment created, awaiting confirmation |
| `processing` | Payment being processed |
| `succeeded` | Payment successful |
| `failed` | Payment failed |
| `canceled` | Payment canceled |
| `refunded` | Payment refunded |

---

## Demo Account Isolation

### Overview

Demo accounts (`is_demo = true`) are sandboxed to prevent interference with production data.

### Isolation Rules

1. **Data Segregation**: Demo users only see other demo data
2. **No Real Payments**: Demo accounts use simulated payments
3. **No Real Emails**: Email sending disabled for demo accounts
4. **Limited Visibility**: Demo briefs not shown to real users

### RLS Enforcement

```sql
-- Example: Briefs visible only to same demo status
CREATE POLICY "Demo isolation for briefs"
  ON briefs FOR SELECT
  USING (
    (SELECT is_demo FROM users WHERE id = auth.uid()) = 
    (SELECT is_demo FROM users u JOIN brand_profiles bp ON bp.user_id = u.id WHERE bp.id = brand_id)
  );
```

### Demo Accounts

- `brand@cinegen.demo` / `Demo@123` (Brand demo)
- `creator@cinegen.demo` / `Demo@123` (Creator demo)

---

## Admin Permissions

### Admin Role

Users with `role = 'admin'` have elevated privileges:

- Review creator verification requests
- Moderate content
- View platform analytics
- Manage user accounts

### Admin-Only Actions

1. **Verification Approval**: Approve/reject creator verifications
2. **Content Moderation**: Flag/remove inappropriate content
3. **User Management**: Ban/suspend accounts
4. **Analytics Access**: View platform-wide metrics

### Admin RLS Policies

```sql
CREATE POLICY "Admins can manage verifications"
  ON verifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### Admin API Routes

All admin routes check for admin role:

```typescript
const { data: user } = await supabase.auth.getUser();
const { data: userRecord } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (userRecord.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## Threat Model & Mitigations

### Threat: Unauthorized Data Access

**Mitigation**: Row-Level Security (RLS) policies on all tables

### Threat: Brute-Force Attacks

**Mitigation**: Rate limiting on sensitive endpoints (OTP, login, payments)

### Threat: OTP Reuse/Replay

**Mitigation**: Mark OTPs as `used_at` after verification, prevent reuse

### Threat: Payment Fraud

**Mitigation**: 
- Stripe's built-in fraud detection
- Rate limiting on payment creation
- Ownership verification before payment
- Webhook signature verification

### Threat: Demo Data Leakage

**Mitigation**: Demo account isolation via RLS policies

### Threat: SQL Injection

**Mitigation**: Parameterized queries via Supabase client (no raw SQL in app)

### Threat: XSS (Cross-Site Scripting)

**Mitigation**: 
- React auto-escapes rendered content
- Sanitize user-generated HTML (if any)
- Content Security Policy headers

### Threat: CSRF (Cross-Site Request Forgery)

**Mitigation**: 
- SameSite cookies
- JWT-based authentication
- CORS configuration

### Threat: Session Hijacking

**Mitigation**: 
- HTTP-only cookies
- Secure flag (HTTPS only)
- Short session expiry with refresh tokens

### Threat: Sensitive Data Exposure

**Mitigation**: 
- Environment variables for secrets
- Service role key never exposed to client
- Card data never stored (Stripe handles it)

---

## Security Checklist

### Deployment Checklist

- [ ] All environment variables set in production
- [ ] `NEXT_PUBLIC_BASE_URL` configured (for password reset links)
- [ ] Stripe production keys configured
- [ ] Email service configured (Resend/SendGrid)
- [ ] Database RLS policies enabled and tested
- [ ] HTTPS enforced (no HTTP traffic)
- [ ] CORS configuration reviewed
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Demo accounts isolated
- [ ] Health endpoint accessible for monitoring

### Code Review Checklist

- [ ] All API routes check authentication
- [ ] All database queries use RLS-enforced tables
- [ ] No service role key exposed to client
- [ ] Input validation on all user inputs
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting on new sensitive endpoints
- [ ] Logging doesn't include secrets/tokens

### Database Security Checklist

- [ ] RLS enabled on all tables
- [ ] RLS policies tested for each role
- [ ] Foreign keys with `ON DELETE CASCADE`
- [ ] Indexes on commonly queried columns
- [ ] Sensitive tables (OTP) restricted to service role
- [ ] Cleanup functions scheduled (OTPs, expired sessions)

---

## Reporting Security Issues

If you discover a security vulnerability, please report it to:

**Email**: security@cinegen.ai

Do NOT open a public GitHub issue for security vulnerabilities.

---

## Security Updates

| Date | Version | Change |
|------|---------|--------|
| 2024-10-24 | 1.0.0 | Initial security documentation |
| 2024-10-24 | 1.1.0 | Added persistent OTP storage |
| 2024-10-24 | 1.1.0 | Added rate limiting |
| 2024-10-24 | 1.1.0 | RLS audit and documentation |

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PCI DSS Overview](https://www.pcisecuritystandards.org/)

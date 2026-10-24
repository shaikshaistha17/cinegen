# Email Notification System Setup

The email notification system uses **Resend** to send transactional emails on key events.

## Setup

1. **Get Resend API Key**
   - Sign up at https://resend.com
   - Create an API key at https://resend.com/api-keys
   - Add to `.env.local`:
     ```bash
     RESEND_API_KEY=re_...your_key_here
     ```

2. **Apply Database Migration**
   - Navigate to Supabase dashboard: https://supabase.com/dashboard
   - Open SQL Editor
   - Run migration file: `database/migrations/012_email_preferences.sql`

3. **Configure App URL** (Optional)
   - Add to `.env.local` for production email links:
     ```bash
     NEXT_PUBLIC_APP_URL=https://yourdomain.com
     ```
   - Defaults to `https://cinegen.ai` if not set

## Email Types

The system sends emails for these events:

1. **Welcome Email** - When a new user signs up
2. **OTP Verification** - When email verification is requested
3. **Proposal Submitted** - Brand receives notification when creator submits proposal
4. **Proposal Accepted** - Creator receives notification when their proposal is accepted
5. **Payment Received** - Creator receives notification when payment succeeds
6. **Delivery Uploaded** - Brand receives notification when creator uploads a delivery

## Email Preferences

Users can manage their email preferences at `/settings/email`:

- In-app notifications are always enabled
- Email notifications can be toggled per event type
- Preferences are stored in `users.email_preferences` JSONB column

## Testing Emails

### Local Testing

1. Use Resend's test mode API key (starts with `re_test_`)
2. Emails will appear in Resend dashboard but won't be delivered
3. Check logs at https://resend.com/logs

### Production Testing

1. Use production API key
2. Send test email by triggering the event (e.g., create account)
3. Verify email delivery in inbox and Resend dashboard

### Manual Testing via API

```bash
# Test welcome email (trigger by registering)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "role": "creator",
    "name": "Test User"
  }'
```

## Architecture

### Email Service (`lib/email.ts`)

- **`sendEmail(params, emailType, maxRetries)`** - Core function with retry logic
- **Email preference checking** - Queries user preferences before sending
- **Exponential backoff** - Retries failed emails with 1s, 2s, 4s delays
- **Type-specific helpers**:
  - `sendWelcomeEmail(email, name, role)`
  - `sendOTPEmail(email, code)`
  - `sendProposalNotificationEmail(email, creator, brief, url)`
  - `sendProposalAcceptedEmail(email, brief, url)`
  - `sendPaymentReceivedEmail(email, amount, project, url)`
  - `sendDeliveryUploadedEmail(email, project, url)`

### Email Templates (`lib/email-templates.ts`)

Pre-existing templates with branded styling and variable substitution.

### Email Preferences API (`app/api/settings/email-preferences/route.ts`)

- **GET** - Fetch user's email preferences
- **PATCH** - Update preferences (merges with existing)

### Email Preferences UI (`app/settings/email/page.tsx`)

- Toggle email notifications per event type
- Shows in-app notifications (always on) vs email (toggleable)
- Glassmorphic design matching app style

## Integration Points

Email triggers are added to:

- `app/api/auth/register/route.ts` - Welcome email
- `app/api/proposals/route.ts` - Proposal submitted/accepted emails
- `app/api/deliveries/route.ts` - Delivery uploaded email
- `app/api/stripe/webhook/route.ts` - Payment received email

## Error Handling

- Email failures are logged but don't break API calls
- 3 retry attempts with exponential backoff
- User preference check failures "fail open" (allow email)
- Missing RESEND_API_KEY logs error and returns gracefully

## Compliance

- Users can opt out of any email type
- In-app notifications remain active (FEAT-001 independent)
- Email preferences stored per user in database

## Future Enhancements

- Email digest options (daily/weekly summaries)
- Custom email templates per brand
- Email analytics and open/click tracking
- Unsubscribe links in footer
- Multi-language email support

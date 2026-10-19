# 🔌 CineGen API Documentation

Complete API reference for all server routes in CineGen v2.0.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Creators](#creators)
3. [Briefs](#briefs)
4. [Proposals](#proposals)
5. [Messages](#messages)
6. [Reviews](#reviews)
7. [Verifications](#verifications)
8. [Error Codes](#error-codes)

---

## Base URL

**Production**: `https://cinegen.onrender.com`  
**Development**: `http://localhost:3000`

---

## Authentication

All authenticated endpoints require a valid JWT token in cookies (set automatically after login).

---

### POST `/api/auth/register`

Create a new user account and send email verification OTP.

#### Request

```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Doe",
  "role": "creator"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | Valid email address |
| password | string | ✅ | Minimum 8 characters |
| name | string | ✅ | Full name |
| role | string | ✅ | "creator" or "brand" |

#### Response (Success)

```json
{
  "success": true,
  "message": "Check your email for verification code",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "role": "creator"
  }
}
```

#### Response (Error)

```json
{
  "error": "Email already registered"
}
```

**Status Codes**:
- `201`: User created successfully
- `400`: Validation error
- `409`: Email already exists
- `500`: Server error

---

### POST `/api/auth/login`

Login with email/password or demo credentials.

#### Request

```json
{
  "email": "brand@cinegen.demo",
  "password": "Demo@123"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | Registered email or demo email |
| password | string | ✅ | Account password |

#### Response (Success)

```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_at": 1704067200,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "brand@cinegen.demo",
      "role": "brand"
    }
  }
}
```

#### Response (Error)

```json
{
  "error": "Invalid credentials"
}
```

**Status Codes**:
- `200`: Login successful
- `401`: Invalid credentials
- `500`: Server error

**Notes**:
- Demo accounts bypass OTP verification
- Session cookies set automatically (HttpOnly, Secure)

---

### POST `/api/auth/verify-otp`

Verify email with 6-digit OTP code.

#### Request

```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | Email used during registration |
| otp | string | ✅ | 6-digit code from email |

#### Response (Success)

```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_at": 1704067200,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "jane@example.com",
      "role": "creator"
    }
  }
}
```

#### Response (Error)

```json
{
  "error": "Invalid or expired OTP"
}
```

**Status Codes**:
- `200`: Verification successful
- `400`: Invalid OTP
- `410`: OTP expired (15-minute window)
- `500`: Server error

---

### GET `/api/auth/google`

Redirect to Google OAuth consent screen.

#### Request

No body required. Simply navigate to:

```
GET /api/auth/google
```

#### Response

HTTP 302 redirect to:

```
https://accounts.google.com/o/oauth2/v2/auth?...
```

User approves, then redirected to `/auth/callback?code=...`

---

### GET `/auth/callback`

OAuth callback handler (auto-called by Google after approval).

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| code | string | Authorization code from Google |

#### Response

HTTP 302 redirect to `/dashboard` with session cookies set.

**Status Codes**:
- `302`: Redirect to dashboard
- `401`: OAuth failed
- `500`: Server error

---

## Creators

---

### GET `/api/creators`

Search and filter creator profiles.

#### Authentication

Optional (public route, but authenticated users see personalized data).

#### Query Parameters

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| search | string | Full-text search by name, headline, bio | `?search=cinematic` |
| tools | string | Filter by AI tools (comma-separated) | `?tools=Runway,Midjourney` |
| specializations | string | Filter by specialization | `?specializations=Film` |
| minRate | number | Minimum hourly rate (USD) | `?minRate=50` |
| maxRate | number | Maximum hourly rate (USD) | `?maxRate=150` |
| availability | string | Filter by availability status | `?availability=Available` |
| verified | boolean | Show only verified creators | `?verified=true` |
| sort | string | Sort order | `?sort=rate_asc` (options: `rate_asc`, `rate_desc`, `rating_desc`, `projects_desc`) |

#### Request Example

```
GET /api/creators?search=runway&maxRate=100&verified=true&sort=rating_desc
```

#### Response (Success)

```json
{
  "success": true,
  "creators": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "handle": "@aryankapoor",
      "name": "Aryan Kapoor",
      "avatar_url": "https://supabase.co/.../avatar.jpg",
      "headline": "AI Filmmaker & Runway Expert",
      "bio": "Crafting cinematic stories with generative AI...",
      "location": "Mumbai, India",
      "hourly_rate_usd": 95,
      "availability": "Available",
      "verified_tools": {
        "Runway": "Expert",
        "Midjourney": "Advanced",
        "ElevenLabs": "Advanced"
      },
      "languages": ["English", "Hindi"],
      "stats": {
        "projects": 47,
        "rating": 4.9,
        "responseTime": "2 hours",
        "deliveryRate": 98
      },
      "verification": {
        "tools": true,
        "workflow": true,
        "pastWork": true
      },
      "joined_at": "2024-01-15T10:30:00Z"
    },
    // ... more creators
  ],
  "total": 5,
  "page": 1,
  "perPage": 20
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid query parameters
- `500`: Server error

---

### GET `/api/creators/[id]`

Fetch single creator profile with full details.

#### Authentication

Optional.

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Creator profile ID |

#### Request Example

```
GET /api/creators/550e8400-e29b-41d4-a716-446655440000
```

#### Response (Success)

```json
{
  "success": true,
  "creator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "handle": "@aryankapoor",
    "name": "Aryan Kapoor",
    "email": "aryan@cinegen.demo",
    "avatar_url": "https://supabase.co/.../avatar.jpg",
    "cover_url": "https://supabase.co/.../cover.jpg",
    "headline": "AI Filmmaker & Runway Expert",
    "bio": "Crafting cinematic stories with generative AI. Specializing in brand films, music videos, and experimental narratives.",
    "location": "Mumbai, India",
    "hourly_rate_usd": 95,
    "availability": "Available",
    "verified_tools": {
      "Runway": "Expert",
      "Midjourney": "Advanced",
      "ElevenLabs": "Advanced",
      "CapCut": "Intermediate"
    },
    "languages": ["English", "Hindi"],
    "stats": {
      "projects": 47,
      "rating": 4.9,
      "responseTime": "2 hours",
      "deliveryRate": 98,
      "portfolio": [
        {
          "id": "1",
          "title": "Luxury Watch Campaign",
          "thumbnail": "https://supabase.co/.../thumb.jpg",
          "type": "video",
          "tools": ["Runway Gen-2", "Midjourney", "After Effects"],
          "workflow": [
            "Concept art in Midjourney",
            "Video generation in Runway Gen-2",
            "Color grading in DaVinci Resolve"
          ]
        }
        // ... more portfolio items
      ]
    },
    "verification": {
      "tools": true,
      "workflow": true,
      "pastWork": true,
      "evidence": [
        {
          "type": "tools",
          "description": "Runway Pro subscription active since 2023",
          "url": "https://example.com/proof.jpg"
        }
      ]
    },
    "styleDNA": {
      "cinematic": 95,
      "bold": 70,
      "minimal": 30,
      "experimental": 80,
      "commercial": 85,
      "artistic": 75
    },
    "joined_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes**:
- `200`: Success
- `404`: Creator not found
- `500`: Server error

---

## Briefs

---

### POST `/api/brief`

Generate brief with Gemini AI from rough idea.

#### Authentication

Required (Brand only).

#### Request

```json
{
  "idea": "A cinematic 30-second ad for a luxury skincare brand targeting Gen Z women"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| idea | string | ✅ | Rough campaign idea (50-500 chars) |

#### Response (Success)

```json
{
  "success": true,
  "brief": {
    "campaign_title": "Radiance Reimagined",
    "objective": "Launch new luxury skincare line with AI-generated visuals that blend nature and technology, targeting Gen Z consumers who value sustainability and innovation.",
    "content_type": "Film",
    "style": "Cinematic",
    "aspect_ratios": ["9:16", "1:1"],
    "duration_seconds": 30,
    "resolution": "4K",
    "quantity": 3,
    "tools_preferred": ["Runway", "Midjourney", "ElevenLabs"],
    "reference_links": [],
    "budget_min": 2500,
    "budget_max": 5000,
    "deadline": "2024-03-15",
    "commercial_use": {
      "allowed": true,
      "attribution": false,
      "exclusivity": true,
      "territory": "Worldwide"
    },
    "negative_keywords": ["harsh lighting", "clinical", "sterile"],
    "generated_by_ai": true,
    "raw_idea": "A cinematic 30-second ad for a luxury skincare brand targeting Gen Z women"
  }
}
```

**Status Codes**:
- `200`: Brief generated
- `400`: Invalid input
- `401`: Unauthorized (not logged in or not a brand)
- `500`: AI generation failed (fallback to rule-based)

**Notes**:
- If Gemini API fails, uses rule-based fallback (lib/briefFallback.ts)
- Gemini API key is optional — app works without it

---

## Proposals

---

### POST `/api/proposals`

Submit proposal for a brief.

#### Authentication

Required (Creator only).

#### Request

```json
{
  "brief_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "I'd love to work on this project. I have extensive experience with luxury brand films using Runway and Midjourney.",
  "price": 3500,
  "timeline_days": 10
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brief_id | UUID | ✅ | Brief ID |
| message | string | ✅ | Proposal message (50-1000 chars) |
| price | number | ✅ | Price in USD |
| timeline_days | number | ✅ | Delivery timeline in days |

#### Response (Success)

```json
{
  "success": true,
  "proposal": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "brief_id": "550e8400-e29b-41d4-a716-446655440000",
    "creator_id": "770e8400-e29b-41d4-a716-446655440000",
    "message": "I'd love to work on this project...",
    "price": 3500,
    "timeline_days": 10,
    "status": "Pending",
    "created_at": "2024-01-20T14:30:00Z"
  }
}
```

**Status Codes**:
- `201`: Proposal submitted
- `400`: Validation error
- `401`: Unauthorized
- `409`: Proposal already exists for this brief
- `500`: Server error

---

### GET `/api/proposals`

Fetch proposals (for creator or brand).

#### Authentication

Required.

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| brief_id | UUID | Filter by brief (brand use) |
| creator_id | UUID | Filter by creator (brand use) |
| status | string | Filter by status: Pending, Accepted, Rejected |

#### Request Example

```
GET /api/proposals?brief_id=550e8400-e29b-41d4-a716-446655440000&status=Pending
```

#### Response (Success)

```json
{
  "success": true,
  "proposals": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "brief": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "campaign_title": "Radiance Reimagined"
      },
      "creator": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Aryan Kapoor",
        "handle": "@aryankapoor",
        "avatar_url": "https://...",
        "rating": 4.9
      },
      "message": "I'd love to work on this project...",
      "price": 3500,
      "timeline_days": 10,
      "status": "Pending",
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "total": 3
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### PATCH `/api/proposals/[id]`

Update proposal status (brand only).

#### Authentication

Required (Brand only, must own the brief).

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Proposal ID |

#### Request

```json
{
  "status": "Accepted"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | ✅ | "Accepted" or "Rejected" |

#### Response (Success)

```json
{
  "success": true,
  "proposal": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "Accepted",
    "updated_at": "2024-01-21T10:00:00Z"
  }
}
```

**Status Codes**:
- `200`: Status updated
- `400`: Invalid status
- `401`: Unauthorized
- `403`: Forbidden (not your brief)
- `404`: Proposal not found
- `500`: Server error

---

## Messages

---

### GET `/api/messages`

Fetch messages for a conversation.

#### Authentication

Required.

#### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversationId | UUID | ✅ | Conversation ID (or recipient user ID) |
| limit | number | ❌ | Max messages to fetch (default: 50) |

#### Request Example

```
GET /api/messages?conversationId=880e8400-e29b-41d4-a716-446655440000&limit=50
```

#### Response (Success)

```json
{
  "success": true,
  "messages": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "conversation_id": "880e8400-e29b-41d4-a716-446655440000",
      "sender": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Arjun Mehta",
        "avatar_url": "https://..."
      },
      "recipient": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Aryan Kapoor",
        "avatar_url": "https://..."
      },
      "content": "Hi Aryan, I'd like to discuss the brief details.",
      "read_at": null,
      "created_at": "2024-01-20T15:30:00Z"
    }
  ],
  "total": 12,
  "unread_count": 3
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (not your conversation)
- `500`: Server error

---

### POST `/api/messages`

Send a message.

#### Authentication

Required.

#### Request

```json
{
  "recipient_id": "770e8400-e29b-41d4-a716-446655440000",
  "content": "Hi Aryan, I'd like to discuss the brief details."
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recipient_id | UUID | ✅ | Recipient user ID |
| content | string | ✅ | Message text (1-2000 chars) |

#### Response (Success)

```json
{
  "success": true,
  "message": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "conversation_id": "880e8400-e29b-41d4-a716-446655440000",
    "sender_id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient_id": "770e8400-e29b-41d4-a716-446655440000",
    "content": "Hi Aryan, I'd like to discuss the brief details.",
    "created_at": "2024-01-20T15:30:00Z"
  }
}
```

**Status Codes**:
- `201`: Message sent
- `400`: Validation error
- `401`: Unauthorized
- `500`: Server error

**Notes**:
- Real-time update sent via Supabase Realtime to recipient
- Unread count incremented for recipient

---

### PATCH `/api/messages/[id]`

Mark message as read.

#### Authentication

Required (recipient only).

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Message ID |

#### Request

No body required.

```
PATCH /api/messages/990e8400-e29b-41d4-a716-446655440000
```

#### Response (Success)

```json
{
  "success": true,
  "message": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "read_at": "2024-01-20T16:00:00Z"
  }
}
```

**Status Codes**:
- `200`: Marked as read
- `401`: Unauthorized
- `403`: Forbidden (not recipient)
- `404`: Message not found
- `500`: Server error

---

## Reviews

---

### GET `/api/reviews`

Fetch reviews for a creator.

#### Authentication

Optional.

#### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| creator_id | UUID | ✅ | Creator profile ID |
| limit | number | ❌ | Max reviews to fetch (default: 20) |

#### Request Example

```
GET /api/reviews?creator_id=770e8400-e29b-41d4-a716-446655440000&limit=10
```

#### Response (Success)

```json
{
  "success": true,
  "reviews": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "brief": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "campaign_title": "Radiance Reimagined"
      },
      "brand": {
        "id": "bb0e8400-e29b-41d4-a716-446655440000",
        "company_name": "Luxe Beauty Co.",
        "avatar_url": "https://..."
      },
      "rating": 5,
      "comment": "Aryan exceeded expectations. The final video was stunning and delivered ahead of schedule.",
      "created_at": "2024-01-25T12:00:00Z"
    }
  ],
  "average_rating": 4.9,
  "total_reviews": 23
}
```

**Status Codes**:
- `200`: Success
- `404`: Creator not found
- `500`: Server error

---

### POST `/api/reviews`

Submit a review (brand only, post-engagement).

#### Authentication

Required (Brand only).

#### Request

```json
{
  "brief_id": "550e8400-e29b-41d4-a716-446655440000",
  "creator_id": "770e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "comment": "Aryan exceeded expectations. The final video was stunning and delivered ahead of schedule."
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brief_id | UUID | ✅ | Brief ID |
| creator_id | UUID | ✅ | Creator profile ID |
| rating | number | ✅ | 1-5 stars |
| comment | string | ✅ | Review text (50-1000 chars) |

#### Response (Success)

```json
{
  "success": true,
  "review": {
    "id": "aa0e8400-e29b-41d4-a716-446655440000",
    "brief_id": "550e8400-e29b-41d4-a716-446655440000",
    "creator_id": "770e8400-e29b-41d4-a716-446655440000",
    "brand_id": "bb0e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "comment": "Aryan exceeded expectations...",
    "created_at": "2024-01-25T12:00:00Z"
  }
}
```

**Status Codes**:
- `201`: Review submitted
- `400`: Validation error (invalid rating, text too short)
- `401`: Unauthorized
- `403`: Forbidden (not hired this creator, or already reviewed)
- `500`: Server error

**Notes**:
- Brand can only review if they accepted a proposal from this creator
- One review per engagement (brief + creator pair)

---

## Verifications

---

### GET `/api/verifications`

Fetch pending verification requests (admin only).

#### Authentication

Required (Admin only).

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| status | string | Filter by status: pending, approved, rejected (default: pending) |

#### Request Example

```
GET /api/verifications?status=pending
```

#### Response (Success)

```json
{
  "success": true,
  "verifications": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "creator": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Aryan Kapoor",
        "handle": "@aryankapoor",
        "avatar_url": "https://..."
      },
      "verification_type": "tools",
      "status": "pending",
      "evidence_url": "https://example.com/proof.jpg",
      "created_at": "2024-01-22T09:00:00Z"
    }
  ],
  "total": 5
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `500`: Server error

---

### POST `/api/verifications`

Submit verification request (creator only).

#### Authentication

Required (Creator only).

#### Request

```json
{
  "verification_type": "tools",
  "evidence_url": "https://example.com/runway-subscription-proof.jpg"
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| verification_type | string | ✅ | "tools", "workflow", or "past_work" |
| evidence_url | string | ✅ | URL to proof (screenshot, portfolio link) |

#### Response (Success)

```json
{
  "success": true,
  "verification": {
    "id": "cc0e8400-e29b-41d4-a716-446655440000",
    "creator_id": "770e8400-e29b-41d4-a716-446655440000",
    "verification_type": "tools",
    "status": "pending",
    "evidence_url": "https://example.com/runway-subscription-proof.jpg",
    "created_at": "2024-01-22T09:00:00Z"
  }
}
```

**Status Codes**:
- `201`: Request submitted
- `400`: Validation error
- `401`: Unauthorized
- `409`: Already verified for this type
- `500`: Server error

---

### PATCH `/api/verifications/[id]`

Approve or reject verification (admin only).

#### Authentication

Required (Admin only).

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Verification request ID |

#### Request

```json
{
  "status": "approved",
  "admin_notes": "Verified Runway Pro subscription screenshot. Evidence is clear and recent."
}
```

**Body Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | ✅ | "approved" or "rejected" |
| admin_notes | string | ❌ | Admin comments (shown to creator) |

#### Response (Success)

```json
{
  "success": true,
  "verification": {
    "id": "cc0e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "admin_notes": "Verified Runway Pro subscription screenshot. Evidence is clear and recent.",
    "reviewed_by": "dd0e8400-e29b-41d4-a716-446655440000",
    "reviewed_at": "2024-01-22T14:00:00Z"
  }
}
```

**Status Codes**:
- `200`: Status updated
- `400`: Invalid status
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `404`: Verification not found
- `500`: Server error

**Notes**:
- Approval updates `creator_profiles.verification` JSONB field
- Rejection sends notification to creator with admin notes

---

## Error Codes

### Standard Error Response

All errors follow this format:

```json
{
  "error": "Brief error message",
  "details": "Detailed error explanation (optional)",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Not logged in or invalid token |
| 403 | Forbidden | Logged in but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 410 | Gone | Resource expired (e.g., OTP expired) |
| 500 | Internal Server Error | Server error (check logs) |

### Custom Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `AUTH_EMAIL_EXISTS` | 409 | Email already registered |
| `AUTH_OTP_EXPIRED` | 410 | OTP code expired (15-min window) |
| `AUTH_OTP_INVALID` | 400 | OTP code incorrect |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | User role not allowed for this action |
| `VALIDATION_ERROR` | 400 | Input validation failed (see details) |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests (implement in production) |
| `BRIEF_GENERATION_FAILED` | 500 | Gemini API failed (fallback used) |
| `ALREADY_REVIEWED` | 409 | Brand already submitted review for this engagement |
| `NOT_HIRED` | 403 | Brand cannot review creator they didn't hire |

### Example Error Responses

**Validation Error**:

```json
{
  "error": "Validation error",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  },
  "code": "VALIDATION_ERROR"
}
```

**Unauthorized**:

```json
{
  "error": "Unauthorized",
  "details": "You must be logged in to access this resource",
  "code": "AUTH_UNAUTHORIZED"
}
```

**Not Found**:

```json
{
  "error": "Creator not found",
  "details": "No creator profile exists with ID: 550e8400-e29b-41d4-a716-446655440000",
  "code": "RESOURCE_NOT_FOUND"
}
```

---

## Rate Limiting

**Current**: No rate limiting implemented (free tier suitable for hackathon).

**Production Recommendation**:
- Implement rate limiting via Cloudflare or middleware
- Suggested limits:
  - Unauthenticated: 50 requests/min
  - Authenticated: 200 requests/min
  - Admin: 500 requests/min

---

## Pagination

Large list endpoints support pagination (future enhancement):

**Query Parameters**:
- `page`: Page number (1-indexed)
- `perPage`: Items per page (default: 20, max: 100)

**Response Headers**:
- `X-Total-Count`: Total items
- `X-Page`: Current page
- `X-Per-Page`: Items per page
- `Link`: Next/prev page URLs

---

## Webhooks (Future)

**Planned Events**:
- `proposal.submitted` — New proposal on brand's brief
- `proposal.accepted` — Proposal accepted by brand
- `message.received` — New message received
- `verification.approved` — Verification request approved

**Format**:

```json
{
  "event": "proposal.submitted",
  "timestamp": "2024-01-20T14:30:00Z",
  "data": {
    "proposal_id": "660e8400-e29b-41d4-a716-446655440000",
    "brief_id": "550e8400-e29b-41d4-a716-446655440000",
    "creator_id": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

**Last Updated**: January 2024  
**API Version**: 2.0.0  
**Contact**: team@cinegen.com

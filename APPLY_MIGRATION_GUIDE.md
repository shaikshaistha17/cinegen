# Quick Start: Apply Director Persistence Migration

## ⚡ 5-Minute Setup Guide

### Step 1: Apply Database Migration (2 minutes)

1. **Open Supabase Dashboard**
   ```
   https://app.supabase.com
   ```

2. **Go to SQL Editor**
   - Left sidebar → "SQL Editor"
   - Click "New query"

3. **Copy & Run Migration**
   - Open file: `database/migrations/007_director_conversations.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" button (or Cmd+Enter / Ctrl+Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Left sidebar → "Table Editor"
   - Verify these tables exist:
     - `director_conversations`
     - `director_messages`

### Step 2: Test Basic Functionality (3 minutes)

1. **Ensure Dev Server Running**
   ```bash
   npm run dev
   ```
   - Should be at: http://localhost:3001

2. **Login** (use existing account or create test account)
   - Brand or Creator account both work

3. **Chat with Director**
   - Go to landing page
   - Enable "Type Instead" mode
   - Type: "Help me create a campaign"
   - Press Enter
   - Wait for response

4. **Test Persistence**
   - Click "Discover" in navbar
   - Click browser back button
   - **✅ VERIFY:** Your conversation is still there!

5. **Test Refresh**
   - Press F5 or Cmd+R to refresh page
   - **✅ VERIFY:** Conversation loads from database

---

## ✅ Success Criteria

**If these work, migration is successful:**
- [x] Messages persist after navigation
- [x] Messages persist after browser refresh  
- [x] No TypeScript errors in build
- [x] Can see rows in Supabase `director_conversations` table

---

## 🐛 Troubleshooting

### Error: "relation 'auth.users' does not exist"

**Fix:** Migration references `auth.users` (Supabase Auth table).
Change line 11 in migration file from:
```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
```
To:
```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

Then re-run migration.

### Error: "function update_updated_at_column does not exist"

**Fix:** This trigger function should already exist from previous migrations.
If not, add this before the trigger creation:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Conversations Not Loading

1. **Check browser console for errors** (F12 → Console tab)
2. **Verify authentication** (make sure you're logged in)
3. **Check Network tab** (F12 → Network)
   - Look for requests to `/api/director/conversations`
   - Should return 200 status, not 401 or 500

### Messages Not Persisting

1. **Check Supabase logs** (Dashboard → Logs → API)
2. **Verify RLS policies** (Table Editor → Policies tab)
   - Should see 4 policies on `director_conversations`
   - Should see 3 policies on `director_messages`

---

## 📊 Verify in Database

After chatting, check Supabase dashboard:

1. **Table Editor → director_conversations**
   - Should see 1 row with your user_id
   - `title` should be first message truncated
   - `last_message_at` should be recent

2. **Table Editor → director_messages**
   - Should see 2+ rows (your message + assistant reply)
   - `role` should be 'user' and 'assistant'
   - `content` should be your conversation
   - `input_source` should be 'text' or 'voice'

---

## 🎯 Next: Full Testing

Once basic functionality works, proceed to full testing:

See: `DIRECTOR_PERSISTENCE_IMPLEMENTATION.md` Section 7: Testing Requirements

**9 Comprehensive Test Scenarios:**
1. Basic Persistence
2. Navigation Persistence
3. Browser Refresh
4. Logout/Login
5. Account Isolation
6. Cross-Device
7. Unauthorized Access
8. Voice Input Persistence
9. Failed Save Retry

---

## 📞 Support

**If migration fails:**
1. Check error message in Supabase SQL Editor
2. Review troubleshooting section above
3. Check existing migrations for dependency issues
4. Verify Supabase project is using PostgreSQL 15+

**If persistence doesn't work:**
1. Verify build succeeded: `npm run build`
2. Check browser console for errors
3. Verify user is authenticated (check `/api/director/conversations` in Network tab)
4. Check Supabase RLS policies are active

---

**Estimated Total Time:** 5 minutes  
**Difficulty:** Easy (copy-paste migration)  
**Risk:** Low (creates new tables, doesn't modify existing ones)  
**Rollback:** Simple (drop tables if needed)

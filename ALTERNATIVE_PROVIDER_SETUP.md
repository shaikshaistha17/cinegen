# Alternative AI Provider Setup Guide

## Current Situation

**Primary Provider**: Google Gemini (`gemini-3.1-flash-lite`)  
**Status**: ⚠️ Returning 503 errors due to high demand  
**Blocker**: Google service availability (external to our application)

This document explains how to configure alternative AI providers if Gemini remains unavailable.

---

## Option 1: OpenAI (GPT-4, GPT-3.5)

### Pros
- Highly reliable uptime
- Excellent conversational abilities
- Fast response times
- Well-documented API

### Cons
- Requires paid account (no free tier)
- ~$0.50-2.00 per million tokens (depending on model)

### Setup Steps

1. **Get API Key**
   ```bash
   # Visit: https://platform.openai.com/api-keys
   # Create account and add payment method
   # Generate new API key
   ```

2. **Add to Environment**
   ```bash
   # Add to .env.local
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
   ```

3. **Install Package**
   ```bash
   npm install openai
   ```

4. **Create Adapter** (`/lib/ai/openai-provider.ts`)
   ```typescript
   import OpenAI from 'openai';
   
   export async function generateOpenAIResponse(
     message: string,
     history: Array<{role: string, text: string}>,
     systemPrompt: string,
     signal?: AbortSignal
   ) {
     const openai = new OpenAI({
       apiKey: process.env.OPENAI_API_KEY,
     });
     
     const messages = [
       { role: 'system', content: systemPrompt },
       ...history.map(h => ({ 
         role: h.role === 'user' ? 'user' : 'assistant', 
         content: h.text 
       })),
       { role: 'user', content: message }
     ];
     
     const completion = await openai.chat.completions.create({
       model: 'gpt-3.5-turbo', // or 'gpt-4'
       messages,
       temperature: 0.8,
       max_tokens: 2048,
       response_format: { type: "json_object" }
     }, { signal });
     
     const content = completion.choices[0]?.message?.content || '{}';
     return JSON.parse(content);
   }
   ```

5. **Update Route** (`/app/api/director/chat/route.ts`)
   ```typescript
   // Import at top
   import { generateOpenAIResponse } from '@/lib/ai/openai-provider';
   
   // In generateConversationalResponse function, replace Gemini call:
   const parsed = await generateOpenAIResponse(
     message,
     history,
     fullPrompt,
     controller.signal
   );
   ```

### Cost Estimate
- **gpt-3.5-turbo**: ~$0.50 per 1M tokens (~2,000 conversations)
- **gpt-4**: ~$2.00 per 1M tokens (~500 conversations)

---

## Option 2: Anthropic (Claude)

### Pros
- Excellent at following instructions
- Strong conversation abilities
- Good safety/refusal handling
- Reasonable pricing

### Cons
- Requires paid account
- Slightly slower than OpenAI

### Setup Steps

1. **Get API Key**
   ```bash
   # Visit: https://console.anthropic.com/
   # Create account and add payment method
   # Generate API key
   ```

2. **Add to Environment**
   ```bash
   # Add to .env.local
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
   ```

3. **Install Package**
   ```bash
   npm install @anthropic-ai/sdk
   ```

4. **Create Adapter** (`/lib/ai/anthropic-provider.ts`)
   ```typescript
   import Anthropic from '@anthropic-ai/sdk';
   
   export async function generateAnthropicResponse(
     message: string,
     history: Array<{role: string, text: string}>,
     systemPrompt: string,
     signal?: AbortSignal
   ) {
     const anthropic = new Anthropic({
       apiKey: process.env.ANTHROPIC_API_KEY,
     });
     
     const messages = [
       ...history.map(h => ({ 
         role: h.role === 'user' ? 'user' : 'assistant', 
         content: h.text 
       })),
       { role: 'user', content: message }
     ];
     
     const response = await anthropic.messages.create({
       model: 'claude-3-haiku-20240307', // Fast, affordable
       max_tokens: 2048,
       system: systemPrompt,
       messages,
     });
     
     const content = response.content[0].text;
     return JSON.parse(content);
   }
   ```

5. **Update Route** (same as OpenAI pattern)

### Cost Estimate
- **Claude 3 Haiku**: ~$0.25 per 1M tokens (~4,000 conversations)
- **Claude 3 Sonnet**: ~$3.00 per 1M tokens

---

## Option 3: Groq (Fast Open Models)

### Pros
- ✅ **Free tier available** (7,000 requests/day)
- Extremely fast inference
- No credit card required initially
- Good for development/testing

### Cons
- Less consistent than GPT-4/Claude
- Rate limits on free tier
- Models change frequently

### Setup Steps

1. **Get API Key**
   ```bash
   # Visit: https://console.groq.com/
   # Sign up (no payment required for free tier)
   # Create API key
   ```

2. **Add to Environment**
   ```bash
   # Add to .env.local
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   ```

3. **Install Package**
   ```bash
   npm install groq-sdk
   ```

4. **Create Adapter** (`/lib/ai/groq-provider.ts`)
   ```typescript
   import Groq from 'groq-sdk';
   
   export async function generateGroqResponse(
     message: string,
     history: Array<{role: string, text: string}>,
     systemPrompt: string,
     signal?: AbortSignal
   ) {
     const groq = new Groq({
       apiKey: process.env.GROQ_API_KEY,
     });
     
     const messages = [
       { role: 'system', content: systemPrompt },
       ...history.map(h => ({ 
         role: h.role === 'user' ? 'user' : 'assistant', 
         content: h.text 
       })),
       { role: 'user', content: message }
     ];
     
     const completion = await groq.chat.completions.create({
       model: 'llama-3.1-70b-versatile', // or mixtral-8x7b-32768
       messages,
       temperature: 0.8,
       max_tokens: 2048,
       response_format: { type: "json_object" }
     });
     
     const content = completion.choices[0]?.message?.content || '{}';
     return JSON.parse(content);
   }
   ```

5. **Update Route** (same as OpenAI pattern)

### Free Tier Limits
- 7,000 requests per day
- 400 requests per minute
- Sufficient for development and testing

---

## Option 4: Multi-Provider Fallback

For maximum reliability, implement fallback chain:

### Setup
```typescript
// /lib/ai/multi-provider.ts
export async function generateWithFallback(
  message: string,
  history: Array<{role: string, text: string}>,
  systemPrompt: string,
  signal?: AbortSignal
) {
  const providers = [
    { name: 'gemini', fn: generateGeminiResponse, enabled: !!process.env.GEMINI_API_KEY },
    { name: 'groq', fn: generateGroqResponse, enabled: !!process.env.GROQ_API_KEY },
    { name: 'openai', fn: generateOpenAIResponse, enabled: !!process.env.OPENAI_API_KEY },
  ].filter(p => p.enabled);
  
  let lastError;
  
  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      return await provider.fn(message, history, systemPrompt, signal);
    } catch (err) {
      console.warn(`[AI] ${provider.name} failed:`, err);
      lastError = err;
      // Continue to next provider
    }
  }
  
  throw lastError || new Error('All AI providers unavailable');
}
```

### Benefits
- Automatic failover when one provider is down
- Use free tier (Groq) as backup for paid (OpenAI)
- No single point of failure

---

## Decision Matrix

| Provider | Free Tier | Quality | Speed | Setup Complexity |
|----------|-----------|---------|-------|------------------|
| **Gemini** | ✅ Yes | ⭐⭐⭐⭐ | Fast | ✅ Already configured |
| **Groq** | ✅ Yes | ⭐⭐⭐ | Very Fast | 🟨 Easy |
| **OpenAI** | ❌ No | ⭐⭐⭐⭐⭐ | Fast | 🟨 Easy |
| **Anthropic** | ❌ No | ⭐⭐⭐⭐⭐ | Medium | 🟨 Easy |

---

## Recommendation

### For Development/Testing
**Use Groq (free tier)**:
- No cost
- Fast setup
- Good enough for testing conversational flow
- Easy to switch to paid later

### For Production
**Use OpenAI gpt-3.5-turbo** or **Anthropic Claude Haiku**:
- Reliable uptime
- High quality responses
- Affordable pricing
- Professional support

### For Maximum Reliability
**Implement multi-provider fallback**:
- Groq (free) → OpenAI (paid) fallback chain
- Best of both worlds

---

## Important Notes

### Data Privacy
- All providers process conversation data on their servers
- Review each provider's data usage policy
- Gemini, OpenAI, Anthropic, Groq all have commercial/API terms
- No provider trains on API data (unlike free web interfaces)

### Rate Limiting
Update `/lib/ai/rateLimit.ts` if switching providers:
- Groq: 400 req/min
- OpenAI: 3,500 req/min (tier 1)
- Anthropic: 1,000 req/min (tier 1)

### Testing Required
After switching providers, test:
1. Casual conversation
2. Multi-turn context
3. JSON response format
4. Language switching
5. Error handling

---

## No Action Required

**If you're waiting for Gemini to recover**: No changes needed. The current implementation will work automatically once Google resolves the 503 errors.

**If you want an alternative**: Choose from options above based on your needs (free vs. paid, quality vs. speed).

---

**Last Updated**: 2026-10-19  
**Current Status**: Gemini configured, awaiting availability  
**Free Alternative**: Groq (recommended for testing)

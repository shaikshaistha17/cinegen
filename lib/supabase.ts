import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - only create when needed
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

// Helper to safely access cookies
function getCookieHandler() {
  if (typeof document === 'undefined') {
    // During SSR/build, return no-op handlers
    return {
      get: () => null,
      set: () => {},
      remove: () => {},
    };
  }

  // Browser environment - real cookie handlers
  return {
    get: (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    },
    set: (name: string, value: string, options?: { maxAge?: number; path?: string }) => {
      const maxAge = options?.maxAge || 60 * 60 * 24 * 7; // 7 days default
      const path = options?.path || '/';
      document.cookie = `${name}=${value}; max-age=${maxAge}; path=${path}; SameSite=Lax`;
    },
    remove: (name: string, options?: { path?: string }) => {
      const path = options?.path || '/';
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
    },
  };
}

// Client-side Supabase client for use in client components
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: getCookieHandler(),
      }
    )
  : null as any; // Server-side builds won't use this

// Create client-side browser client (for client components)
export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: getCookieHandler(),
      }
    );
  }
  return clientInstance;
}

// Service role client with admin privileges (use only in secure server contexts)
export function createServiceClient() {
  // Only available at runtime on server
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing. Check your environment variables.');
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
    }

    if (data.session) {
      // Get user role from database
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (userData?.role) {
        // Set role cookie for middleware
        response.cookies.set('cinegen_role', userData.role, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'lax',
        });
      }
    }

    return response;
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

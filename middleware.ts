import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // Create Supabase client for middleware
  const supabase = createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Fallback to cookie-based role for demo mode
  const cookieRole = req.cookies.get("cinegen_role")?.value;

  // Determine user role
  let role: string | null = cookieRole || null;
  
  if (session?.user) {
    // Fetch role from database
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (userData) {
      role = userData.role;
    }
  }

  const brandOnlyRoutes = ["/briefs/new"];
  const authRequiredRoutes = ["/dashboard", "/briefs"];

  // Check brand-only routes
  if (brandOnlyRoutes.some((r) => path.startsWith(r)) && role !== "brand") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check auth-required routes
  if (authRequiredRoutes.some((r) => path === r || path.startsWith(r + "/")) && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/briefs/:path*"],
};

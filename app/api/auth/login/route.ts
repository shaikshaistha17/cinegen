import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase';

// Demo credentials - all use Demo@123
const DEMO_ACCOUNTS = [
  'brand@cinegen.demo',
  'creator@cinegen.demo',
  'aryan@cinegen.demo',
  'priya@cinegen.demo',
  'rohan@cinegen.demo',
  'ananya@cinegen.demo',
  'vivek@cinegen.demo',
  'kavya@cinegen.demo',
  'aditya@cinegen.demo',
  'shreya@cinegen.demo',
  'nikhil@cinegen.demo',
  'tanvi@cinegen.demo',
  'karthik@cinegen.demo',
  'meera@cinegen.demo',
  'riya@cinegen.demo',
  'arjun@cinegen.demo',
  'pooja@cinegen.demo',
  'ishaan@cinegen.demo',
  'rahul@cinegen.demo',
  'zara@cinegen.demo',
  'marcus@cinegen.demo',
  'anjali@cinegen.demo',
  'vikram@cinegen.demo',
  'lena@cinegen.demo',
  'dev@cinegen.demo',
  'yuna@cinegen.demo',
  'aisha@cinegen.demo',
  'sameer@cinegen.demo',
  'carlos@cinegen.demo',
  'tanvir@cinegen.demo',
  'natasha@cinegen.demo',
];

const DEMO_PASSWORD = 'Demo@123';

// Helper to check if Supabase is configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return false;
  if (url.includes('placeholder')) return false;
  if (!url.startsWith('https://')) return false;
  if (!url.includes('supabase.co')) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const localUsers = body.localUsers === true;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();
    const isDemoAccount = DEMO_ACCOUNTS.includes(emailLower);
    
    // LOCAL MODE: Check localStorage users first if Supabase not configured
    if (!isSupabaseConfigured() && localUsers && !isDemoAccount) {
      console.warn('⚠️ Login in LOCAL mode (Supabase not configured)');
      return NextResponse.json({
        localMode: true,
        checkLocalStorage: true,
      });
    }

    // Handle demo accounts
    // IMPORTANT: Demo accounts use regular Supabase auth with the anon key
    // This ensures they respect RLS policies and have restricted permissions
    if (isDemoAccount && password === DEMO_PASSWORD) {
      try {
        // Use regular anon client for demo accounts (respects RLS)
        const supabase = createClient();
        
        // Authenticate with Supabase Auth (this creates a proper JWT)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: DEMO_PASSWORD,
        });

        if (error) {
          return NextResponse.json(
            { error: 'Demo account authentication failed. Ensure demo accounts exist in Supabase Auth.' },
            { status: 401 }
          );
        }

        if (!data.session) {
          return NextResponse.json(
            { error: 'Failed to create demo session' },
            { status: 500 }
          );
        }

        // Get user details from database using authenticated session
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, name, is_demo')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          return NextResponse.json(
            { error: 'Demo account not found in database. Please run db:seed.' },
            { status: 404 }
          );
        }

        // Verify this is actually marked as a demo account
        if (!userData.is_demo) {
          console.warn(`Account ${emailLower} used demo password but is_demo flag is false`);
        }

        // Get profile ID using authenticated session
        let profileId: string | undefined;
        if (userData.role === 'creator') {
          const { data: profile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', userData.id)
            .single();
          profileId = profile?.id;
        } else if (userData.role === 'brand') {
          const { data: profile } = await supabase
            .from('brand_profiles')
            .select('id')
            .eq('user_id', userData.id)
            .single();
          profileId = profile?.id;
        }

        // Return demo session with actual Supabase auth
        return NextResponse.json({
          isDemo: true,
          session: data.session,
          user: {
            ...userData,
            id: data.user.id,
          },
          profileId,
        });
      } catch (error: any) {
        console.error('Demo login error:', error);
        return NextResponse.json(
          { error: 'Failed to authenticate demo account' },
          { status: 500 }
        );
      }
    }

    // Handle regular login with Supabase auth
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: data.session,
      user: data.user,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

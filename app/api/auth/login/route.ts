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
    if (isDemoAccount && password === DEMO_PASSWORD) {
      try {
        const serviceClient = createServiceClient();
        
        // Get user from database
        const { data: userData, error: userError } = await serviceClient
          .from('users')
          .select('id, email, role, name')
          .eq('email', emailLower)
          .single();

        if (userError || !userData) {
          return NextResponse.json(
            { error: 'Demo account not found in database. Please run db:seed.' },
            { status: 404 }
          );
        }

        // Get profile ID
        let profileId: string | undefined;
        if (userData.role === 'creator') {
          const { data: profile } = await serviceClient
            .from('creator_profiles')
            .select('id')
            .eq('user_id', userData.id)
            .single();
          profileId = profile?.id;
        } else if (userData.role === 'brand') {
          const { data: profile } = await serviceClient
            .from('brand_profiles')
            .select('id')
            .eq('user_id', userData.id)
            .single();
          profileId = profile?.id;
        }

        // Return demo session data (without actual Supabase auth session for demo)
        return NextResponse.json({
          isDemo: true,
          user: userData,
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

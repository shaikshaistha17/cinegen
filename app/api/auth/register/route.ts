import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-helpers';
import { sendWelcomeEmail } from '@/lib/email';

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
    const { email, password, role, name, companyName } = body;

    // Validate input
    if (!email || !password || !role || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, role, name' },
        { status: 400 }
      );
    }

    if (role === 'brand' && !companyName) {
      return NextResponse.json(
        { error: 'Company name is required for brand accounts' },
        { status: 400 }
      );
    }

    if (!['brand', 'creator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "brand" or "creator"' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    
    // LOCAL MODE: If Supabase not configured, use localStorage fallback
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Registration in LOCAL mode (Supabase not configured)');
      
      // Generate user ID
      const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Return user data for client-side localStorage storage
      return NextResponse.json({
        localMode: true,
        user: {
          id: userId,
          email,
          password_hash: passwordHash,
          role,
          name,
          created_at: new Date().toISOString(),
        },
        message: 'Account created successfully (local mode)',
      });
    }

    const supabase = createClient();

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Insert into users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        password_hash: passwordHash,
        role,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (userError) {
      console.error('Error inserting user:', userError);
      // Continue even if this fails - user is created in auth
    }

    // Insert into role-specific profile table
    if (role === 'creator') {
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .insert({
          user_id: authData.user.id,
          handle: email.split('@')[0],
          headline: 'AI Creator',
          bio: '',
          location: '',
          hourly_rate_usd: 50,
          availability: 'Available',
          verified_tools: [],
          languages: ['English'],
          stats: {
            projectsCompleted: 0,
            avgRating: 0,
            repeatClientRate: 0,
            responseTime: '< 1h',
          },
          verification: {
            toolsVerified: false,
            workflowVerified: false,
            pastWorkVerified: false,
            badge: 'Unverified',
          },
          joined_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating creator profile:', profileError);
      }
    } else if (role === 'brand') {
      const { error: profileError } = await supabase
        .from('brand_profiles')
        .insert({
          user_id: authData.user.id,
          company_name: companyName || name,
          website: '',
          industry: '',
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating brand profile:', profileError);
      }
    }

    // Send welcome email (non-blocking, only in Supabase mode)
    if (authData.user) {
      try {
        await sendWelcomeEmail(authData.user.email!, name);
      } catch (emailError) {
        // Log but don't fail registration
        console.error('Failed to send welcome email:', emailError);
      }
    }

    // Check if email confirmation is required
    if (authData.session) {
      return NextResponse.json({
        user: authData.user,
        session: authData.session,
      });
    } else {
      return NextResponse.json({
        message: 'Check your email for verification link',
        user: authData.user,
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

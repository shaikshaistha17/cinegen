import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Password strength validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUppercase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain at least 1 uppercase letter and 1 number' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get current user from session (Supabase verifies the token from magic link automatically)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 401 }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to reset password' },
        { status: 400 }
      );
    }

    // Update password hash in users table
    try {
      const passwordHash = await hashPassword(password);
      await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Failed to update password hash in users table:', error);
      // Continue - auth password is updated, table update is secondary
    }

    return NextResponse.json({
      message: 'Password reset successful',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

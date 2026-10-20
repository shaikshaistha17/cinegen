import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-helpers';
import { validatePassword } from '@/lib/password-validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    // Validate password requirements using shared utility
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
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

    // Update password hash in users table to stay in sync
    // Retry logic: if this fails, Auth has the new password but table has old hash
    // We retry up to 3 times with exponential backoff to minimize inconsistency risk
    // Exponential backoff: 100ms, 200ms before final attempt
    const passwordHash = await hashPassword(password);
    let tableUpdateSuccess = false;
    let lastError = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: tableError } = await supabase
        .from('users')
        .update({ 
          password_hash: passwordHash, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (!tableError) {
        tableUpdateSuccess = true;
        break;
      }
      
      lastError = tableError;
      // Exponential backoff delay before retry
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    if (!tableUpdateSuccess) {
      console.error('Failed to sync password hash to users table after 3 attempts:', lastError);
      // Auth password was updated but table sync failed
      return NextResponse.json(
        { error: 'Password updated in authentication system but database sync failed. Please try resetting your password again to complete the update.' },
        { status: 500 }
      );
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

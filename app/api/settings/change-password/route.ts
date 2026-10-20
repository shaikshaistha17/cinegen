import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { verifyPassword, hashPassword } from '@/lib/auth-helpers';
import { validatePassword } from '@/lib/password-validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password requirements using shared utility
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get current user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    // Check if demo account
    if (user.email?.toLowerCase().endsWith('@cinegen.demo')) {
      return NextResponse.json(
        { error: 'Demo accounts cannot change passwords. Demo password is always Demo@123' },
        { status: 403 }
      );
    }

    // Fetch current password hash from users table
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json(
        { error: 'Failed to verify current password' },
        { status: 401 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, userData.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    // Update password hash in users table to stay in sync
    // Retry logic: if this fails, Auth has the new password but table has old hash
    // We retry up to 3 times with exponential backoff to minimize inconsistency risk
    // Exponential backoff: 100ms, 200ms before final attempt
    const newPasswordHash = await hashPassword(newPassword);
    let tableUpdateSuccess = false;
    let lastError = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: tableError } = await supabase
        .from('users')
        .update({ 
          password_hash: newPasswordHash, 
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
      // User can still log in with new password (Auth is authoritative)
      // but may have issues with future password changes until hash is synced
      return NextResponse.json(
        { error: 'Password updated in authentication system but database sync failed. Please try changing your password again to complete the update.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

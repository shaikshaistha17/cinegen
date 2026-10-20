import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { verifyPassword, hashPassword } from '@/lib/auth-helpers';

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

    // Validate new password requirements
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasUppercase || !hasNumber) {
      return NextResponse.json(
        { error: 'New password must contain at least 1 uppercase letter and 1 number' },
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
        { error: 'User not found in database' },
        { status: 404 }
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
    const newPasswordHash = await hashPassword(newPassword);
    const { error: tableError } = await supabase
      .from('users')
      .update({ 
        password_hash: newPasswordHash, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);

    if (tableError) {
      console.error('Failed to update password hash in users table:', tableError);
      return NextResponse.json(
        { error: 'Failed to complete password update. Please try again.' },
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

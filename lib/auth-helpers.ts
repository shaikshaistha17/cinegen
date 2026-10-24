import bcrypt from 'bcryptjs';
import { createServiceClient } from './supabase';

/**
 * Hash a password using bcryptjs with 10 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP code with expiration (15 minutes) in database
 * Uses service role for direct database access bypassing RLS
 */
export async function storeOTP(email: string, code: string, expiresAt: Date): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('otp_verifications')
    .insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP');
  }
}

/**
 * Verify OTP code and check 15-minute expiry
 * Marks OTP as used to prevent reuse
 */
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const supabase = createServiceClient();
  
  // Find valid OTP (not expired, not used)
  const { data, error } = await supabase
    .from('otp_verifications')
    .select('id, expires_at')
    .eq('email', email.toLowerCase())
    .eq('code', code)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  // Mark OTP as used to prevent reuse
  const { error: updateError } = await supabase
    .from('otp_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);
  
  if (updateError) {
    console.error('Error marking OTP as used:', updateError);
    return false;
  }
  
  return true;
}

import bcrypt from 'bcryptjs';

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
 * Store OTP code with expiration (15 minutes)
 * In production, this should be stored in database
 */
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

export function storeOTP(email: string, code: string, expiresAt: Date): void {
  otpStore.set(email.toLowerCase(), { code, expiresAt });
}

/**
 * Verify OTP code and check 15-minute expiry
 */
export function verifyOTP(email: string, code: string): boolean {
  const stored = otpStore.get(email.toLowerCase());
  if (!stored) return false;
  
  const now = new Date();
  if (now > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  
  const isValid = stored.code === code;
  if (isValid) {
    otpStore.delete(email.toLowerCase());
  }
  
  return isValid;
}

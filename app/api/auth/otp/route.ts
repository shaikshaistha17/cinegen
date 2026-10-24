import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateOTP, storeOTP } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitResetTime } from '@/lib/rate-limit';
import { sendOTPEmail } from '@/lib/email';

/**
 * Request OTP for email verification or password reset
 * Rate limited: max 3 OTP requests per email per 15 minutes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting: max 3 OTP requests per email per 15 minutes
    const rateLimitKey = `otp:${normalizedEmail}`;
    const isAllowed = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000);

    if (!isAllowed) {
      const resetTime = getRateLimitResetTime(rateLimitKey);
      const minutes = Math.ceil(resetTime / 60);
      
      return NextResponse.json(
        { 
          error: `Too many OTP requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          retryAfter: resetTime,
        },
        { status: 429 }
      );
    }

    // Generate OTP and store in database
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await storeOTP(normalizedEmail, code, expiresAt);

    // Send OTP via email
    try {
      await sendOTPEmail(normalizedEmail, code);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Continue even if email fails - OTP is stored in database
    }

    return NextResponse.json({
      message: 'OTP sent to your email. Valid for 15 minutes.',
      expiresIn: 900, // seconds
    });
  } catch (error: any) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { verifyOTP } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, token, type } = body;

    if (!email || (!otp && !token)) {
      return NextResponse.json(
        { error: 'Email and OTP/token are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Try Supabase OTP verification first
    if (token || otp) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token || otp,
        type: type || 'email',
      });

      if (error) {
        // Fallback to our custom OTP verification
        const isValid = verifyOTP(email, otp);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid or expired OTP' },
            { status: 401 }
          );
        }

        // If custom OTP is valid, try to get session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          return NextResponse.json({
            session: sessionData.session,
            user: sessionData.session.user,
          });
        } else {
          return NextResponse.json(
            { message: 'OTP verified, please sign in' },
            { status: 200 }
          );
        }
      }

      return NextResponse.json({
        session: data.session,
        user: data.user,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

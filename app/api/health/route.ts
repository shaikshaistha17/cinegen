import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Health check endpoint for monitoring and uptime checks
 * Verifies database connectivity and returns service status
 * 
 * No authentication required - public endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const supabase = createClient();
    const { error } = await supabase.from('users').select('id').limit(1);
    
    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('Health check database error:', error);
      return NextResponse.json(
        {
          status: 'error',
          database: 'disconnected',
          error: 'Database connectivity check failed',
          timestamp: new Date().toISOString(),
          responseTimeMs: responseTime,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'unknown',
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

interface EmailPreferences {
  proposal_submitted?: boolean;
  proposal_accepted?: boolean;
  payment_received?: boolean;
  delivery_uploaded?: boolean;
  review_submitted?: boolean;
  message_received?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's email preferences
    const { data, error } = await supabase
      .from('users')
      .select('email_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    // Return preferences (default all to true if not set)
    const preferences: EmailPreferences = data?.email_preferences || {
      proposal_submitted: true,
      proposal_accepted: true,
      payment_received: true,
      delivery_uploaded: true,
      review_submitted: true,
      message_received: true,
    };

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error fetching email preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch email preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    // Validate preference keys
    const validKeys = [
      'proposal_submitted',
      'proposal_accepted',
      'payment_received',
      'delivery_uploaded',
      'review_submitted',
      'message_received',
    ];

    for (const key of Object.keys(preferences)) {
      if (!validKeys.includes(key)) {
        return NextResponse.json(
          { error: `Invalid preference key: ${key}` },
          { status: 400 }
        );
      }
      if (typeof preferences[key] !== 'boolean') {
        return NextResponse.json(
          { error: `Preference ${key} must be a boolean` },
          { status: 400 }
        );
      }
    }

    // Fetch current preferences
    const { data: currentData } = await supabase
      .from('users')
      .select('email_preferences')
      .eq('id', user.id)
      .single();

    // Merge with existing preferences (don't replace entirely)
    const currentPreferences = currentData?.email_preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    // Update preferences
    const { error } = await supabase
      .from('users')
      .update({ email_preferences: updatedPreferences })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error: any) {
    console.error('Error updating email preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update email preferences' },
      { status: 500 }
    );
  }
}

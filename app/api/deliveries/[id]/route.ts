import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createSignedDownloadUrl } from '@/lib/supabase-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliveryId = params.id;

    // Fetch delivery with agreement details
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        *,
        agreement:agreements!inner(
          id,
          brief:briefs!inner(
            brand:brand_profiles!inner(user_id)
          ),
          creator:creator_profiles!inner(user_id)
        )
      `)
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Verify user is participant
    const brandUserId = (delivery.agreement as any).brief.brand.user_id;
    const creatorUserId = (delivery.agreement as any).creator.user_id;

    if (user.id !== brandUserId && user.id !== creatorUserId) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Create signed download URL (1 hour expiry)
    const { url, error: urlError } = await createSignedDownloadUrl(delivery.file_path, 3600);

    if (urlError || !url) {
      return NextResponse.json(
        { error: `Failed to generate download URL: ${urlError}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url,
      fileName: delivery.file_name,
      mimeType: delivery.mime_type,
      fileSizeBytes: delivery.file_size_bytes,
    });
  } catch (error: any) {
    console.error('Error fetching delivery download URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch delivery' },
      { status: 500 }
    );
  }
}

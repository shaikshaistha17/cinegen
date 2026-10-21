import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { uploadDelivery } from '@/lib/supabase-storage';
import { inspectMedia } from '@/lib/mediaInspector';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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

    const { searchParams } = new URL(request.url);
    const agreementId = searchParams.get('agreementId');

    if (!agreementId) {
      return NextResponse.json(
        { error: 'Missing required parameter: agreementId' },
        { status: 400 }
      );
    }

    // Verify user is participant of the agreement
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select(`
        *,
        brief:briefs!inner(
          brand:brand_profiles!inner(user_id)
        ),
        creator:creator_profiles!inner(user_id)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const brandUserId = (agreement.brief as any).brand.user_id;
    const creatorUserId = (agreement.creator as any).user_id;

    if (user.id !== brandUserId && user.id !== creatorUserId) {
      return NextResponse.json(
        { error: 'Forbidden - You are not a participant in this agreement' },
        { status: 403 }
      );
    }

    // Fetch deliveries
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('version', { ascending: false });

    if (deliveriesError) {
      throw deliveriesError;
    }

    return NextResponse.json({ deliveries: deliveries || [] });
  } catch (error: any) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agreementId = formData.get('agreementId') as string;

    if (!file || !agreementId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, agreementId' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Fetch agreement and verify user is creator
    const { data: agreement, error: agreementError } = await supabase
      .from('agreements')
      .select(`
        *,
        creator:creator_profiles!inner(id, user_id)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const creatorUserId = (agreement.creator as any).user_id;

    if (user.id !== creatorUserId) {
      return NextResponse.json(
        { error: 'Forbidden - Only the creator can upload deliveries' },
        { status: 403 }
      );
    }

    // Determine next version number
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('version')
      .eq('agreement_id', agreementId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingDeliveries && existingDeliveries.length > 0
      ? existingDeliveries[0].version + 1
      : 1;

    // Upload to Supabase Storage
    const uploadResult = await uploadDelivery(agreementId, file, nextVersion);

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    // Save file to temp location for inspection
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const tempFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    tempFilePath = join(tmpdir(), tempFileName);
    await writeFile(tempFilePath, fileBuffer);

    // Run media inspection
    const inspectionResults = await inspectMedia(tempFilePath, agreement.deliverables);
    const inspectedAt = new Date().toISOString();

    // Clean up temp file
    await unlink(tempFilePath);
    tempFilePath = null;

    // Insert delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        agreement_id: agreementId,
        creator_id: agreement.creator_id,
        version: nextVersion,
        file_path: uploadResult.path,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        inspection_status: inspectionResults.status,
        inspection_results: inspectionResults,
        inspected_at: inspectedAt,
      })
      .select()
      .single();

    if (deliveryError) {
      throw deliveryError;
    }

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error: any) {
    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {}
    }

    console.error('Error creating delivery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create delivery' },
      { status: 500 }
    );
  }
}

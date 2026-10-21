import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Check database connectivity
    const { error: dbError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const databaseStatus = dbError ? 'error' : 'connected';
    
    // Check storage availability (use service role to list buckets)
    let storageStatus = 'available';
    let deliveriesBucketExists = false;
    
    try {
      const supabaseAdmin = createServiceClient();
      const { data: buckets, error: storageError } = await supabaseAdmin
        .storage
        .listBuckets();
      
      if (storageError) {
        storageStatus = 'error';
      } else {
        deliveriesBucketExists = buckets?.some((b: any) => b.name === 'deliveries' || b.id === 'deliveries') ?? false;
      }
    } catch (e) {
      storageStatus = 'error';
    }
    
    // Check media inspection capabilities
    let imageInspection = 'available';
    let videoInspection = 'unavailable';
    
    try {
      // Check if sharp is available (for images)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require.resolve('sharp');
      imageInspection = 'available';
    } catch {
      imageInspection = 'unavailable';
    }
    
    // Check if ffprobe is available (for videos)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require('child_process');
      execSync('which ffprobe', { stdio: 'ignore' });
      videoInspection = 'available';
    } catch {
      videoInspection = 'unavailable';
    }
    
    const isHealthy = 
      databaseStatus === 'connected' && 
      storageStatus === 'available' &&
      deliveriesBucketExists;
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
        storage: storageStatus,
        deliveriesBucket: deliveriesBucketExists ? 'exists' : 'missing',
        mediaInspection: {
          images: imageInspection,
          videos: videoInspection
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 });
  }
}

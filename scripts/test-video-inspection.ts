/**
 * Test script to verify video inspection with ffprobe
 * Run: npx tsx scripts/test-video-inspection.ts
 */

import { inspectMedia } from '@/lib/mediaInspector';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

async function createTestVideo(): Promise<string> {
  // Create a temporary test video using ffmpeg (5 second, 1280x720, 16:9)
  const testFile = path.join('/tmp', 'test-video-' + Date.now() + '.mp4');
  
  console.log('Creating test video with ffmpeg...');
  await execAsync(
    `ffmpeg -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -pix_fmt yuv420p "${testFile}" -y`
  );
  
  console.log(`Test video created: ${testFile}`);
  return testFile;
}

async function main() {
  try {
    // Check if ffprobe is available
    console.log('Checking ffprobe availability...');
    try {
      const { stdout } = await execAsync('ffprobe -version');
      console.log('✅ ffprobe found:', stdout.split('\n')[0]);
    } catch (error) {
      console.error('❌ ffprobe not found. Install ffmpeg to enable video inspection.');
      process.exit(1);
    }

    // Create test video
    const testVideoPath = await createTestVideo();

    // Test inspection with matching requirements
    console.log('\n--- Test 1: Matching Requirements ---');
    const result1 = await inspectMedia(testVideoPath, {
      aspectRatios: ['16:9'],
      resolution: '1280x720',
      durationSeconds: 5,
    });

    console.log('Status:', result1.status);
    console.log('Checks:');
    result1.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.requirement}: ${check.actual} (expected: ${check.expected})`);
    });
    console.log('Metadata:', JSON.stringify(result1.metadata, null, 2));

    // Test inspection with mismatched requirements
    console.log('\n--- Test 2: Mismatched Requirements ---');
    const result2 = await inspectMedia(testVideoPath, {
      aspectRatios: ['9:16'], // Wrong aspect ratio
      resolution: '1920x1080', // Wrong resolution
      durationSeconds: 10, // Wrong duration
    });

    console.log('Status:', result2.status);
    console.log('Checks:');
    result2.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.requirement}: ${check.actual} (expected: ${check.expected})`);
    });

    // Clean up
    await fs.unlink(testVideoPath);
    console.log('\n✅ Test complete. Test video cleaned up.');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();

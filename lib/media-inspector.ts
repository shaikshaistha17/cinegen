import { exec } from 'child_process';
import { promisify } from 'util';
import type { InspectionResult, InspectionCheck } from '@/types';

const execAsync = promisify(exec);

/**
 * Inspect media file using ffprobe
 * @param filePath Path to media file
 * @param expectedSpecs Expected specifications from agreement
 * @returns Inspection results
 */
export async function inspectMedia(
  filePath: string,
  expectedSpecs: {
    resolution?: string;
    durationSeconds?: number;
    aspectRatio?: string;
    contentType?: string;
  }
): Promise<InspectionResult> {
  try {
    // Check if ffprobe is available
    const hasFFprobe = await checkFFprobeAvailable();
    
    if (!hasFFprobe) {
      return {
        status: 'unsupported',
        checks: [],
        metadata: {},
        message: 'ffprobe not available - cannot inspect media'
      };
    }
    
    // Extract media metadata using ffprobe
    const metadata = await extractMediaMetadata(filePath);
    
    if (!metadata) {
      return {
        status: 'error',
        checks: [],
        metadata: {},
        message: 'Failed to extract media metadata'
      };
    }
    
    // Run checks against expected specs
    const checks: InspectionCheck[] = [];
    
    // Check resolution
    if (expectedSpecs.resolution && metadata.width && metadata.height) {
      const actualResolution = `${metadata.width}x${metadata.height}`;
      checks.push({
        requirement: 'Resolution',
        actual: actualResolution,
        expected: expectedSpecs.resolution,
        passed: actualResolution === expectedSpecs.resolution
      });
    }
    
    // Check duration (allow 5% tolerance)
    if (expectedSpecs.durationSeconds && metadata.duration) {
      const tolerance = expectedSpecs.durationSeconds * 0.05;
      const durationMatch = Math.abs(metadata.duration - expectedSpecs.durationSeconds) <= tolerance;
      checks.push({
        requirement: 'Duration',
        actual: `${metadata.duration.toFixed(1)}s`,
        expected: `${expectedSpecs.durationSeconds}s (±5%)`,
        passed: durationMatch
      });
    }
    
    // Check aspect ratio (allow small tolerance for float comparison)
    if (expectedSpecs.aspectRatio && metadata.aspectRatio) {
      const expectedRatio = parseAspectRatio(expectedSpecs.aspectRatio);
      const actualRatio = metadata.aspectRatio;
      const ratioMatch = expectedRatio ? Math.abs(actualRatio - expectedRatio) < 0.05 : false;
      
      checks.push({
        requirement: 'Aspect Ratio',
        actual: formatAspectRatio(actualRatio),
        expected: expectedSpecs.aspectRatio,
        passed: ratioMatch
      });
    }
    
    // Determine overall status
    const failedChecks = checks.filter(c => !c.passed);
    const status = failedChecks.length === 0 ? 'pass' : 'fail';
    
    return {
      status,
      checks,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        aspectRatio: metadata.aspectRatio,
        codec: metadata.codec,
        format: metadata.format
      },
      message: status === 'pass' 
        ? 'All checks passed' 
        : `${failedChecks.length} check(s) failed`
    };
  } catch (err) {
    console.error('[Media Inspector] Error:', err);
    return {
      status: 'error',
      checks: [],
      metadata: {},
      message: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

async function checkFFprobeAvailable(): Promise<boolean> {
  try {
    await execAsync('ffprobe -version');
    return true;
  } catch {
    return false;
  }
}

interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: number;
  codec?: string;
  format?: string;
}

async function extractMediaMetadata(filePath: string): Promise<MediaMetadata | null> {
  try {
    // Use ffprobe to extract JSON metadata
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    
    // Find video stream
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    
    if (!videoStream) {
      return null;
    }
    
    // Extract metadata
    const width = videoStream.width;
    const height = videoStream.height;
    const duration = parseFloat(data.format?.duration || videoStream.duration || '0');
    const aspectRatio = width && height ? width / height : undefined;
    const codec = videoStream.codec_name;
    const format = data.format?.format_name;
    
    return {
      width,
      height,
      duration,
      aspectRatio,
      codec,
      format
    };
  } catch (err) {
    console.error('[Media Inspector] Failed to extract metadata:', err);
    return null;
  }
}

function parseAspectRatio(aspectRatioStr: string): number | null {
  const ratioMap: Record<string, number> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    '4:5': 4 / 5,
    '2.39:1': 2.39
  };
  
  return ratioMap[aspectRatioStr] || null;
}

function formatAspectRatio(ratio: number): string {
  // Try to match common ratios
  if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 4/5) < 0.05) return '4:5';
  if (Math.abs(ratio - 2.39) < 0.05) return '2.39:1';
  
  // Return as decimal
  return ratio.toFixed(2);
}

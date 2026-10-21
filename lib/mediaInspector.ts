import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { InspectionCheck, InspectionResult } from '@/types';

const execAsync = promisify(exec);

/**
 * Media inspection utilities for validating uploaded deliveries against requirements.
 * Uses sharp for images, ffprobe for videos.
 */

// ─── Helper Functions ────────────────────────────────────────────────────────

function parseAspectRatio(ratio: string): number {
  const [width, height] = ratio.split(':').map(Number);
  return width / height;
}

function formatAspectRatio(decimal: number): string {
  // Try common ratios first
  const commonRatios: Record<string, number> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    '4:5': 4 / 5,
    '2.39:1': 2.39,
  };

  for (const [label, value] of Object.entries(commonRatios)) {
    if (Math.abs(decimal - value) < 0.01) {
      return label;
    }
  }

  // Otherwise format as decimal
  return decimal.toFixed(2);
}

function aspectRatioMatches(actual: number, expected: number, tolerance = 0.01): boolean {
  return Math.abs(actual - expected) / expected < tolerance;
}

// ─── Image Inspection ────────────────────────────────────────────────────────

async function inspectImage(
  filePath: string,
  requirements: {
    aspectRatios?: string[];
    resolution?: string;
    [key: string]: any;
  }
): Promise<InspectionResult> {
  try {
    const metadata = await sharp(filePath).metadata();
    
    if (!metadata.width || !metadata.height) {
      return {
        status: 'error',
        checks: [],
        metadata: {},
        message: 'Could not read image dimensions',
      };
    }

    const checks: InspectionCheck[] = [];
    const actualAspectRatio = metadata.width / metadata.height;
    const actualResolution = `${metadata.width}x${metadata.height}`;

    // Check aspect ratio if specified
    if (requirements.aspectRatios && requirements.aspectRatios.length > 0) {
      const expectedRatios = requirements.aspectRatios.map(parseAspectRatio);
      const matchesAny = expectedRatios.some(expected =>
        aspectRatioMatches(actualAspectRatio, expected)
      );

      checks.push({
        requirement: 'Aspect Ratio',
        actual: formatAspectRatio(actualAspectRatio),
        expected: requirements.aspectRatios.join(' or '),
        passed: matchesAny,
      });
    }

    // Check resolution if specified
    if (requirements.resolution) {
      const resolutionMatch = actualResolution === requirements.resolution;
      checks.push({
        requirement: 'Resolution',
        actual: actualResolution,
        expected: requirements.resolution,
        passed: resolutionMatch,
      });
    }

    const allPassed = checks.length > 0 ? checks.every(c => c.passed) : true;

    return {
      status: allPassed ? 'pass' : 'fail',
      checks,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        aspectRatio: actualAspectRatio,
      },
    };
  } catch (error: any) {
    return {
      status: 'error',
      checks: [],
      metadata: {},
      message: `Image inspection failed: ${error.message}`,
    };
  }
}

// ─── Video Inspection ────────────────────────────────────────────────────────

interface FFProbeVideoStream {
  width?: number;
  height?: number;
  duration?: string;
  r_frame_rate?: string;
  codec_name?: string;
}

interface FFProbeOutput {
  streams?: FFProbeVideoStream[];
  format?: {
    duration?: string;
  };
}

async function inspectVideo(
  filePath: string,
  requirements: {
    aspectRatios?: string[];
    resolution?: string;
    durationSeconds?: number;
    [key: string]: any;
  }
): Promise<InspectionResult> {
  try {
    // Run ffprobe to extract video metadata
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_streams -show_format "${filePath}"`
    );

    const probeData: FFProbeOutput = JSON.parse(stdout);
    const videoStream = probeData.streams?.find(s => s.width && s.height);

    if (!videoStream || !videoStream.width || !videoStream.height) {
      return {
        status: 'error',
        checks: [],
        metadata: {},
        message: 'Could not read video dimensions',
      };
    }

    const checks: InspectionCheck[] = [];
    const actualAspectRatio = videoStream.width / videoStream.height;
    const actualResolution = `${videoStream.width}x${videoStream.height}`;
    
    // Parse duration (prefer stream duration, fall back to format duration)
    let actualDuration: number | undefined;
    if (videoStream.duration) {
      actualDuration = parseFloat(videoStream.duration);
    } else if (probeData.format?.duration) {
      actualDuration = parseFloat(probeData.format.duration);
    }

    // Check aspect ratio if specified
    if (requirements.aspectRatios && requirements.aspectRatios.length > 0) {
      const expectedRatios = requirements.aspectRatios.map(parseAspectRatio);
      const matchesAny = expectedRatios.some(expected =>
        aspectRatioMatches(actualAspectRatio, expected)
      );

      checks.push({
        requirement: 'Aspect Ratio',
        actual: formatAspectRatio(actualAspectRatio),
        expected: requirements.aspectRatios.join(' or '),
        passed: matchesAny,
      });
    }

    // Check resolution if specified
    if (requirements.resolution) {
      const resolutionMatch = actualResolution === requirements.resolution;
      checks.push({
        requirement: 'Resolution',
        actual: actualResolution,
        expected: requirements.resolution,
        passed: resolutionMatch,
      });
    }

    // Check duration if specified
    if (requirements.durationSeconds && actualDuration !== undefined) {
      const durationMatch = Math.abs(actualDuration - requirements.durationSeconds) < 1; // 1 second tolerance
      checks.push({
        requirement: 'Duration',
        actual: `${actualDuration.toFixed(1)}s`,
        expected: `${requirements.durationSeconds}s`,
        passed: durationMatch,
      });
    }

    const allPassed = checks.length > 0 ? checks.every(c => c.passed) : true;

    return {
      status: allPassed ? 'pass' : 'fail',
      checks,
      metadata: {
        width: videoStream.width,
        height: videoStream.height,
        aspectRatio: actualAspectRatio,
        duration: actualDuration,
        codec: videoStream.codec_name,
        fps: videoStream.r_frame_rate,
      },
    };
  } catch (error: any) {
    // Check if ffprobe is not installed
    if (error.message?.includes('ffprobe') && error.message?.includes('not found')) {
      return {
        status: 'unsupported',
        checks: [],
        metadata: {},
        message: 'Video inspection requires ffprobe (install ffmpeg to enable)',
      };
    }

    return {
      status: 'error',
      checks: [],
      metadata: {},
      message: `Video inspection failed: ${error.message}`,
    };
  }
}

// ─── Main Inspection Function ────────────────────────────────────────────────

export async function inspectMedia(
  filePath: string,
  requirements: any
): Promise<InspectionResult> {
  try {
    // Determine file type from extension
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return await inspectImage(filePath, requirements);

      case 'mp4':
      case 'mov':
      case 'webm':
        return await inspectVideo(filePath, requirements);

      default:
        return {
          status: 'unsupported',
          checks: [],
          metadata: {},
          message: `File format .${extension} not supported for inspection`,
        };
    }
  } catch (error: any) {
    return {
      status: 'error',
      checks: [],
      metadata: {},
      message: `Media inspection error: ${error.message}`,
    };
  }
}

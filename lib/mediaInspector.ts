import sharp from 'sharp';
import type { InspectionCheck, InspectionResult } from '@/types';

/**
 * Media inspection utilities for validating uploaded deliveries against requirements.
 * Uses sharp for images, graceful fallback for video (ffprobe may not be available).
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

async function inspectVideo(
  filePath: string,
  requirements: {
    aspectRatios?: string[];
    resolution?: string;
    durationSeconds?: number;
    [key: string]: any;
  }
): Promise<InspectionResult> {
  // Video inspection requires ffprobe which is not available in all environments
  // Gracefully return unsupported status
  return {
    status: 'unsupported',
    checks: [],
    metadata: {},
    message: 'Video inspection requires ffprobe (not available in this environment)',
  };
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

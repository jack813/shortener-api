/**
 * QR Code Generation Utilities
 *
 * Generates QR codes for short URLs using qrcode package.
 * Supports PNG and SVG formats with customizable colors and sizes.
 */

export interface QROptions {
  size?: number;           // 128, 256, 512, 1024
  format?: 'png' | 'svg';
  dark?: string;           // Foreground color (Pro only)
  light?: string;          // Background color (Pro only)
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate a QR code for a short URL.
 *
 * @param url - The short URL to encode (e.g., https://0x1.in/abc123)
 * @param options - QR code generation options
 * @returns Response with QR code image
 *
 * @example
 * // Generate PNG
 * const response = generateQR('https://0x1.in/abc123', { size: 256, format: 'png' });
 *
 * @example
 * // Generate SVG with custom colors
 * const response = generateQR('https://0x1.in/abc123', {
 *   format: 'svg',
 *   dark: '#000000',
 *   light: '#FFFFFF'
 * });
 */
export async function generateQR(
  url: string,
  options: QROptions = {}
): Promise<Response> {
  const {
    size = 256,
    format = 'png',
    dark = '#000000',
    light = '#FFFFFF',
    errorCorrection = 'M'
  } = options;

  // Validate URL
  if (!url) {
    return Response.json(
      { error: 'Missing URL for QR code generation' },
      { status: 400 }
    );
  }

  // Import QRCode library dynamically
  const QRCode = (await import('qrcode')).default;

  try {
    if (format === 'svg') {
      // Generate SVG
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: dark,
          light: light,
        },
      });

      return new Response(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } else {
      // Generate PNG
      const pngBuffer = await QRCode.toBuffer(url, {
        width: size,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: dark,
          light: light,
        },
      });

      return new Response(new Uint8Array(pngBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  } catch (error) {
    console.error('QR code generation failed:', error);
    return Response.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

/**
 * Validate QR color format (hex color)
 * @param color - Hex color string to validate
 * @returns true if valid 6-digit hex color
 */
export function isValidColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
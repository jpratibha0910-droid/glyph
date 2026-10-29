import { Font, Glyph, Path } from 'opentype.js';
import JSZip from 'jszip';
import { GlyphData, FontMetadata, FontMetrics } from './types';
import { CHARACTERS, DEFAULT_METRICS, DEFAULT_METADATA } from './constants';
import { strokesToOpenTypePath, generateStarterStrokes } from './vectorizer';

/**
 * Builds and compiles an opentype.Font instance from user glyphs and metadata.
 */
export function compileOpenTypeFont(
  glyphsMap: Record<string, GlyphData>,
  metadata: FontMetadata = DEFAULT_METADATA,
  metrics: FontMetrics = DEFAULT_METRICS
): Font {
  const glyphsList: Glyph[] = [];

  // 1. Mandatory .notdef glyph (Glyph 0)
  const notdefPath = new Path();
  // Outer rectangle
  notdefPath.moveTo(100, 0);
  notdefPath.lineTo(100, 700);
  notdefPath.lineTo(500, 700);
  notdefPath.lineTo(500, 0);
  notdefPath.close();
  // Inner cutout
  notdefPath.moveTo(150, 50);
  notdefPath.lineTo(450, 50);
  notdefPath.lineTo(450, 650);
  notdefPath.lineTo(150, 650);
  notdefPath.close();

  glyphsList.push(
    new Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 600,
      path: notdefPath,
    })
  );

  // 2. Space glyph (Unicode 32)
  glyphsList.push(
    new Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: 320,
      path: new Path(),
    })
  );

  // 3. User & catalog glyphs (A-Z, a-z, 0-9, punctuation)
  for (const charDef of CHARACTERS) {
    const glyphData = glyphsMap[charDef.char];
    let strokes = glyphData?.strokes;
    let advanceWidth = glyphData?.advanceWidth ?? charDef.defaultAdvance;
    const baselineOffset = glyphData?.baselineOffset ?? 0;

    // If no strokes drawn yet, use clean starter template so the full font functions immediately
    if (!strokes || strokes.length === 0) {
      strokes = generateStarterStrokes(charDef.char);
    }

    const path = strokesToOpenTypePath(strokes, baselineOffset);

    glyphsList.push(
      new Glyph({
        name: charDef.name,
        unicode: charDef.unicode,
        advanceWidth: Math.max(150, advanceWidth),
        path,
      })
    );
  }

  // 4. Construct Font instance
  const font = new Font({
    familyName: metadata.familyName || 'CustomCraft',
    styleName: metadata.styleName || 'Regular',
    unitsPerEm: metrics.unitsPerEm,
    ascender: metrics.ascender,
    descender: metrics.descender,
    glyphs: glyphsList,
  });

  return font;
}

/**
 * Compiles to TTF ArrayBuffer
 */
export function compileFontToTTFBuffer(
  glyphsMap: Record<string, GlyphData>,
  metadata: FontMetadata,
  metrics: FontMetrics = DEFAULT_METRICS
): ArrayBuffer {
  const font = compileOpenTypeFont(glyphsMap, metadata, metrics);
  return font.toArrayBuffer();
}

/**
 * Register a compiled font buffer in the browser document via FontFace API.
 */
let activeBlobUrl: string | null = null;
export async function registerFontFace(
  fontBuffer: ArrayBuffer,
  fontFamilyName: string
): Promise<string> {
  if (typeof window === 'undefined') return '';

  // Clean up previous blob URL if exists to avoid memory leaks
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }

  const blob = new Blob([fontBuffer], { type: 'font/ttf' });
  const blobUrl = URL.createObjectURL(blob);
  activeBlobUrl = blobUrl;

  try {
    const fontFace = new FontFace(fontFamilyName, `url(${blobUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
  } catch (err) {
    console.error('Failed to load FontFace:', err);
  }

  return blobUrl;
}

/**
 * Convert TTF ArrayBuffer to WOFF2 using the server route or fallback.
 */
export async function convertTTFToWOFF2(ttfBuffer: ArrayBuffer): Promise<Uint8Array> {
  const response = await fetch('/api/convert-woff2', {
    method: 'POST',
    headers: {
      'Content-Type': 'font/ttf',
    },
    body: ttfBuffer,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `WOFF2 conversion failed with status ${response.status}`);
  }

  const woff2ArrayBuffer = await response.arrayBuffer();
  return new Uint8Array(woff2ArrayBuffer);
}

/**
 * Trigger browser file download.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

/**
 * Download font as .ttf file.
 */
export function downloadTTF(ttfBuffer: ArrayBuffer, familyName: string): void {
  const cleanName = (familyName || 'CustomFont').replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = new Blob([ttfBuffer], { type: 'font/ttf' });
  triggerDownload(blob, `${cleanName}.ttf`);
}

/**
 * Download font as .woff2 file.
 */
export async function downloadWOFF2(ttfBuffer: ArrayBuffer, familyName: string): Promise<void> {
  const cleanName = (familyName || 'CustomFont').replace(/[^a-zA-Z0-9_-]/g, '_');
  const woff2Bytes = await convertTTFToWOFF2(ttfBuffer);
  const blob = new Blob([woff2Bytes as unknown as BlobPart], { type: 'font/woff2' });
  triggerDownload(blob, `${cleanName}.woff2`);
}

/**
 * Create a full webfont zip package with TTF, WOFF2, CSS and HTML demo.
 */
export async function downloadWebfontZip(
  ttfBuffer: ArrayBuffer,
  metadata: FontMetadata
): Promise<void> {
  const cleanName = (metadata.familyName || 'CustomFont').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zip = new JSZip();

  // TTF
  zip.file(`${cleanName}.ttf`, ttfBuffer);

  // WOFF2
  let woff2Bytes: Uint8Array | null = null;
  try {
    woff2Bytes = await convertTTFToWOFF2(ttfBuffer);
    zip.file(`${cleanName}.woff2`, woff2Bytes);
  } catch (e) {
    console.warn('Could not compress WOFF2 for zip, providing TTF:', e);
  }

  // stylesheet.css
  const cssContent = `@font-face {
  font-family: '${metadata.familyName}';
  src: ${woff2Bytes ? `url('${cleanName}.woff2') format('woff2'),\n       ` : ''}url('${cleanName}.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: '${metadata.familyName}', sans-serif;
}
`;
  zip.file('stylesheet.css', cssContent);

  // demo.html
  const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.familyName} - Specimen Sheet</title>
  <link rel="stylesheet" href="stylesheet.css">
  <style>
    body {
      background: #09090b;
      color: #f4f4f5;
      padding: 40px 24px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 { font-size: 3.5rem; margin-bottom: 0.2rem; color: #38bdf8; }
    p.meta { color: #a1a1aa; font-family: monospace; margin-bottom: 2rem; font-size: 0.9rem; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .waterfall-line { margin: 16px 0; border-bottom: 1px dashed #27272a; padding-bottom: 12px; }
    .size-badge { font-family: monospace; font-size: 11px; color: #a1a1aa; display: inline-block; width: 60px; }
    .preview-box { width: 100%; min-height: 140px; background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; color: #fafafa; font-size: 28px; padding: 16px; box-sizing: border-box; }
  </style>
</head>
<body>
  <h1>${metadata.familyName}</h1>
  <p class="meta">Designed by ${metadata.designer || 'Anonymous'} • Version ${metadata.version || '1.000'} • Created with GlyphCraft Studio</p>
  
  <div class="card">
    <h2 style="font-family: sans-serif; font-size: 1.1rem; color: #a1a1aa; margin-top: 0;">Interactive Type Playground</h2>
    <textarea class="preview-box" spellcheck="false">The quick brown fox jumps over the lazy dog. 0123456789</textarea>
  </div>

  <div class="card">
    <h2 style="font-family: sans-serif; font-size: 1.1rem; color: #a1a1aa; margin-top: 0;">Waterfall Sizes</h2>
    <div class="waterfall-line"><span class="size-badge">72px</span><span style="font-size: 72px;">Agile Type</span></div>
    <div class="waterfall-line"><span class="size-badge">48px</span><span style="font-size: 48px;">Sphinx of black quartz, judge my vow.</span></div>
    <div class="waterfall-line"><span class="size-badge">32px</span><span style="font-size: 32px;">Pack my box with five dozen liquor jugs.</span></div>
    <div class="waterfall-line"><span class="size-badge">24px</span><span style="font-size: 24px;">The quick brown fox jumps over the lazy dog. 1234567890</span></div>
    <div class="waterfall-line"><span class="size-badge">18px</span><span style="font-size: 18px;">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</span></div>
  </div>
</body>
</html>`;
  zip.file('demo.html', demoHtml);

  // README.md
  const readme = `# ${metadata.familyName} Font Package
Created with **GlyphCraft Studio**

## Included Files
- \`${cleanName}.ttf\`: TrueType font file (compatible with Windows, macOS, Linux, Word, Figma, Adobe Photoshop/Illustrator)
- \`${cleanName}.woff2\`: Web Open Font Format 2 (highest compression web standard for modern websites)
- \`stylesheet.css\`: Ready-to-use CSS \`@font-face\` declaration
- \`demo.html\`: Standalone specimen and test page

## Web Usage
1. Copy \`${cleanName}.woff2\` and \`stylesheet.css\` into your website project.
2. In your HTML:
   \`\`\`html
   <link rel="stylesheet" href="stylesheet.css">
   \`\`\`
3. In your CSS:
   \`\`\`css
   body {
     font-family: '${metadata.familyName}', sans-serif;
   }
   \`\`\`
`;
  zip.file('README.md', readme);

  const zipContent = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipContent, `${cleanName}-WebfontKit.zip`);
}

import { NextRequest, NextResponse } from 'next/server';
import wawoff2 from 'wawoff2';

export async function POST(req: NextRequest) {
  try {
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'Empty font binary provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    const woff2Buffer = await wawoff2.compress(buffer);

    return new Response(woff2Buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'font/woff2',
        'Content-Disposition': 'attachment; filename="custom-font.woff2"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compress TTF to WOFF2';
    console.error('WOFF2 compression error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

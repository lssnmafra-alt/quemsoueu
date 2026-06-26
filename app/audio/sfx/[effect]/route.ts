import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAMPLE_RATE = 16_000;
const DURATION_SECONDS = 0.12;
const EFFECT_FREQUENCIES: Record<string, number> = {
  click: 760,
  hover: 520,
  vote: 680,
  hit: 180,
  hurt: 220,
  eliminated: 140,
  message: 620,
  'start-game': 880,
  transition: 460,
  select: 700,
  eliminate: 160,
  win: 980,
  turn: 640,
  miss: 260,
};

export async function GET(_req: NextRequest, context: { params: Promise<{ effect: string }> }) {
  const { effect } = await context.params;
  const name = cleanEffectName(effect);
  const frequency = EFFECT_FREQUENCIES[name] || 520;
  const wav = makeToneWav(frequency, DURATION_SECONDS);

  return new NextResponse(wav as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Length': String(wav.length),
      'X-QSE-SFX': name,
    },
  });
}

export async function HEAD(req: NextRequest, context: { params: Promise<{ effect: string }> }) {
  const response = await GET(req, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}

function cleanEffectName(value: string) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

function makeToneWav(frequency: number, durationSeconds: number) {
  const sampleCount = Math.max(1, Math.floor(SAMPLE_RATE * durationSeconds));
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE;
    const fade = Math.min(1, i / 160, (sampleCount - i) / 240);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.18 * Math.max(0, fade);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  return new Uint8Array(buffer);
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

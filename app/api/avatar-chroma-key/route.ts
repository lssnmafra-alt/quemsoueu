import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RESPONSE_HEADERS = { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' };

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitKey = cleanAvatarKey(req.nextUrl.searchParams.get('avatarKey') || req.nextUrl.searchParams.get('key') || '');
    const parsed = parseAvatarSelection(avatarUrl);
    const candidates = unique([
      explicitKey,
      cleanAvatarKey(parsed?.avatarKey),
      cleanAvatarKey(parsed?.avatarId),
      cleanAvatarKey(parsed?.displayName),
      cleanAvatarKey(parsed?.animationSlug?.split('/')?.[0]),
      cleanAvatarKey(slugFromAvatarUrl(avatarUrl).split('/')?.[0]),
    ]).filter(Boolean);

    if (!candidates.length) return NextResponse.json({ available: false, reason: 'avatar-sem-chave' }, { headers: RESPONSE_HEADERS });

    const db = getSupabaseAuthServer();
    for (const candidate of candidates) {
      const { data, error } = await db
        .from('avatar_chroma_keys')
        .select('avatar_key,chroma_key_id,notes,chroma_key_options!inner(id,label,hex_color,sort_order)')
        .ilike('avatar_key', candidate)
        .maybeSingle();

      if (error) throw error;
      const option = Array.isArray(data?.chroma_key_options) ? data?.chroma_key_options?.[0] : data?.chroma_key_options;
      if (data && option?.hex_color) {
        return NextResponse.json({
          available: true,
          avatarKey: data.avatar_key,
          chromaKeyId: data.chroma_key_id,
          label: option.label,
          hexColor: option.hex_color,
          notes: data.notes || '',
        }, { headers: RESPONSE_HEADERS });
      }
    }

    return NextResponse.json({ available: false, reason: 'regra-nao-encontrada', candidates }, { headers: RESPONSE_HEADERS });
  } catch (error: any) {
    console.error('Avatar chroma key error:', error);
    return NextResponse.json({ available: false, error: error.message || 'Nao foi possivel carregar chroma key.' }, { status: 200, headers: RESPONSE_HEADERS });
  }
}

function parseAvatarSelection(avatarUrl: string) {
  if (!avatarUrl?.startsWith('avatar:')) return null;
  try { return JSON.parse(decodeURIComponent(avatarUrl.slice(7))); } catch { return null; }
}

function slugFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';
  try {
    const decoded = decodeURIComponent(value);
    const markers = ['/atuem/atuem/avatar/', 'atuem/atuem/avatar/', '/atuem/avatar/', 'atuem/avatar/'];
    const marker = markers.find((item) => decoded.includes(item));
    const part = marker ? decoded.slice(decoded.indexOf(marker) + marker.length) : decoded.split('/').pop() || '';
    return part.replace(/\.[^.]+$/, '');
  } catch {
    return value.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  }
}

function cleanAvatarKey(value: unknown) {
  return String(value || '')
    .trim()
    .split('..').join('')
    .split('\\').join('/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\.[^.]+$/, '')
    .replace(/:\s*skin.*$/i, '')
    .replace(/:skin.*$/i, '')
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

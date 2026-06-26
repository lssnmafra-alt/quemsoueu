import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RESPONSE_HEADERS = {
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitKey = cleanAvatarKey(
      req.nextUrl.searchParams.get('avatarKey') ||
      req.nextUrl.searchParams.get('key') ||
      ''
    );

    const parsed = parseAvatarSelection(avatarUrl);

    const candidates = unique([
      explicitKey,
      cleanAvatarKey(parsed?.avatarKey),
      cleanAvatarKey(parsed?.avatarId),
      cleanAvatarKey(parsed?.displayName),
      cleanAvatarKey(parsed?.animationSlug?.split('/')?.[0]),
      cleanAvatarKey(slugFromAvatarUrl(avatarUrl).split('/')?.[0]),
    ]).filter(Boolean);

    if (!candidates.length) {
      return NextResponse.json(
        { available: false, reason: 'avatar-sem-chave' },
        { headers: RESPONSE_HEADERS }
      );
    }

    const db = getSupabaseAuthServer();

    for (const candidate of candidates) {
      const { data: chromaRule, error: chromaRuleError } = await db
        .from('avatar_chroma_keys')
        .select('avatar_key,chroma_key_id,notes')
        .ilike('avatar_key', candidate)
        .maybeSingle();

      if (chromaRuleError) throw chromaRuleError;

      if (!chromaRule?.chroma_key_id) continue;

      const { data: chromaOption, error: chromaOptionError } = await db
        .from('chroma_key_options')
        .select('id,label,hex_color,sort_order')
        .eq('id', chromaRule.chroma_key_id)
        .maybeSingle();

      if (chromaOptionError) throw chromaOptionError;

      if (chromaOption?.hex_color) {
        return NextResponse.json(
          {
            available: true,
            avatarKey: chromaRule.avatar_key,
            chromaKeyId: chromaRule.chroma_key_id,
            label: chromaOption.label,
            hexColor: chromaOption.hex_color,
            notes: chromaRule.notes || '',
          },
          { headers: RESPONSE_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        available: false,
        reason: 'regra-nao-encontrada',
        candidates,
      },
      { headers: RESPONSE_HEADERS }
    );
  } catch (error: any) {
    console.error('Avatar chroma key error:', error);

    return NextResponse.json(
      {
        available: false,
        error: error.message || 'Nao foi possivel carregar chroma key.',
      },
      {
        status: 200,
        headers: RESPONSE_HEADERS,
      }
    );
  }
}

function parseAvatarSelection(avatarUrl: string) {
  if (!avatarUrl?.startsWith('avatar:')) return null;

  try {
    return JSON.parse(decodeURIComponent(avatarUrl.slice(7)));
  } catch {
    return null;
  }
}

function slugFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return '';

  try {
    const decoded = decodeURIComponent(value);
    const query = decoded.includes('?') ? decoded.split('?')[1] : '';
    const keyParam = query.split('&').find((part) => part.startsWith('key='));

    if (keyParam) {
      return decodeURIComponent(keyParam.slice(4))
        .split('/')
        .pop()
        ?.replace(/\.[^.]+$/, '') || '';
    }

    const markers = [
      '/atuem/atuem/avatar/',
      'atuem/atuem/avatar/',
      '/atuem/avatar/',
      'atuem/avatar/',
    ];

    const marker = markers.find((item) => decoded.includes(item));
    const part = marker
      ? decoded.slice(decoded.indexOf(marker) + marker.length)
      : decoded.split('/').pop() || '';

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
    const key = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!value || seen.has(key)) continue;

    seen.add(key);
    output.push(value);
  }

  return output;
}

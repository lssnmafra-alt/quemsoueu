import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseGameServer } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RESPONSE_HEADERS = {
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
};

export async function GET(req: NextRequest) {
  try {
    const avatarUrl = req.nextUrl.searchParams.get('avatarUrl') || '';
    const explicitKey = cleanAvatarKey(req.nextUrl.searchParams.get('avatarKey') || req.nextUrl.searchParams.get('key') || '');

    const parsed = parseAvatarSelection(avatarUrl);
    const urlCandidates = candidatesFromAvatarUrl(avatarUrl);

    const candidates = unique([
      explicitKey,
      cleanAvatarKey(req.nextUrl.searchParams.get('avatarId')),
      cleanAvatarKey(req.nextUrl.searchParams.get('displayName')),
      cleanAvatarKey(req.nextUrl.searchParams.get('skinName')),
      cleanAvatarKey(req.nextUrl.searchParams.get('slug')),
      cleanAvatarKey(parsed?.avatarKey),
      cleanAvatarKey(parsed?.avatarId),
      cleanAvatarKey(parsed?.displayName),
      cleanAvatarKey(parsed?.skinName),
      cleanAvatarKey(parsed?.imageKey),
      cleanAvatarKey(parsed?.animationSlug),
      cleanAvatarKey(parsed?.animationSlug?.split('/')?.[0]),
      ...urlCandidates,
    ]).filter(Boolean);

    if (!candidates.length) {
      return NextResponse.json(
        { available: false, enabled: false, reason: 'avatar-sem-chave' },
        { headers: RESPONSE_HEADERS }
      );
    }

    const db = getSupabaseGameServer();
    const normalizedCandidates = expandNormalizedAliases(candidates.map(normalizeComparable));

    const { data: chromaRules, error: chromaRuleError } = await db
      .from('avatar_chroma_keys')
      .select('avatar_key,chroma_key_id,notes');

    if (chromaRuleError) throw chromaRuleError;

    const chromaRule = (chromaRules || []).find((rule: any) => {
      const ruleCandidates = expandNormalizedAliases([
        normalizeComparable(rule?.avatar_key),
        ...String(rule?.avatar_key || '').split('/').map(normalizeComparable),
      ]);

      return ruleCandidates.some((ruleKey) => normalizedCandidates.includes(ruleKey));
    });

    if (chromaRule?.chroma_key_id) {
      const { data: chromaOption, error: chromaOptionError } = await db
        .from('chroma_key_options')
        .select('id,label,hex_color,sort_order')
        .eq('id', chromaRule.chroma_key_id)
        .maybeSingle();

      if (chromaOptionError) throw chromaOptionError;

      const hexColor = normalizeHexColor(chromaOption?.hex_color);

      if (hexColor) {
        return NextResponse.json(
          {
            available: true,
            enabled: true,
            avatarKey: chromaRule.avatar_key,
            chromaKeyId: chromaRule.chroma_key_id,
            label: chromaOption?.label || '',
            hexColor,
            matchedBy: matchReason(chromaRule.avatar_key, normalizedCandidates),
            notes: chromaRule.notes || '',
          },
          { headers: RESPONSE_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        available: false,
        enabled: false,
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
        enabled: false,
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

function candidatesFromAvatarUrl(avatarUrl: string) {
  const value = String(avatarUrl || '').trim();
  if (!value) return [];

  try {
    const decoded = decodeURIComponent(value);
    const query = decoded.includes('?') ? decoded.split('?')[1] : '';
    const keyParam = query.split('&').find((part) => part.startsWith('key='));
    const output: string[] = [];

    if (keyParam) {
      const key = cleanAvatarKey(decodeURIComponent(keyParam.slice(4)));
      output.push(key, ...key.split('/'));
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

    const cleaned = cleanAvatarKey(part);
    output.push(cleaned, ...cleaned.split('/'));

    return unique(output);
  } catch {
    return [cleanAvatarKey(value.split('/').pop()?.replace(/\.[^.]+$/, '') || '')].filter(Boolean);
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

function normalizeComparable(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/doutor/g, 'dr')
    .replace(/[^a-z0-9]+/g, '');
}

function expandNormalizedAliases(values: string[]) {
  const aliases: Record<string, string[]> = {
    doutorbolhas: ['drbolhas'],
    drbolhas: ['doutorbolhas'],
  };

  return unique(values.flatMap((value) => [value, ...(aliases[value] || [])])).filter(Boolean);
}

function normalizeHexColor(value: unknown) {
  const raw = String(value || '').trim();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;

  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }

  return '';
}

function matchReason(ruleKey: string, normalizedCandidates: string[]) {
  const ruleCandidates = expandNormalizedAliases([
    normalizeComparable(ruleKey),
    ...String(ruleKey || '').split('/').map(normalizeComparable),
  ]);
  const matched = ruleCandidates.find((candidate) => normalizedCandidates.includes(candidate));

  return matched || 'normalized';
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

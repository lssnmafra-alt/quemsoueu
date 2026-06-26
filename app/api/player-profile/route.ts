import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicEnvValue } from '@/lib/publicEnv';
import { getSupabaseAuthServer, hasSupabaseAuthServiceRole } from '@/lib/supabaseAdmin';

const MAX_GENRES = 8;
const MAX_BLOCKED_TRACKS = 300;
const PROFILE_SELECT = 'id,email,nickname,emoji,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

export async function GET(req: NextRequest) {
  try {
    const userId = normalizeProfileId(req.nextUrl.searchParams.get('userId'));
    if (!isUuid(userId)) return NextResponse.json({ profile: null, warning: 'Usuario invalido.' });

    const { data, error } = await getAuthClient(req)
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ profile: data ? normalizeProfileResult(data) : null });
  } catch (error: any) {
    console.error('Player profile read error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o perfil.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalizeProfileId(body.id || body.userId);
    const nickname = normalizeNicknameDisplay(body.nickname).slice(0, 16);
    const avatarUrl = String(body.avatar_url || body.avatarUrl || '').trim();
    const musicGenres = normalizeGenres(body.music_genres || body.musicGenres);
    const musicBlockedTracks = normalizeBlockedTracks(body.music_blocked_tracks || body.musicBlockedTracks);
    const profileCompleted = Boolean(body.profile_completed ?? body.profileCompleted ?? true);
    const isGuest = Boolean(body.is_guest ?? body.isGuest);
    const requestEmail = normalizeEmail(body.email || body.user_email || body.userEmail);

    if (!isUuid(id)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (!nickname) return NextResponse.json({ error: 'Digite seu nickname.' }, { status: 400 });

    const authClient = getAuthClient(req);

    const { data: currentProfile, error: currentProfileError } = await authClient
      .from('profiles')
      .select('id,email,nickname,is_admin')
      .eq('id', id)
      .maybeSingle();

    if (currentProfileError) throw currentProfileError;

    const nicknameKey = normalizeNicknameForUniqueness(nickname);
    const currentNicknameKey = normalizeNicknameForUniqueness(currentProfile?.nickname || '');
    const nicknameUnchangedForThisUser = Boolean(currentProfile?.id) && nicknameKey === currentNicknameKey;

    if (!nicknameUnchangedForThisUser) {
      const { data: existingProfiles, error: duplicateError } = await authClient
        .from('profiles')
        .select('id,nickname')
        .neq('id', id)
        .limit(1000);

      if (duplicateError) throw duplicateError;

      const nicknameTaken = (existingProfiles || []).some((row: any) => normalizeNicknameForUniqueness(row.nickname) === nicknameKey);
      if (nicknameTaken) {
        return NextResponse.json({ error: 'Esse nickname ja esta em uso. Escolha outro.' }, { status: 409 });
      }
    }

    const resolvedEmail = currentProfile?.email || requestEmail || buildFallbackEmail(id, isGuest);

    const payload: Record<string, any> = {
      id,
      email: resolvedEmail,
      nickname,
      avatar_url: avatarUrl,
      music_genres: musicGenres,
      music_blocked_tracks: musicBlockedTracks,
      profile_completed: profileCompleted,
      is_guest: isGuest,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await authClient
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      if (isGuest) {
        return NextResponse.json({ profile: normalizeProfileResult({ ...payload, is_admin: Boolean(currentProfile?.is_admin) }) });
      }
      throw error;
    }

    return NextResponse.json({ profile: normalizeProfileResult(data) });
  } catch (error: any) {
    console.error('Player profile save error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel salvar o perfil.' }, { status: 500 });
  }
}

function getAuthClient(req: NextRequest) {
  if (hasSupabaseAuthServiceRole()) return getSupabaseAuthServer();

  const authorization = req.headers.get('authorization') || '';
  const url = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_URL_AUTH');
  const anonKey = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH');

  if (authorization && url && anonKey) {
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return getSupabaseAuthServer();
}

function normalizeProfileResult(profile: any) {
  if (!profile) return null;

  return {
    ...profile,
    email: normalizeEmail(profile.email),
    nickname: normalizeNicknameDisplay(profile.nickname || 'Jogador'),
    avatar_url: profile.avatar_url || '',
    music_genres: normalizeGenres(profile.music_genres),
    music_blocked_tracks: normalizeBlockedTracks(profile.music_blocked_tracks),
    profile_completed: Boolean(profile.profile_completed ?? true),
    played_matches: Number(profile.played_matches || 0),
    wins: Number(profile.wins || 0),
    is_guest: Boolean(profile.is_guest),
    is_admin: Boolean(profile.is_admin),
  };
}

function normalizeGenres(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, MAX_GENRES);
}

function normalizeBlockedTracks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => item && !item.includes('..') && !item.startsWith('/') && !item.includes('\\'))
    .slice(0, MAX_BLOCKED_TRACKS);
}

function normalizeNicknameDisplay(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeNicknameForUniqueness(value: unknown) {
  return normalizeNicknameDisplay(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function normalizeEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function buildFallbackEmail(id: string, isGuest: boolean) {
  return isGuest ? `guest_${id}@guest.com` : `player_${id}@quemsoueu.local`;
}

function normalizeProfileId(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/^profile:/, '').replace(/^user:/, '');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicEnvValue } from '@/lib/publicEnv';
import { getSupabaseAuthServer, hasSupabaseAuthServiceRole } from '@/lib/supabaseAdmin';

const DEFAULT_PLAYER_EMOJI = '🙂';

const PROFILE_SELECT_SAFE =
  'id,email,nickname,emoji,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

const PROFILE_SELECT_WITH_AVATAR_SET =
  'id,email,nickname,emoji,avatar_url,avatar_animation_set_id,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

export async function GET(req: NextRequest) {
  try {
    const userId = cleanId(req.nextUrl.searchParams.get('userId'));

    if (!isUuid(userId)) {
      return NextResponse.json({ profile: null, warning: 'Usuario invalido.' });
    }

    const db = client(req);
    const profile = await readProfile(db, userId);

    return NextResponse.json({ profile: normalizeProfile(profile) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Nao foi possivel carregar o perfil.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = cleanId(body.id || body.userId);
    const nickname = cleanText(body.nickname).slice(0, 16);

    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Digite seu nickname.' }, { status: 400 });
    }

    const db = client(req);
    const current = await readProfile(db, id);

    const wantedNick = nickKey(nickname);

    if (wantedNick !== nickKey(current?.nickname || '')) {
      const { data: rows, error: dupError } = await db
        .from('profiles')
        .select('id,nickname')
        .neq('id', id)
        .limit(1000);

      if (dupError) throw dupError;

      if ((rows || []).some((row: any) => nickKey(row.nickname) === wantedNick)) {
        return NextResponse.json(
          { error: 'Esse nickname ja esta em uso. Escolha outro.' },
          { status: 409 },
        );
      }
    }

    const avatarUrl =
      cleanAvatar(body.avatar_url || body.avatarUrl) ||
      cleanAvatar(current?.avatar_url);

    const avatarSetId =
      cleanText(body.avatar_animation_set_id || body.avatarAnimationSetId) ||
      cleanText(current?.avatar_animation_set_id);

    const isGuest = Boolean(body.is_guest ?? body.isGuest);

    const wantsCompleted = Boolean(body.profile_completed ?? body.profileCompleted ?? true);
    const profileCompleted = Boolean(wantsCompleted && nickname && avatarUrl);

    const payload: any = {
      id,
      email:
        current?.email ||
        cleanEmail(body.email || body.user_email || body.userEmail) ||
        (isGuest ? `guest_${id}@guest.com` : `player_${id}@quemsoueu.local`),
      nickname,
      emoji: cleanEmoji(body.emoji || body.playerEmoji),
      avatar_url: avatarUrl || null,
      avatar_animation_set_id: avatarSetId || null,
      music_genres: cleanList(body.music_genres || body.musicGenres, 8),
      music_blocked_tracks: cleanList(body.music_blocked_tracks || body.musicBlockedTracks, 300),
      profile_completed: profileCompleted,
      is_guest: isGuest,
      updated_at: new Date().toISOString(),
    };

    const data = await upsertProfile(db, payload);

    return NextResponse.json({
      profile: normalizeProfile({
        ...data,
        avatar_animation_set_id: data?.avatar_animation_set_id || avatarSetId || null,
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Nao foi possivel salvar o perfil.' },
      { status: 500 },
    );
  }
}

async function readProfile(db: any, id: string) {
  const withAvatarSet = await db
    .from('profiles')
    .select(PROFILE_SELECT_WITH_AVATAR_SET)
    .eq('id', id)
    .maybeSingle();

  if (!isAvatarSetSchemaError(withAvatarSet.error)) {
    if (withAvatarSet.error) throw withAvatarSet.error;
    return withAvatarSet.data;
  }

  const safe = await db
    .from('profiles')
    .select(PROFILE_SELECT_SAFE)
    .eq('id', id)
    .maybeSingle();

  if (safe.error) throw safe.error;

  return {
    ...(safe.data || {}),
    avatar_animation_set_id: null,
  };
}

async function upsertProfile(db: any, payload: any) {
  const withAvatarSet = await db
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_SELECT_WITH_AVATAR_SET)
    .single();

  if (!isAvatarSetSchemaError(withAvatarSet.error)) {
    if (withAvatarSet.error) throw withAvatarSet.error;
    return withAvatarSet.data;
  }

  const safePayload = { ...payload };
  delete safePayload.avatar_animation_set_id;

  const safe = await db
    .from('profiles')
    .upsert(safePayload, { onConflict: 'id' })
    .select(PROFILE_SELECT_SAFE)
    .single();

  if (safe.error) throw safe.error;

  return {
    ...(safe.data || {}),
    avatar_animation_set_id: payload.avatar_animation_set_id || null,
  };
}

function client(req: NextRequest) {
  if (hasSupabaseAuthServiceRole()) return getSupabaseAuthServer();

  const authorization = req.headers.get('authorization') || '';
  const url = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_URL_AUTH');
  const anonKey = getPublicEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY_AUTH');

  if (authorization && url && anonKey) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return getSupabaseAuthServer();
}

function normalizeProfile(profile: any) {
  if (!profile) return null;

  const avatarUrl = cleanAvatar(profile.avatar_url);
  const nickname = cleanText(profile.nickname || 'Jogador');

  return {
    ...profile,
    email: cleanEmail(profile.email),
    nickname,
    emoji: cleanEmoji(profile.emoji),
    avatar_url: avatarUrl,
    avatar_animation_set_id: cleanText(profile.avatar_animation_set_id),
    music_genres: cleanList(profile.music_genres, 8),
    music_blocked_tracks: cleanList(profile.music_blocked_tracks, 300),
    profile_completed: Boolean(profile.profile_completed && nickname && avatarUrl),
    played_matches: Number(profile.played_matches || 0),
    wins: Number(profile.wins || 0),
    is_guest: Boolean(profile.is_guest),
    is_admin: Boolean(profile.is_admin),
  };
}

function isAvatarSetSchemaError(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return Boolean(error) && message.includes('avatar_animation_set_id') && message.includes('schema');
}

function cleanList(value: unknown, max: number) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max)
    : [];
}

function cleanText(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function nickKey(value: unknown) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function cleanEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  return email && email.includes('@') ? email : '';
}

function cleanEmoji(value: unknown) {
  const emoji = String(value || '').trim();
  return Array.from(emoji).slice(0, 2).join('') || DEFAULT_PLAYER_EMOJI;
}

function cleanAvatar(value: unknown) {
  const text = String(value || '').trim();
  return text.startsWith('avatar:') ||
    text.startsWith('/api/r2-file?key=') ||
    text.startsWith('http')
    ? text
    : '';
}

function cleanId(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^profile:/, '')
    .replace(/^user:/, '');
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}

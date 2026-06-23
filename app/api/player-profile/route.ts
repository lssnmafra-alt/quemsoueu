import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';

const MAX_GENRES = 8;
const MAX_BLOCKED_TRACKS = 300;

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')?.trim() || '';
    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });

    const { data, error } = await supabaseGame
      .from('profiles')
      .select('id,nickname,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ profile: data || null });
  } catch (error: any) {
    console.error('Player profile read error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar o perfil.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || body.userId || '').trim();
    const nickname = normalizeNicknameDisplay(body.nickname).slice(0, 16);
    const avatarUrl = String(body.avatar_url || body.avatarUrl || '').trim();
    const musicGenres = normalizeGenres(body.music_genres || body.musicGenres);
    const musicBlockedTracks = normalizeBlockedTracks(body.music_blocked_tracks || body.musicBlockedTracks);
    const profileCompleted = Boolean(body.profile_completed ?? body.profileCompleted ?? true);
    const isGuest = Boolean(body.is_guest ?? body.isGuest);

    if (!isUuid(id)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (!nickname) return NextResponse.json({ error: 'Digite seu nickname.' }, { status: 400 });

    const nicknameKey = normalizeNicknameForUniqueness(nickname);
    const { data: existingProfiles, error: duplicateError } = await supabaseGame
      .from('profiles')
      .select('id,nickname')
      .neq('id', id)
      .limit(1000);

    if (duplicateError) throw duplicateError;

    const nicknameTaken = (existingProfiles || []).some((row: any) => normalizeNicknameForUniqueness(row.nickname) === nicknameKey);
    if (nicknameTaken) {
      return NextResponse.json({ error: 'Esse nickname ja esta em uso. Escolha outro.' }, { status: 409 });
    }

    const { data, error } = await supabaseGame
      .from('profiles')
      .upsert({
        id,
        nickname,
        avatar_url: avatarUrl,
        music_genres: musicGenres,
        music_blocked_tracks: musicBlockedTracks,
        profile_completed: profileCompleted,
        is_guest: isGuest,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('id,nickname,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error('Player profile save error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel salvar o perfil.' }, { status: 500 });
  }
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
    .toLowerCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

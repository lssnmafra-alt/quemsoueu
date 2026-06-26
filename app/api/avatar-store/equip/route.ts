import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';
import { getPublicR2Url } from '@/lib/r2Storage';
import { avatarSelectionToUrl, normalizeAvatarSelection } from '@/lib/avatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROFILE_SELECT_SAFE =
  'id,email,nickname,emoji,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

const PROFILE_SELECT_WITH_AVATAR_SET =
  'id,email,nickname,emoji,avatar_url,avatar_animation_set_id,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    const skinId = String(body.skinId || '').trim();

    if (!isUuid(userId)) {
      return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    }

    if (!isUuid(skinId)) {
      return NextResponse.json({ error: 'Skin invalida.' }, { status: 400 });
    }

    const db = getSupabaseAuthServer();

    const { data: skin, error: skinError } = await db
      .from('avatar_skins')
      .select('id,avatar_key,avatar_name,skin_code,skin_name,image_key,card_image_key,access_type,is_active')
      .eq('id', skinId)
      .maybeSingle();

    if (skinError) throw skinError;

    if (!skin?.is_active) {
      return NextResponse.json({ error: 'Skin indisponivel.' }, { status: 404 });
    }

    if (skin.access_type !== 'free') {
      const { data: unlock } = await db
        .from('user_avatar_unlocks')
        .select('avatar_skin_id,expires_at')
        .eq('user_id', userId)
        .eq('avatar_skin_id', skinId)
        .maybeSingle();

      const activeUnlock =
        unlock && (!unlock.expires_at || new Date(unlock.expires_at).getTime() > Date.now());

      if (!activeUnlock) {
        return NextResponse.json({ error: 'Voce ainda nao possui essa skin.' }, { status: 403 });
      }
    }

    const { data: animationRows, error: animationError } = await db
      .from('avatar_animations')
      .select('event_type,animation_key')
      .eq('avatar_skin_id', skinId)
      .eq('is_active', true);

    if (animationError) throw animationError;

    const animations = Object.fromEntries(
      (animationRows || [])
        .map((row: any) => [
          String(row.event_type || '').trim(),
          String(row.animation_key || '').trim(),
        ])
        .filter(([eventType, key]) => eventType && key),
    );

    const imageKey = String(skin.card_image_key || skin.image_key || '').trim();
    const imageUrl = await getPublicR2Url(imageKey);

    const avatarUrl = avatarSelectionToUrl(
      normalizeAvatarSelection({
        avatarId: skin.avatar_key,
        imageUrl,
        imageKey,
        animationSlug: `${skin.avatar_key}/${skin.skin_code}`,
        animations,
        avatarSetId: skin.id,
        skinCode: skin.skin_code,
        skinName: skin.skin_name,
        accessType: skin.access_type,
        displayName: skin.avatar_name,
      }),
    );

    const profile = await persistProfileAvatar(db, userId, avatarUrl, skinId);

    return NextResponse.json({
      ok: true,
      avatarUrl,
      profile: {
        ...(profile || {}),
        avatar_url: avatarUrl,
        avatar_animation_set_id: skinId,
        profile_completed: true,
      },
    });
  } catch (error: any) {
    console.error('Avatar equip error:', error);

    return NextResponse.json(
      { error: error.message || 'Nao foi possivel equipar.' },
      { status: 500 },
    );
  }
}

async function persistProfileAvatar(db: any, userId: string, avatarUrl: string, skinId: string) {
  const payload = {
    avatar_url: avatarUrl,
    avatar_animation_set_id: skinId,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };

  const updated = await db
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_SELECT_WITH_AVATAR_SET)
    .maybeSingle();

  if (!updated.error && updated.data) return updated.data;
  if (updated.error && !isAvatarSetSchemaError(updated.error)) throw updated.error;

  const safePayload = { ...payload } as any;
  delete safePayload.avatar_animation_set_id;

  const safeUpdated = await db
    .from('profiles')
    .update(safePayload)
    .eq('id', userId)
    .select(PROFILE_SELECT_SAFE)
    .maybeSingle();

  if (!safeUpdated.error && safeUpdated.data) {
    return { ...safeUpdated.data, avatar_animation_set_id: skinId };
  }

  if (safeUpdated.error) throw safeUpdated.error;

  const createPayload = {
    id: userId,
    email: `player_${userId}@quemsoueu.local`,
    nickname: 'Jogador',
    emoji: '🙂',
    is_guest: true,
    ...payload,
  };

  const inserted = await db
    .from('profiles')
    .upsert(createPayload, { onConflict: 'id' })
    .select(PROFILE_SELECT_WITH_AVATAR_SET)
    .maybeSingle();

  if (!inserted.error) return inserted.data;
  if (!isAvatarSetSchemaError(inserted.error)) throw inserted.error;

  const safeCreatePayload = { ...createPayload } as any;
  delete safeCreatePayload.avatar_animation_set_id;

  const safeInserted = await db
    .from('profiles')
    .upsert(safeCreatePayload, { onConflict: 'id' })
    .select(PROFILE_SELECT_SAFE)
    .maybeSingle();

  if (safeInserted.error) throw safeInserted.error;
  return { ...(safeInserted.data || {}), avatar_animation_set_id: skinId };
}

function isAvatarSetSchemaError(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return Boolean(error) && message.includes('avatar_animation_set_id') && (message.includes('schema') || message.includes('column'));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

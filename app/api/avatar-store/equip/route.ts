import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthServer } from '@/lib/supabaseAdmin';
import { getPublicR2Url } from '@/lib/r2Storage';
import { avatarSelectionToUrl, normalizeAvatarSelection } from '@/lib/avatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROFILE_SELECT_SAFE =
  'id,email,nickname,emoji,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,is_admin,updated_at,created_at';

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

    const profile = await setProfileAvatar(db, userId, avatarUrl, skinId);

    return NextResponse.json({
      ok: true,
      avatarUrl,
      profile: {
        ...(profile || {}),
        avatar_url: avatarUrl,
        avatar_animation_set_id: skinId,
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

async function setProfileAvatar(db: any, userId: string, avatarUrl: string, skinId: string) {
  const rpc = await db.rpc('set_profile_avatar', {
    p_user_id: userId,
    p_avatar_url: avatarUrl,
    p_avatar_animation_set_id: skinId,
  });

  if (!rpc.error && rpc.data) {
    return Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
  }

  const safe = await db
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PROFILE_SELECT_SAFE)
    .maybeSingle();

  if (safe.error) throw safe.error;

  return {
    ...(safe.data || {}),
    avatar_animation_set_id: skinId,
  };
}

function isUuid(value: string) {
  return value.length === 36 && value.includes('-');
}

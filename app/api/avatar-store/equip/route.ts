import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuth } from '@/lib/supabase';
import { getPublicR2Url } from '@/lib/r2Storage';
import { avatarSelectionToUrl, normalizeAvatarSelection } from '@/lib/avatars';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    const skinId = String(body.skinId || '').trim();

    if (!isUuid(userId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (!isUuid(skinId)) return NextResponse.json({ error: 'Skin invalida.' }, { status: 400 });

    const { data: skin, error: skinError } = await supabaseAuth
      .from('avatar_skins')
      .select('id,avatar_key,avatar_name,skin_code,skin_name,image_key,access_type,is_active')
      .eq('id', skinId)
      .maybeSingle();

    if (skinError) throw skinError;
    if (!skin?.is_active) return NextResponse.json({ error: 'Skin indisponivel.' }, { status: 404 });

    if (skin.access_type !== 'free') {
      const { data: unlock } = await supabaseAuth
        .from('user_avatar_unlocks')
        .select('avatar_skin_id,expires_at')
        .eq('user_id', userId)
        .eq('avatar_skin_id', skinId)
        .maybeSingle();

      const activeUnlock = unlock && (!unlock.expires_at || new Date(unlock.expires_at).getTime() > Date.now());
      if (!activeUnlock) return NextResponse.json({ error: 'Voce ainda nao possui essa skin.' }, { status: 403 });
    }

    const { data: animationRows, error: animationError } = await supabaseAuth
      .from('avatar_animations')
      .select('event_type,animation_key')
      .eq('avatar_skin_id', skinId)
      .eq('is_active', true);

    if (animationError) throw animationError;

    const animations = Object.fromEntries((animationRows || [])
      .map((row: any) => [String(row.event_type || '').trim(), String(row.animation_key || '').trim()])
      .filter(([eventType, key]) => eventType && key));

    const imageUrl = await getPublicR2Url(skin.image_key);
    const avatarUrl = avatarSelectionToUrl(normalizeAvatarSelection({
      avatarId: skin.avatar_key,
      imageUrl,
      imageKey: skin.image_key,
      animationSlug: `${skin.avatar_key}/${skin.skin_code}`,
      animations,
      avatarSetId: skin.id,
      skinCode: skin.skin_code,
      skinName: skin.skin_name,
      accessType: skin.access_type,
      displayName: skin.avatar_name,
    }));

    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id,nickname,avatar_url,music_genres,music_blocked_tracks,profile_completed,played_matches,wins,is_guest,updated_at')
      .maybeSingle();

    if (profileError) throw profileError;
    return NextResponse.json({ ok: true, avatarUrl, profile });
  } catch (error: any) {
    console.error('Avatar equip error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel equipar.' }, { status: 500 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

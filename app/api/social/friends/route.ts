import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';

const PROFILE_SELECT = 'id,nickname,emoji,avatar_url,played_matches,wins,is_guest,updated_at';

type Friendship = {
  id: string;
  requester_profile_id: string;
  receiver_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  blocked_by_profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function GET(req: NextRequest) {
  try {
    const userId = normalizeProfileId(req.nextUrl.searchParams.get('userId'));
    const search = (req.nextUrl.searchParams.get('search') || req.nextUrl.searchParams.get('q') || '').trim();
    if (!isUuid(userId)) return NextResponse.json({ friends: [], incoming: [], outgoing: [], blocked: [], all: [], searchResults: [], received: [], sent: [], results: [] });

    const { data: rows, error } = await supabaseGame
      .from('friendships')
      .select('*')
      .or(`requester_profile_id.eq.${userId},receiver_profile_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const friendships = (rows || []) as Friendship[];
    const relatedIds = [...new Set(friendships.flatMap((row) => [row.requester_profile_id, row.receiver_profile_id]).filter((id) => id && id !== userId))];
    const { data: relatedProfiles, error: relatedError } = relatedIds.length
      ? await supabaseGame.from('profiles').select(PROFILE_SELECT).in('id', relatedIds)
      : { data: [], error: null };
    if (relatedError) throw relatedError;

    const profileMap = new Map((relatedProfiles || []).map((profile: any) => [profile.id, normalizeProfile(profile)]));
    const decorate = (row: Friendship) => {
      const otherId = row.requester_profile_id === userId ? row.receiver_profile_id : row.requester_profile_id;
      return {
        ...row,
        direction: row.requester_profile_id === userId ? 'outgoing' : 'incoming',
        other_profile_id: otherId,
        other_profile: profileMap.get(otherId) || null,
      };
    };

    let searchResults: any[] = [];
    if (search.length >= 2) {
      const terms = buildSearchTerms(search);
      const orFilter = terms
        .map((term) => `nickname.ilike.%${escapeLike(term)}%`)
        .join(',');

      const { data: profiles, error: searchError } = await supabaseGame
        .from('profiles')
        .select(PROFILE_SELECT)
        .or(orFilter)
        .neq('id', userId)
        .limit(30);
      if (searchError) throw searchError;

      const blockedIds = new Set(friendships.filter((row) => row.status === 'blocked').flatMap((row) => [row.requester_profile_id, row.receiver_profile_id]));
      searchResults = dedupeProfiles(profiles || []).map(normalizeProfile).filter((profile: any) => !blockedIds.has(profile.id));
    }

    const decorated = friendships.map(decorate);
    return NextResponse.json({
      friends: decorated.filter((row: any) => row.status === 'accepted'),
      incoming: decorated.filter((row: any) => row.status === 'pending' && row.receiver_profile_id === userId),
      outgoing: decorated.filter((row: any) => row.status === 'pending' && row.requester_profile_id === userId),
      blocked: decorated.filter((row: any) => row.status === 'blocked'),
      all: decorated,
      searchResults,
      received: decorated.filter((row: any) => row.status === 'pending' && row.receiver_profile_id === userId),
      sent: decorated.filter((row: any) => row.status === 'pending' && row.requester_profile_id === userId),
      results: searchResults,
    });
  } catch (error: any) {
    console.error('Friends read error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel carregar amigos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = normalizeProfileId(body.userId || body.profileId);
    const targetId = normalizeProfileId(body.targetId || body.targetProfileId);
    const action = String(body.action || '').trim();

    if (!isUuid(userId) || !isUuid(targetId)) return NextResponse.json({ error: 'Usuario invalido.' }, { status: 400 });
    if (userId === targetId) return NextResponse.json({ error: 'Voce nao pode adicionar seu proprio perfil.' }, { status: 400 });

    const existing = await findFriendship(userId, targetId);

    if (action === 'request') {
      if (existing?.status === 'blocked') return NextResponse.json({ error: 'Perfil bloqueado.' }, { status: 409 });
      if (existing?.status === 'accepted') return NextResponse.json({ error: 'Vocês já são amigos.' }, { status: 409 });
      if (existing?.status === 'pending') {
        const sentByUser = existing.requester_profile_id === userId;
        return NextResponse.json({ error: sentByUser ? 'Pedido já enviado.' : 'Este jogador já enviou um pedido para você.' }, { status: 409 });
      }

      const { data, error } = await supabaseGame
        .from('friendships')
        .insert({ requester_profile_id: userId, receiver_profile_id: targetId, status: 'pending' })
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, friendship: data, status: 'pending' });
    }

    if (action === 'accept') {
      if (!existing || existing.status !== 'pending' || existing.receiver_profile_id !== userId) return NextResponse.json({ error: 'Pedido nao encontrado.' }, { status: 404 });
      const { data, error } = await supabaseGame
        .from('friendships')
        .update({ status: 'accepted', blocked_by_profile_id: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      await unlockSocialTrophy(userId);
      await unlockSocialTrophy(targetId);
      return NextResponse.json({ friendship: data, status: 'accepted' });
    }

    if (action === 'decline' || action === 'cancel') {
      if (!existing || existing.status !== 'pending') return NextResponse.json({ ok: true, status: 'removed' });
      const { error } = await supabaseGame.from('friendships').delete().eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: 'removed' });
    }

    if (action === 'remove' || action === 'unblock') {
      if (existing) {
        const { error } = await supabaseGame.from('friendships').delete().eq('id', existing.id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, status: 'removed' });
    }

    if (action === 'block') {
      if (existing) {
        const { data, error } = await supabaseGame.from('friendships').update({ status: 'blocked', blocked_by_profile_id: userId, updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').single();
        if (error) throw error;
        return NextResponse.json({ friendship: data, status: 'blocked' });
      }

      const { data, error } = await supabaseGame
        .from('friendships')
        .insert({ requester_profile_id: userId, receiver_profile_id: targetId, status: 'blocked', blocked_by_profile_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ friendship: data, status: 'blocked' });
    }

    return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Friends action error:', error);
    return NextResponse.json({ error: error.message || 'Nao foi possivel atualizar amizade.' }, { status: 500 });
  }
}

async function findFriendship(userId: string, targetId: string) {
  const { data, error } = await supabaseGame
    .from('friendships')
    .select('*')
    .or(`and(requester_profile_id.eq.${userId},receiver_profile_id.eq.${targetId}),and(requester_profile_id.eq.${targetId},receiver_profile_id.eq.${userId})`)
    .maybeSingle();
  if (error) throw error;
  return data as Friendship | null;
}

async function unlockSocialTrophy(profileId: string) {
  const { data: trophy } = await supabaseGame.from('trophies').select('id').eq('code', 'social_player').maybeSingle();
  if (!trophy?.id) return;
  await supabaseGame.from('profile_trophies').upsert({ profile_id: profileId, trophy_id: trophy.id }, { onConflict: 'profile_id,trophy_id' });
}

function buildSearchTerms(value: string) {
  const full = value.trim();
  const parts = full.split(/\s+/).map((part) => part.trim()).filter((part) => part.length >= 2);
  return [...new Set([full, ...parts])].slice(0, 5);
}

function normalizeProfile(profile: any) {
  if (!profile) return null;
  return {
    ...profile,
    emoji: normalizeEmoji(profile.emoji),
    avatar_url: profile.avatar_url || '',
  };
}

function normalizeEmoji(value: unknown) {
  const text = String(value || '').trim();
  return Array.from(text).slice(0, 2).join('') || '🙂';
}

function dedupeProfiles(profiles: any[]) {
  const map = new Map<string, any>();
  profiles.forEach((profile) => {
    if (profile?.id && !map.has(profile.id)) map.set(profile.id, profile);
  });
  return [...map.values()];
}

function escapeLike(value: string) {
  return value.replace(/[\%_]/g, (match) => `\${match}`);
}

function normalizeProfileId(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/^profile:/, '').replace(/^user:/, '');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

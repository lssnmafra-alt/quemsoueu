import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId } from '@/lib/officialDecks';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';
import { isProjectAdmin } from '@/lib/admin';

const OFFICIAL_FRAME_THEMES = new Set(['arcane', 'nature', 'ruby', 'shadow', 'celestial']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deckId = String(body.deckId || '');
    const action = String(body.action || '');
    const userId = String(body.userId || body.requesterId || '').trim();

    if (!isProjectAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso de ADM necessario.' }, { status: 403 });
    }

    if (action === 'create-official-deck') {
      const name = String(body.name || '').trim();
      const coverUrl = String(body.coverUrl || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatorio.' }, { status: 400 });
      }

      if (name.length > 60) {
        return NextResponse.json({ error: 'Nome muito longo. Use ate 60 caracteres.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('decks')
        .insert({
          name,
          creator_id: userId,
          is_public: true,
          is_official: true,
          cover_url: coverUrl,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ deck: data });
    }

    const canEditOfficialDeck = await isEditableOfficialDeck(deckId);

    if (!canEditOfficialDeck) {
      return NextResponse.json({ error: 'Deck oficial invalido.' }, { status: 403 });
    }

    if (action === 'add-character') {
      const { count, error: countError } = await supabaseGame
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId);

      if (countError) throw countError;

      if ((count || 0) >= MAX_CHARACTERS_PER_DECK) {
        return NextResponse.json(
          { error: `Cada baralho pode ter no maximo ${MAX_CHARACTERS_PER_DECK} personagens.` },
          { status: 400 },
        );
      }

      const name = String(body.name || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatorio.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('characters')
        .insert({
          deck_id: deckId,
          name,
          image_url: String(body.imageUrl || ''),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ character: data });
    }

    if (action === 'bulk-add-characters') {
      const rows = Array.isArray(body.characters) ? body.characters : [];
      const cleanRows = rows
        .map((row: any) => ({
          name: String(row?.name || '').trim(),
          image_url: String(row?.imageUrl || row?.image_url || '').trim(),
        }))
        .filter((row: any) => row.name)
        .slice(0, MAX_CHARACTERS_PER_DECK);

      if (!cleanRows.length) {
        return NextResponse.json({ error: 'Cole pelo menos um personagem valido.' }, { status: 400 });
      }

      const { count, error: countError } = await supabaseGame
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId);

      if (countError) throw countError;

      const availableSlots = Math.max(0, MAX_CHARACTERS_PER_DECK - (count || 0));
      const selectedRows = cleanRows.slice(0, availableSlots);

      if (!selectedRows.length) {
        return NextResponse.json({ error: `O deck ja atingiu o limite de ${MAX_CHARACTERS_PER_DECK} personagens.` }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('characters')
        .insert(selectedRows.map((row: any) => ({ deck_id: deckId, name: row.name, image_url: row.image_url })))
        .select();

      if (error) throw error;

      return NextResponse.json({ characters: data || [], inserted: data?.length || 0, skipped: cleanRows.length - selectedRows.length });
    }

    if (action === 'delete-character') {
      const characterId = String(body.characterId || '');

      if (!characterId) {
        return NextResponse.json({ error: 'Card obrigatorio.' }, { status: 400 });
      }

      const { error } = await supabaseGame
        .from('characters')
        .delete()
        .eq('id', characterId)
        .eq('deck_id', deckId);

      if (error) throw error;

      return NextResponse.json({ ok: true, characterId });
    }

    if (action === 'update-frame-theme') {
      const characterId = String(body.characterId || '').trim();
      const name = String(body.name || '').trim();
      const imageUrl = String(body.imageUrl || '').trim();
      const frameTheme = String(body.frameTheme || '').trim();

      if (!OFFICIAL_FRAME_THEMES.has(frameTheme)) {
        return NextResponse.json({ error: 'Cor de moldura invalida.' }, { status: 400 });
      }

      if (!characterId && !name) {
        return NextResponse.json({ error: 'Card obrigatorio.' }, { status: 400 });
      }

      let query = supabaseGame
        .from('characters')
        .select('id, name, image_url, avatar_config')
        .eq('deck_id', deckId);

      if (characterId) {
        query = query.eq('id', characterId);
      } else {
        query = query.eq('name', name);

        if (imageUrl) {
          query = query.eq('image_url', imageUrl);
        }
      }

      const { data: characters, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!characters?.length) {
        return NextResponse.json({ error: 'Card oficial nao encontrado.' }, { status: 404 });
      }

      const updatedCharacters = await Promise.all(
        characters.map(async (character: any) => {
          const currentAvatarConfig = isPlainObject(character.avatar_config) ? character.avatar_config : {};

          const { data, error } = await supabaseGame
            .from('characters')
            .update({
              avatar_config: {
                ...currentAvatarConfig,
                officialFrameTheme: frameTheme,
              },
            })
            .eq('id', character.id)
            .eq('deck_id', deckId)
            .select()
            .single();

          if (error) throw error;

          return data;
        }),
      );

      return NextResponse.json({ character: updatedCharacters[0], characters: updatedCharacters });
    }

    if (action === 'update-character') {
      const characterId = String(body.characterId || '');
      const updates: Record<string, unknown> = {};

      if (typeof body.name === 'string') {
        updates.name = body.name.trim();
      }

      if (typeof body.imageUrl === 'string') {
        updates.image_url = body.imageUrl.trim();
      }

      if (isPlainObject(body.avatarConfig)) {
        updates.avatar_config = body.avatarConfig;
      }

      if (!characterId) {
        return NextResponse.json({ error: 'Card obrigatorio.' }, { status: 400 });
      }

      if (!updates.name && !('image_url' in updates) && !('avatar_config' in updates)) {
        return NextResponse.json({ error: 'Nada para salvar.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('characters')
        .update(updates)
        .eq('id', characterId)
        .eq('deck_id', deckId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ character: data });
    }

    if (action === 'update-deck-name') {
      const name = String(body.name || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatorio.' }, { status: 400 });
      }

      if (name.length > 60) {
        return NextResponse.json({ error: 'Nome muito longo. Use ate 60 caracteres.' }, { status: 400 });
      }

      const { data, error } = await supabaseGame
        .from('decks')
        .update({ name, is_official: true, is_public: true })
        .eq('id', deckId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ deck: data });
    }

    if (action === 'update-cover') {
      const coverUrl = String(body.coverUrl || '').trim();

      const { data, error } = await supabaseGame
        .from('decks')
        .update({ cover_url: coverUrl, is_official: true, is_public: true })
        .eq('id', deckId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ deck: data });
    }

    return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Official deck edit error:', error);

    return NextResponse.json(
      { error: error.message || 'Erro ao editar deck oficial.' },
      { status: 500 },
    );
  }
}

async function isEditableOfficialDeck(deckId: string) {
  if (!deckId) return false;
  if (isOfficialDeckId(deckId)) return true;

  const { data, error } = await supabaseGame
    .from('decks')
    .select('id, creator_id, is_official')
    .eq('id', deckId)
    .single();

  if (error || !data) return false;

  return Boolean(data.is_official) || data.creator_id === null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

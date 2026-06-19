import { NextRequest, NextResponse } from 'next/server';
import { supabaseGame } from '@/lib/supabase';
import { isOfficialDeckId, TEMP_OFFICIAL_DECK_EDITING_ENABLED } from '@/lib/officialDecks';
import { MAX_CHARACTERS_PER_DECK } from '@/lib/deckRules';

const OFFICIAL_FRAME_THEMES = new Set(['arcane', 'nature', 'ruby', 'shadow', 'celestial']);

export async function POST(req: NextRequest) {
  try {
    if (!TEMP_OFFICIAL_DECK_EDITING_ENABLED) {
      return NextResponse.json({ error: 'Edicao oficial desativada.' }, { status: 403 });
    }

    const body = await req.json();
    const deckId = String(body.deckId || '');
    const action = String(body.action || '');

    if (!isOfficialDeckId(deckId)) {
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
        .update({ name })
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
        .update({ cover_url: coverUrl })
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

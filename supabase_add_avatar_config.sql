-- Execute no SQL Editor do Supabase 2 (Dados do Jogo)
-- Mantem image_url para cards oficiais/admin e adiciona avatar_config para cards criados por jogadores.

ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS avatar_config JSONB;

COMMENT ON COLUMN public.characters.avatar_config IS
  'Configuracao JSON do Avatar Builder 2D para cards criados por jogadores. Cards oficiais podem continuar usando image_url.';

UPDATE public.characters
SET avatar_config = jsonb_build_object(
  'skin', 'skin-02',
  'face', 'face-01',
  'eyes', 'eyes-01',
  'hair', 'hair-01',
  'hairColor', '#1f2937',
  'clothes', 'clothes-01',
  'clothesColor', '#7c3aed',
  'accessory', 'none',
  'background', 'bg-01',
  'frame', 'frame-common'
)
WHERE avatar_config IS NULL;

'use client';

import { useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getKnownCharacterAvatar } from '@/lib/characterAvatars';

type CharacterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  name: string;
  imageUrl?: string | null;
  alt?: string;
  placeholderClassName?: string;
};

export default function CharacterImage({
  name,
  imageUrl,
  alt,
  className,
  placeholderClassName,
  onError,
  referrerPolicy = 'no-referrer',
  ...props
}: CharacterImageProps) {
  const sources = useMemo(() => {
    const savedImage = sanitizeSavedImageUrl(imageUrl);
    const staticCard = getStaticCard(name) || undefined;
    const fallback = getKnownCharacterAvatar(name) || undefined;

    return [savedImage, staticCard, fallback].filter((src, index, list): src is string => {
      return Boolean(src) && list.indexOf(src) === index;
    });
  }, [name, imageUrl]);

  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const src = sources.find((candidate) => !brokenUrls[candidate]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (src) {
      setBrokenUrls((current) => ({ ...current, [src]: true }));
    }

    onError?.(event);
  };

  if (!src) {
    return (
      <div className={cn('bg-slate-100 flex items-center justify-center', className, placeholderClassName)}>
        <ImageIcon className="w-5 h-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt ?? name}
      referrerPolicy={referrerPolicy}
      className={className}
      onError={handleError}
    />
  );
}

function sanitizeSavedImageUrl(value?: string | null) {
  const url = value?.trim();

  if (!url) return undefined;
  if (isBadGeneratedFallback(url)) return undefined;

  return url;
}

function isBadGeneratedFallback(url: string) {
  const normalized = url.toLowerCase();

  return (
    normalized.startsWith('data:image/svg') ||
    normalized.includes('fallback-svg') ||
    normalized.includes('source=fallback') ||
    normalized.includes('generic') ||
    normalized.includes('placeholder') ||
    (normalized.includes('/characters/') && normalized.endsWith('.svg'))
  );
}

function getStaticCard(name: string) {
  const normalizedName = normalizeSearchText(name);

  if (!normalizedName) return '';

  const exact = STATIC_CARD_RULES.find((rule) =>
    rule.aliases.some((alias) => normalizeSearchText(alias) === normalizedName),
  );

  if (exact) return exact.path;

  const partial = STATIC_CARD_RULES.find((rule) =>
    rule.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedAlias.length >= 4 && normalizedName.includes(normalizedAlias);
    }),
  );

  return partial?.path || '';
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STATIC_CARD_RULES: Array<{ path: string; aliases: string[] }> = [
  { path: '/official-cards/football/cristiano-ronaldo.png', aliases: ['cristiano ronaldo', 'cr7', 'ronaldo'] },
  { path: '/official-cards/football/haaland.png', aliases: ['haaland', 'erling haaland'] },
  { path: '/official-cards/football/hulk-fluminense.png', aliases: ['hulk fluminense', 'hulk jogador', 'hulk futebol', 'givanildo vieira'] },
  { path: '/official-cards/football/lamine-yamal.png', aliases: ['lamine yamal', 'yamal'] },
  { path: '/official-cards/football/mbappe.png', aliases: ['mbappe', 'mbappé', 'kylian mbappe', 'kylian mbappé'] },
  { path: '/official-cards/football/messi.png', aliases: ['messi', 'lionel messi'] },
  { path: '/official-cards/football/neymar.png', aliases: ['neymar', 'neymar jr', 'neymar junior'] },
  { path: '/official-cards/football/vini-jr.png', aliases: ['vini jr', 'vinicius jr', 'vinícius jr', 'vinicius junior', 'vinícius junior'] },

  { path: '/official-cards/games/bob-esponja.png', aliases: ['bob esponja', 'spongebob'] },
  { path: '/official-cards/games/elsa.png', aliases: ['elsa', 'frozen elsa'] },
  { path: '/official-cards/games/goku.png', aliases: ['goku', 'son goku'] },
  { path: '/official-cards/games/mario.png', aliases: ['mario', 'super mario'] },
  { path: '/official-cards/games/naruto.png', aliases: ['naruto', 'naruto uzumaki'] },
  { path: '/official-cards/games/pikachu.png', aliases: ['pikachu'] },
  { path: '/official-cards/games/shrek.png', aliases: ['shrek'] },
  { path: '/official-cards/games/sonic.png', aliases: ['sonic', 'sonic the hedgehog'] },

  { path: '/official-cards/heroes/batman.png', aliases: ['batman'] },
  { path: '/official-cards/heroes/capitao-america.png', aliases: ['capitao america', 'capitão américa', 'captain america'] },
  { path: '/official-cards/heroes/homem-de-ferro.png', aliases: ['homem de ferro', 'homem-de-ferro', 'iron man', 'tony stark'] },
  { path: '/official-cards/heroes/hulk-marvel.png', aliases: ['hulk marvel', 'bruce banner'] },
  { path: '/official-cards/heroes/mulher-maravilha.png', aliases: ['mulher maravilha', 'mulher-maravilha', 'wonder woman'] },
  { path: '/official-cards/heroes/pantera-negra.png', aliases: ['pantera negra', 'black panther'] },
  { path: '/official-cards/heroes/superman.png', aliases: ['superman', 'super homem', 'super-homem'] },
  { path: '/official-cards/heroes/thor.png', aliases: ['thor'] },

  { path: '/official-cards/music/anitta.png', aliases: ['anitta'] },
  { path: '/official-cards/music/ariana-grande.png', aliases: ['ariana grande'] },
  { path: '/official-cards/music/beyonce.png', aliases: ['beyonce', 'beyoncé'] },
  { path: '/official-cards/music/bruno-mars.png', aliases: ['bruno mars'] },
  { path: '/official-cards/music/michael-jackson.png', aliases: ['michael jackson'] },
  { path: '/official-cards/music/rihanna.png', aliases: ['rihanna'] },
  { path: '/official-cards/music/taylor-swift.png', aliases: ['taylor swift'] },
  { path: '/official-cards/music/the-weeknd.png', aliases: ['the weeknd', 'weeknd'] },

  { path: '/official-cards/villains/coringa.png', aliases: ['coringa', 'joker'] },
  { path: '/official-cards/villains/darth-vader.png', aliases: ['darth vader'] },
  { path: '/official-cards/villains/duende-verde.png', aliases: ['duende verde', 'green goblin'] },
  { path: '/official-cards/villains/lex-luthor.png', aliases: ['lex luthor'] },
  { path: '/official-cards/villains/loki.png', aliases: ['loki'] },
  { path: '/official-cards/villains/magneto.png', aliases: ['magneto'] },
  { path: '/official-cards/villains/thanos.png', aliases: ['thanos'] },
  { path: '/official-cards/villains/voldemort.png', aliases: ['voldemort'] },

  { path: '/standard-cards/aquaman.png', aliases: ['aquaman'] },
  { path: '/standard-cards/homem-aranha.png', aliases: ['homem aranha', 'homem-aranha', 'spider man', 'spider-man', 'spiderman'] },
  { path: '/standard-cards/hulk.png', aliases: ['hulk'] },
  { path: '/standard-cards/lucas-moura.png', aliases: ['lucas moura', 'lucas mourea'] },
];

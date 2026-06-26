type PreloadRoomAssetsOptions = {
  room?: any;
  players?: any[];
  profile?: any;
  userId?: string;
  minMs?: number;
};

const DEFAULT_MIN_MS = 4200;
const PRELOAD_TIMEOUT_MS = 3800;

export async function preloadRoomAssets({ room, players = [], profile, userId, minMs = DEFAULT_MIN_MS }: PreloadRoomAssetsOptions) {
  if (typeof window === 'undefined') return;

  const startedAt = Date.now();
  const tasks: Promise<any>[] = [];

  try {
    localStorage.setItem('quemSouEu:lastRoomPreloadAt', new Date().toISOString());
    localStorage.setItem('quemSouEu:lastRoomPreloadStatus', String(room?.status || 'LOBBY'));
  } catch {}

  tasks.push(preloadImage('/api/branding/logo'));
  tasks.push(preloadImage('/api/branding/loading?kind=image'));
  tasks.push(preloadAudioLibrary(profile));
  tasks.push(preloadAvatarAnimationUrls(players, userId));

  await withTimeout(Promise.allSettled(tasks), PRELOAD_TIMEOUT_MS);

  const remaining = minMs - (Date.now() - startedAt);
  if (remaining > 0) await wait(remaining);
}

async function preloadAudioLibrary(profile?: any) {
  try {
    const libraryResponse = await fetch('/api/audio/library', { cache: 'no-store' });
    const library = await libraryResponse.json().catch(() => ({ tracks: [] }));
    try { localStorage.setItem('quemSouEu:musicLibrary', JSON.stringify(library)); } catch {}

    const genres = Array.isArray(profile?.music_genres) ? profile.music_genres : [];
    const blocked = Array.isArray(profile?.music_blocked_tracks) ? profile.music_blocked_tracks : [];
    const params = new URLSearchParams({ mood: 'game-theme' });
    genres.slice(0, 8).forEach((genre: string) => params.append('genre', genre));
    blocked.slice(0, 40).forEach((key: string) => params.append('exclude', key));

    const trackResponse = await fetch(`/api/audio/track?${params.toString()}`, { cache: 'no-store' });
    const track = await trackResponse.json().catch(() => null);
    if (track?.url) await warmCache(track.url);

    const tracks = Array.isArray(library.tracks) ? library.tracks.slice(0, 8) : [];
    await Promise.allSettled(tracks.map((item: any) => item?.url ? warmCache(item.url) : Promise.resolve(null)));
  } catch {}
}

async function preloadAvatarAnimationUrls(players: any[], userId?: string) {
  const uniquePlayers = players
    .filter((player) => player?.avatar_url)
    .filter((player, index, list) => list.findIndex((item) => item.avatar_url === player.avatar_url) === index)
    .slice(0, 8);

  const urls: string[] = [];

  await Promise.allSettled(uniquePlayers.map(async (player) => {
    const events = player.user_id === userId ? ['intro', 'victory', 'defeat'] : ['intro'];
    for (const eventType of events) {
      const response = await fetch(`/api/avatar-animation-video?avatarUrl=${encodeURIComponent(player.avatar_url)}&eventType=${eventType}&v=central`, { cache: 'no-store' }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      const primary = result?.videoUrl || result?.url;
      if (primary) urls.push(String(primary));
      if (result?.fallbackUrl) urls.push(String(result.fallbackUrl));
    }
  }));

  await Promise.allSettled([...new Set(urls)].slice(0, 16).map((url) => warmCache(url)));
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

async function warmCache(url: string) {
  await fetch(url, { cache: 'force-cache' }).catch(() => null);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([promise, wait(timeoutMs)]);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

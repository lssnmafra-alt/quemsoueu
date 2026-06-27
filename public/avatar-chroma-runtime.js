(() => {
  const cache = new Map();
  const processed = new WeakMap();
  const TOLERANCE = 96;
  const SOFT_EDGE = 38;

  function normalizeComparable(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/doutor/g, 'dr')
      .replace(/[^a-z0-9]+/g, '');
  }

  function cleanKey(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/\.[^.]+$/, '')
      .replace(/:\s*skin.*$/i, '')
      .replace(/:skin.*$/i, '')
      .trim();
  }

  function unique(values) {
    const seen = new Set();
    const output = [];

    values.forEach((value) => {
      const cleaned = cleanKey(value);
      const key = normalizeComparable(cleaned);
      if (!cleaned || seen.has(key)) return;
      seen.add(key);
      output.push(cleaned);
    });

    return output;
  }

  function identifiersFromVideo(video) {
    const raw = video.currentSrc || video.src || '';
    if (!raw) return [];

    try {
      const url = new URL(raw, window.location.href);
      const key = decodeURIComponent(url.searchParams.get('key') || '');
      const path = decodeURIComponent(url.pathname || '');
      const filename = cleanKey((key || path).split('/').pop() || '');
      const strippedFile = filename.replace(/-(a|home|intro|lobby|idle|loop|sala|1|2|3|11|12|13|21|22|23|31|32|33)$/i, '');
      const keyParts = key.split('/').map(cleanKey);

      return unique([
        key,
        ...keyParts,
        filename,
        strippedFile,
      ]);
    } catch {
      return [];
    }
  }

  function hexToRgb(hex) {
    const value = String(hex || '').trim();
    const normalized = value.startsWith('#') ? value : '#' + value;
    const match = normalized.match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;

    const number = parseInt(match[1], 16);
    return {
      r: (number >> 16) & 255,
      g: (number >> 8) & 255,
      b: number & 255,
    };
  }

  async function getRule(identifiers, rawSrc) {
    if (!identifiers.length && !rawSrc) return null;

    const cacheKey = normalizeComparable(identifiers.join('|') || rawSrc);
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const params = new URLSearchParams();
    if (identifiers[0]) params.set('avatarKey', identifiers[0]);
    if (rawSrc) params.set('avatarUrl', rawSrc);
    if (identifiers[1]) params.set('slug', identifiers[1]);

    try {
      const response = await fetch('/api/avatar-chroma-key?' + params.toString(), { cache: 'force-cache' });
      const result = await response.json().catch(() => null);
      const rule = result && result.available && result.enabled !== false && result.hexColor ? result : null;
      cache.set(cacheKey, rule);
      return rule;
    } catch {
      cache.set(cacheKey, null);
      return null;
    }
  }

  function fitRect(video, canvas) {
    const videoWidth = video.videoWidth || 1;
    const videoHeight = video.videoHeight || 1;
    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const fit = window.getComputedStyle(video).objectFit || 'cover';
    const scale = fit === 'contain'
      ? Math.min(canvasWidth / videoWidth, canvasHeight / videoHeight)
      : Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
    const width = videoWidth * scale;
    const height = videoHeight * scale;

    return {
      x: (canvasWidth - width) / 2,
      y: (canvasHeight - height) / 2,
      width,
      height,
    };
  }

  function prepareCanvas(video) {
    const canvas = document.createElement('canvas');
    canvas.className = video.className || '';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:transparent;';

    const parent = video.parentElement;
    if (parent) {
      const position = window.getComputedStyle(parent).position;
      if (position === 'static') parent.style.position = 'relative';
      parent.insertBefore(canvas, video.nextSibling);
    }

    video.style.opacity = '0';
    video.style.backgroundColor = 'transparent';
    video.dataset.qseChromaCanvas = '1';

    return canvas;
  }

  function resizeCanvas(video, canvas) {
    const rect = video.getBoundingClientRect();
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function drawFrame(video, canvas, target) {
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

    resizeCanvas(video, canvas);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = fitRect(video, canvas);
    ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height);

    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = frame.data;

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - target.r;
      const dg = data[i + 1] - target.g;
      const db = data[i + 2] - target.b;
      const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db));

      if (distance <= TOLERANCE) {
        data[i + 3] = 0;
      } else if (distance <= TOLERANCE + SOFT_EDGE) {
        data[i + 3] = Math.round(data[i + 3] * ((distance - TOLERANCE) / SOFT_EDGE));
      }
    }

    ctx.putImageData(frame, 0, 0);
  }

  function startCanvasChroma(video, rule) {
    const target = hexToRgb(rule.hexColor);
    if (!target) return;

    const canvas = prepareCanvas(video);
    let stopped = false;

    const render = () => {
      if (stopped || !document.contains(video)) {
        canvas.remove();
        return;
      }

      drawFrame(video, canvas, target);
      window.requestAnimationFrame(render);
    };

    video.dataset.qseChromaKey = rule.label || rule.chromaKeyId || '';
    video.dataset.qseChromaColor = rule.hexColor || '';
    video.addEventListener('emptied', () => {
      stopped = true;
      canvas.remove();
      video.style.opacity = '';
    }, { once: true });

    render();

    return () => {
      stopped = true;
      canvas.remove();
      video.style.opacity = '';
    };
  }

  async function apply(video) {
    if (!video) return;

    const src = video.currentSrc || video.src || '';
    if (!src || (!src.includes('/api/r2-animation/') && !src.includes('/Animacao/') && !src.includes('/avatar/'))) return;

    const previous = processed.get(video);
    if (previous && previous.src === src) return;
    if (previous && previous.cleanup) previous.cleanup();
    processed.set(video, { src, cleanup: null });

    const identifiers = identifiersFromVideo(video);
    const rule = await getRule(identifiers, src);

    if (!rule) {
      video.style.filter = '';
      video.style.opacity = '';
      return;
    }

    processed.set(video, { src, cleanup: startCanvasChroma(video, rule) });
  }

  function scan() {
    document.querySelectorAll('video').forEach(apply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

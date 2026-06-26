(() => {
  const cache = new Map();

  const filters = {
    '#00ff00': 'qse-chroma-green',
    '#006bff': 'qse-chroma-blue',
    '#ff0033': 'qse-chroma-red',
    '#ffffff': 'qse-chroma-white',
    '#7c3aed': 'qse-chroma-purple',
  };

  function installFilters() {
    if (document.getElementById('qse-chroma-svg-filters')) return;

    const box = document.createElement('div');
    box.id = 'qse-chroma-svg-filters';
    box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';

    box.innerHTML =
      '<svg width="0" height="0" aria-hidden="true">' +
      '<filter id="qse-chroma-green" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 -1 1 0 1"/></filter>' +
      '<filter id="qse-chroma-blue" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 -1 0 1"/></filter>' +
      '<filter id="qse-chroma-red" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 1 1 0 1"/></filter>' +
      '<filter id="qse-chroma-white" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"/></filter>' +
      '<filter id="qse-chroma-purple" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 1 -1 0 .72"/></filter>' +
      '</svg>';

    document.body.appendChild(box);
  }

  function avatarKeyFromVideo(video) {
    const raw = video.currentSrc || video.src || '';
    if (!raw) return '';

    try {
      const url = new URL(raw, window.location.href);
      const key = decodeURIComponent(url.searchParams.get('key') || url.pathname);
      const file = (key.split('/').pop() || '').replace(/\.[^.]+$/, '');

      return file
        .replace(/-(a|home|intro|lobby|idle|loop|sala|1|2|3|11|12|13|21|22|23|31|32|33)$/i, '')
        .trim();
    } catch {
      return '';
    }
  }

  async function getRule(avatarKey) {
    if (!avatarKey) return null;

    const comparable = avatarKey.toLowerCase();

    if (cache.has(comparable)) {
      return cache.get(comparable);
    }

    try {
      const response = await fetch(
        '/api/avatar-chroma-key?avatarKey=' + encodeURIComponent(avatarKey),
        { cache: 'force-cache' }
      );

      const result = await response.json().catch(() => null);
      const rule = result && result.available && result.hexColor ? result : null;

      cache.set(comparable, rule);
      return rule;
    } catch {
      cache.set(comparable, null);
      return null;
    }
  }

  async function apply(video) {
    if (!video || video.dataset.qseChromaApplied === '1') return;

    const src = video.currentSrc || video.src || '';

    if (
      !src ||
      (
        !src.includes('/api/r2-animation/') &&
        !src.includes('/Animacao/') &&
        !src.includes('/avatar/')
      )
    ) {
      return;
    }

    const avatarKey = avatarKeyFromVideo(video);
    if (!avatarKey) return;

    video.dataset.qseChromaApplied = '1';

    const rule = await getRule(avatarKey);
    const filter = rule ? filters[String(rule.hexColor || '').toLowerCase()] : '';

    if (!filter) return;

    installFilters();

    video.style.filter = 'url(#' + filter + ')';
    video.style.backgroundColor = 'transparent';
    video.dataset.qseChromaKey = rule.label || rule.chromaKeyId || '';
    video.dataset.qseChromaColor = rule.hexColor || '';
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

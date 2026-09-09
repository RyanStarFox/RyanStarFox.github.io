(() => {
  const SIZE = 48;

  function toHex(r, g, b) {
    return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0')).join('')}`;
  }

  function extractAccentColor(img) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    try {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    } catch (e) {
      return null;
    }

    let data;
    try {
      data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    } catch (e) {
      return null;
    }

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 140) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;

      // Skip near-black / near-white / gray background pixels.
      if (max < 36 || min > 236 || sat < 28) continue;

      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, sat: 0 };
      cur.n += 1;
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.sat += sat;
      buckets.set(key, cur);
    }

    if (!buckets.size) return null;

    let best = null;
    buckets.forEach((bucket) => {
      const score = bucket.n * (1 + bucket.sat / bucket.n / 255);
      if (!best || score > best.score) {
        best = {
          score,
          r: Math.round(bucket.r / bucket.n),
          g: Math.round(bucket.g / bucket.n),
          b: Math.round(bucket.b / bucket.n),
        };
      }
    });

    return best ? toHex(best.r, best.g, best.b) : null;
  }

  function applyCardAccent(card) {
    const img = card.querySelector('.trm-website-card__icon:not(.is-empty) img');
    if (!img) return;

    const run = () => {
      const color = extractAccentColor(img);
      if (color) card.style.setProperty('--hub-accent', color);
    };

    if (img.complete && img.naturalWidth > 0) run();
    else img.addEventListener('load', run, { once: true });
  }

  function initWebsiteCardAccents() {
    document.querySelectorAll('.trm-website-card').forEach(applyCardAccent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebsiteCardAccents);
  } else {
    initWebsiteCardAccents();
  }

  document.addEventListener('swup:contentReplaced', initWebsiteCardAccents);
})();

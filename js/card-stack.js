(() => {
  const SELECTOR = '[data-card-stack]';
  const DURATION = 720;
  const PEAK = 0.4;

  const waitAnim = (anim) =>
    anim.finished.catch(() => {}).then(() => undefined);

  function initStack(root) {
    if (root.dataset.stackReady === '1') return;
    const stage = root.querySelector('.trm-card-stack__stage');
    if (!stage) return;
    const items = Array.from(stage.querySelectorAll('[data-stack-item]'));
    if (!items.length) return;

    root.dataset.stackReady = '1';
    let order = items.slice();
    let busy = false;

    const front = () => order[0];

    const paint = () => {
      const n = order.length;
      order.forEach((el, i) => {
        el.dataset.stackI = String(i);
        if (!el.classList.contains('is-flying')) {
          el.style.zIndex = String(n - i);
        }
        el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        el.tabIndex = i === 0 ? 0 : -1;
        el.classList.toggle('is-front', i === 0);
      });
    };

    const pose = (el) => {
      const cs = getComputedStyle(el);
      return {
        x: parseFloat(cs.getPropertyValue('--stack-x')) || 0,
        y: parseFloat(cs.getPropertyValue('--stack-y')) || 0,
        rot: parseFloat(cs.getPropertyValue('--stack-rot')) || 0,
      };
    };

    const tf = (p, x, extraRot) =>
      `translate(${p.x + x}px, ${p.y}px) rotate(${p.rot + extraRot}deg)`;

    const dealFrom = async (dir) => {
      if (busy || order.length < 2) return;
      const el = front();
      const width = el.offsetWidth || stage.offsetWidth || 320;
      const off = dir * width * 1.22;
      const extra = dir > 0 ? 6 : -6;
      const p = pose(el);

      busy = true;
      el.classList.add('is-flying');
      el.style.transition = 'none';
      el.style.zIndex = String(order.length + 8);

      const anim = el.animate(
        [
          { transform: tf(p, 0, 0), offset: 0, easing: 'cubic-bezier(0.28, 0, 0.85, 1)' },
          { transform: tf(p, off, extra), offset: PEAK, easing: 'cubic-bezier(0.15, 0.55, 0.2, 1)' },
          { transform: tf(p, 0, 0), offset: 1 },
        ],
        { duration: DURATION, fill: 'forwards' }
      );

      window.setTimeout(() => {
        order.shift();
        order.push(el);
        paint();
        el.style.zIndex = '1';
      }, DURATION * PEAK);

      await waitAnim(anim);
      anim.cancel();
      el.style.transition = '';
      el.style.transform = '';
      el.classList.remove('is-flying');
      paint();
      busy = false;
    };

    const prevBtn = root.querySelector('[data-stack-prev]');
    const nextBtn = root.querySelector('[data-stack-next]');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dealFrom(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dealFrom(1);
      });
    }

    paint();
  }

  function initAll() {
    document.querySelectorAll(SELECTOR).forEach(initStack);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('swup:contentReplaced', () => {
    document.querySelectorAll(SELECTOR).forEach((el) => {
      delete el.dataset.stackReady;
    });
    initAll();
  });
})();

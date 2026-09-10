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

    // Both actions travel via the right side:
    // - down: peel top (above pile) → tuck under on the way back
    // - up: slide out from under → land on top on the way back
    const cycle = async (mode) => {
      if (busy || order.length < 2) return;

      const width = order[0].offsetWidth || stage.offsetWidth || 320;
      const off = width * 1.22;
      const extra = 6;
      const n = order.length;
      const el = mode === 'down' ? order[0] : order[n - 1];
      const p = pose(el);

      busy = true;
      el.classList.add('is-flying');
      el.style.transition = 'none';

      if (mode === 'down') {
        // Start above the pile (peeling the front card).
        el.style.zIndex = String(n + 8);
      } else {
        // Stay under the pile while sliding out to the right.
        el.style.zIndex = '1';
      }

      const anim = el.animate(
        [
          { transform: tf(p, 0, 0), offset: 0, easing: 'cubic-bezier(0.28, 0, 0.85, 1)' },
          { transform: tf(p, off, extra), offset: PEAK, easing: 'cubic-bezier(0.15, 0.55, 0.2, 1)' },
          { transform: tf(p, 0, 0), offset: 1 },
        ],
        { duration: DURATION, fill: 'forwards' }
      );

      window.setTimeout(() => {
        if (mode === 'down') {
          // Off-screen: become the new bottom, stay under on return.
          order.shift();
          order.push(el);
          paint();
          el.style.zIndex = '1';
        } else {
          // Off-screen: become the new top, cover the pile on return.
          order.pop();
          order.unshift(el);
          paint();
          el.style.zIndex = String(order.length + 8);
        }
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
        cycle('up');
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cycle('down');
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

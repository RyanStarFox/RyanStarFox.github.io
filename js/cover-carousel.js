(() => {
  const SELECTOR = '[data-cover-carousel]';
  const DEFAULT_INTERVAL = 3000;

  function parseInterval(el) {
    const n = parseInt(el.getAttribute('data-interval') || String(DEFAULT_INTERVAL), 10);
    return Number.isFinite(n) && n >= 1200 ? n : DEFAULT_INTERVAL;
  }

  function initCarousel(root, staggerMs) {
    if (root.dataset.carouselReady === '1') return;
    const track = root.querySelector('.trm-cover-carousel__track');
    const slides = root.querySelectorAll('.trm-cover-carousel__slide');
    const dots = root.querySelectorAll('.trm-cover-carousel__dot');
    if (!track || slides.length < 2) return;

    root.dataset.carouselReady = '1';
    let index = 0;
    let timer = null;
    let startDelay = null;
    const interval = parseInterval(root);

    const slideWidth = () => Math.max(root.clientWidth, 1);

    const syncWidth = () => {
      root.style.setProperty('--cover-carousel-w', `${slideWidth()}px`);
    };

    const go = (next) => {
      index = ((next % slides.length) + slides.length) % slides.length;
      syncWidth();
      track.style.transform = `translate3d(-${index * slideWidth()}px, 0, 0)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
      });
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (startDelay) {
        clearTimeout(startDelay);
        startDelay = null;
      }
    };

    const start = (delay = 0) => {
      stop();
      const run = () => {
        timer = setInterval(() => go(index + 1), interval);
      };
      if (delay > 0) startDelay = setTimeout(run, delay);
      else run();
    };

    dots.forEach((dot, i) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        go(i);
        start(0);
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', () => start(0));
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', () => start(0));

    window.addEventListener('resize', () => go(index));

    go(0);
    start(staggerMs);
  }

  function initAll() {
    document.querySelectorAll(SELECTOR).forEach((el, i) => {
      // ~same cadence, slight offset within 0–1s
      const stagger = (i * 290 + (i * 97) % 220) % 1000;
      initCarousel(el, stagger);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('swup:contentReplaced', initAll);
})();

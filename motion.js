/* A shared motion layer. Native scrolling and existing content stay intact. */
(() => {
  'use strict';

  const root = document.documentElement;
  const all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const title = document.getElementById('hero-title');
  const hero = document.getElementById('home');
  const header = document.querySelector('.site-header');
  const targets = new Map();
  let frame = 0;
  let heroShift = 0;
  let pointing = null;
  let clientX = 0;
  let clientY = 0;

  function allowed() {
    return root.dataset.motion === 'on' && !reducedMotion.matches && !document.hidden;
  }

  function smooth(value) {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function applyReveal(record, progress, shift) {
    const opacity = progress.toFixed(4);
    const position = `${shift.toFixed(2)}px`;
    if (record.opacity === opacity && record.position === position) return;
    record.opacity = opacity;
    record.position = position;
    record.y = shift;
    record.element.style.setProperty('--reveal-opacity', opacity);
    record.element.style.setProperty('--reveal-y', position);
    const visible = progress > 0.001;
    if (record.element.classList.contains('is-visible') !== visible) {
      record.element.classList.toggle('is-visible', visible);
    }
    record.children.forEach((element, index) => {
      const offset = Math.min(index * 0.035, 0.16);
      const childProgress = clamp((progress - offset) / (1 - offset), 0, 1);
      element.style.setProperty('--child-opacity', childProgress.toFixed(4));
      element.style.setProperty('--child-y', `${((1 - childProgress) * (shift < 0 ? -14 : 20)).toFixed(2)}px`);
    });
  }

  function reveal(element) {
    const record = targets.get(element);
    if (record) applyReveal(record, 1, 0);
  }

  function register(element, delay = 0) {
    if (targets.has(element)) return;
    targets.set(element, { element, delay, y: 0, children: [] });
    element.classList.add('motion-reveal');
    if (!allowed()) reveal(element);
  }

  // Separate headings, copy and images so they arrive in a readable sequence.
  all('.reveal').forEach(element => {
    if (element.matches('.about-copy, .section-heading, .experience-intro, .contact-content')) {
      Array.from(element.children).forEach((child, index) => register(child, Math.min(index * 55, 180)));
    } else register(element);
  });
  all('.hero-selected > *').forEach((element, index) => register(element, index * 70));
  all('.paper-content, .project-copy').forEach(group => {
    const record = targets.get(group.closest('.motion-reveal'));
    Array.from(group.children).forEach(element => {
      element.classList.add('motion-child');
      record?.children.push(element);
    });
  });
  all('.orbit-node').forEach((element, index) => {
    element.style.setProperty('--intro-delay', `${260 + index * 65}ms`);
  });
  document.addEventListener('focusin', event => {
    let element = event.target.closest('.motion-reveal');
    while (element) {
      reveal(element);
      element = element.parentElement?.closest('.motion-reveal');
    }
    schedule();
  });
  document.addEventListener('focusout', schedule);

  const images = all('.portrait-photo');
  images.forEach(image => {
    image.classList.add('motion-parallax');
    image.addEventListener('load', schedule, { once: true });
  });

  function resetSurface() {
    if (!pointing) return;
    pointing.classList.remove('is-pointing');
    ['--pointer-x', '--pointer-y', '--tilt-x', '--tilt-y'].forEach(name => pointing.style.removeProperty(name));
    pointing = null;
  }

  all('.portrait-frame, .project-media, .paper-teaser-link').forEach(surface => {
    surface.classList.add('motion-surface');
    surface.addEventListener('pointermove', event => {
      if (!allowed() || !finePointer.matches || event.pointerType === 'touch') return;
      if (pointing !== surface) resetSurface();
      pointing = surface;
      clientX = event.clientX;
      clientY = event.clientY;
      schedule();
    }, { passive: true });
    surface.addEventListener('pointerleave', resetSurface);
    surface.addEventListener('pointercancel', resetSurface);
  });

  function render() {
    frame = 0;
    if (!allowed()) return;

    // Read geometry before writes. This frame runs only after input or resize.
    const viewportHeight = innerHeight;
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const titleBounds = title?.getBoundingClientRect();
    const boxes = Array.from(targets.values(), record => {
      const focused = record.element.contains(document.activeElement);
      const bounds = record.element.getBoundingClientRect();
      // Compensate our previous translation so the movement cannot feed itself.
      const shift = focused ? 0 : record.y;
      return { record, focused, top: bounds.top - shift, bottom: bounds.bottom - shift, height: bounds.height };
    });
    const imageBounds = images.map(image => image.parentElement.getBoundingClientRect());
    const pointerBounds = pointing?.getBoundingClientRect();
    if (title && titleBounds) {
      const layoutTop = titleBounds.top + window.scrollY - heroShift;
      // Fade before the name passes behind the header, including on small screens.
      const fadeDistance = clamp((layoutTop + titleBounds.height * 0.7 - headerBottom) / 0.66, 180, viewportHeight * 0.75);
      const progress = smooth((window.scrollY - 12) / (fadeDistance - 12));
      heroShift = Math.min(window.scrollY, fadeDistance) * 0.34;
      title.style.setProperty('--hero-shift', `${heroShift.toFixed(2)}px`);
      title.style.setProperty('--hero-opacity', (1 - progress).toFixed(4));
      hero?.style.setProperty('--hero-surround-opacity', (1 - smooth((window.scrollY - fadeDistance * 0.2) / fadeDistance)).toFixed(4));
    }
    const distance = innerWidth <= 800 ? 30 : 48;
    boxes.forEach(({ record, focused, top, bottom, height }) => {
      if (!height || record.element.closest('[hidden]')) return;
      if (focused) {
        applyReveal(record, 1, 0);
        return;
      }
      const entryRange = Math.min(viewportHeight * 0.28, clamp(height * 0.32, 120, 200));
      const exitRange = Math.min(entryRange * 0.75, Math.max(56, height * 0.4));
      const fromBelow = clamp((viewportHeight * 0.98 - top - record.delay * 0.12) / entryRange, 0, 1);
      const fromAbove = clamp((bottom - headerBottom) / exitRange, 0, 1);
      const progress = smooth(Math.min(fromBelow, fromAbove));
      const direction = fromAbove < fromBelow ? -0.65 : 1;
      applyReveal(record, progress, (1 - progress) * distance * direction);
    });
    images.forEach((image, index) => {
      const bounds = imageBounds[index];
      const progress = clamp((viewportHeight / 2 - (bounds.top + bounds.height / 2)) / (viewportHeight + bounds.height), -0.5, 0.5);
      const limit = Math.min(8, bounds.height * 0.012);
      image.style.setProperty('--scroll-y', `${(progress * limit * 2).toFixed(2)}px`);
    });
    if (pointing && pointerBounds) {
      if (clientX < pointerBounds.left || clientX > pointerBounds.right || clientY < pointerBounds.top || clientY > pointerBounds.bottom) {
        resetSurface();
        return;
      }
      const x = clamp((clientX - pointerBounds.left) / pointerBounds.width * 2 - 1, -1, 1);
      const y = clamp((clientY - pointerBounds.top) / pointerBounds.height * 2 - 1, -1, 1);
      pointing.classList.add('is-pointing');
      pointing.style.setProperty('--pointer-x', `${(x * 3).toFixed(2)}px`);
      pointing.style.setProperty('--pointer-y', `${(y * 3).toFixed(2)}px`);
      pointing.style.setProperty('--tilt-x', `${(-y * 1.8).toFixed(2)}deg`);
      pointing.style.setProperty('--tilt-y', `${(x * 1.8).toFixed(2)}deg`);
    }
  }

  function schedule() {
    if (!frame && allowed()) frame = requestAnimationFrame(render);
  }

  function syncPolicy() {
    if (allowed()) {
      schedule();
      return;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    resetSurface();
    if (root.dataset.motion === 'off' || reducedMotion.matches) {
      heroShift = 0;
      title?.style.removeProperty('--hero-shift');
      title?.style.removeProperty('--hero-opacity');
      hero?.style.removeProperty('--hero-surround-opacity');
      images.forEach(image => image.style.removeProperty('--scroll-y'));
      root.dataset.intro = 'done';
      targets.forEach(record => applyReveal(record, 1, 0));
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('site:language', schedule);
  window.addEventListener('site:motion', syncPolicy);
  finePointer.addEventListener('change', () => { if (!finePointer.matches) resetSurface(); });
  if ('ResizeObserver' in window) {
    const layoutObserver = new ResizeObserver(schedule);
    layoutObserver.observe(document.querySelector('main') || document.body);
  }
  // Finishing on the last animation also respects time spent in a background tab.
  const introEnd = all('.orbit-node').at(-1) || document.querySelector('.hero-bottom');
  introEnd?.addEventListener('animationend', event => {
    if (event.target === introEnd && ['paper-arrival', 'quiet-arrival'].includes(event.animationName)) {
      root.dataset.intro = 'done';
    }
  });
  if (allowed()) render();
  root.classList.add('motion-ready');
  syncPolicy();
  schedule();
})();

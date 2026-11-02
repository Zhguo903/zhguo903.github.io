/* Personal portfolio interactions. No dependencies or remote requests. */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const t = (enText, zhText) => window.siteI18n?.t(enText, zhText) ?? enText;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const email = 'zihansaria.guo@mail.utoronto.ca';
  const themes = {
    human: {
      name: 'Human–AI interaction',
      nameZh: '人机交互',
      description: 'Exploring how AI companions can use memory with care, and building story-first experiences that make room for human context.',
      descriptionZh: '探索 AI 陪伴产品如何恰当地使用记忆，也设计以故事为核心、更贴近用户实际情况的体验。',
      index: '01'
    },
    safety: {
      name: 'AI safety',
      nameZh: 'AI 安全',
      description: 'Studying how small language models can detect malicious agent skills, with attention to generalization and the cost of false alarms.',
      descriptionZh: '研究小型语言模型如何检测恶意智能体技能，关注模型的泛化能力和误报的代价。',
      index: '02'
    },
    data: {
      name: 'Data & visualization',
      nameZh: '数据与可视化',
      description: 'Using data analysis and visualization to trace how AI is discussed in the news.',
      descriptionZh: '通过数据分析与可视化，梳理新闻媒体如何讨论 AI。',
      index: '03'
    },
    genomics: {
      name: 'Computational genomics',
      nameZh: '计算基因组学',
      description: 'Developed reproducible R workflows to investigate bacterial insertion sequences in the Guttman Laboratory at the University of Toronto.',
      descriptionZh: '曾在多伦多大学 Guttman 实验室搭建可复现的 R 工作流，研究细菌插入序列。',
      index: '04'
    },
    memory: {
      name: 'Memory, with context',
      nameZh: '记忆，也需要语境',
      description: 'Thinking about what AI should remember—and when a remembered detail belongs in a conversation.',
      descriptionZh: 'AI 应该记住什么？又该在什么时候提起？我关注记忆背后的语境、时机与用户感受。',
      index: '05'
    },
    visualization: {
      name: 'Seeing through data',
      nameZh: '用可视化理解数据',
      description: 'Designing ways to explore data, compare patterns, and turn an analysis into a clear story.',
      descriptionZh: '通过可视化探索数据、比较规律，让分析结果成为清晰、易懂的故事。',
      index: '06'
    },
    piano: {
      name: 'Piano',
      nameZh: '钢琴',
      description: 'Away from the screen, I make time for the piano.',
      descriptionZh: '写代码之外，也喜欢弹弹钢琴。',
      index: '07'
    },
    photography: {
      name: 'Photography',
      nameZh: '摄影',
      description: 'A different way to look closely: noticing a moment, then keeping it in a photograph.',
      descriptionZh: '换一种方式观察世界，把留意到的瞬间拍下来。',
      index: '08'
    },
    reading: {
      name: 'Reading',
      nameZh: '阅读',
      description: 'Reading for new perspectives, in research and beyond.',
      descriptionZh: '读书，让自己多了解一种观点，也多保留一点好奇。',
      index: '09'
    }
  };

  let toastTimer;
  let activeToast = null;
  function toast(enText, zhText) {
    const element = $('#toast');
    if (!element) return;
    window.clearTimeout(toastTimer);
    activeToast = { enText, zhText };
    element.textContent = t(enText, zhText);
    element.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      element.classList.remove('is-visible');
      activeToast = null;
    }, 3200);
  }

  // A small spring system makes each research area tangible. Dragged positions
  // stay where the visitor leaves them; Reset returns to the original layout.
  const stage = $('#constellation');
  const lineLayer = $('#constellation-lines');
  const motionToggle = $('#motion-toggle');
  const themePreview = $('#theme-preview');
  const nodeElements = stage ? $$('.orbit-node', stage) : [];
  let motionEnabled = !reducedMotion.matches;
  let stageVisible = true;
  let frame = 0;
  let previousTime = 0;
  let elapsedTime = 0;
  let pointer = { x: 0, y: 0, active: false };
  let drag = null;
  let previewNode = null;
  let previewHideTimer = 0;

  const nodes = nodeElements.map((element, index) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'constellation-line');
    line.setAttribute('data-theme', element.dataset.theme || '');
    if (lineLayer) lineLayer.appendChild(line);
    return {
      element, line, index,
      x: 0, y: 0, vx: 0, vy: 0,
      anchorX: 0, anchorY: 0,
      suppressClickUntil: 0,
      lastPointerType: ''
    };
  });

  const initialTheme = nodeElements.find(node => node.getAttribute('aria-pressed') === 'true')?.dataset.theme || 'human';
  let selectedTheme = initialTheme;

  function selectTheme(key) {
    const theme = themes[key];
    if (!theme) return;
    const name = $('#theme-name');
    const description = $('#theme-description');
    const index = $('#theme-index');
    selectedTheme = key;
    if (name) name.textContent = t(theme.name, theme.nameZh);
    if (description) description.textContent = t(theme.description, theme.descriptionZh);
    if (index) index.textContent = `${theme.index} / ${String(nodes.length).padStart(2, '0')}`;
    nodes.forEach(node => {
      const selected = node.element.dataset.theme === key;
      node.element.classList.toggle('is-selected', selected);
      node.element.setAttribute('aria-pressed', String(selected));
      node.line.classList.toggle('is-selected', selected);
    });
    if (stage) stage.dataset.selectedTheme = key;
  }

  function cancelPreviewHide() {
    window.clearTimeout(previewHideTimer);
    previewHideTimer = 0;
  }

  function hidePreview() {
    cancelPreviewHide();
    if (themePreview) themePreview.hidden = true;
    if (previewNode) previewNode.element.removeAttribute('aria-describedby');
    previewNode = null;
  }

  function positionPreview() {
    if (!stage || !themePreview || themePreview.hidden || !previewNode) return;
    const bounds = stage.getBoundingClientRect();
    const nodeBounds = previewNode.element.getBoundingClientRect();
    const previewBounds = themePreview.getBoundingClientRect();
    const margin = 12;
    const gap = 12;
    const maxLeft = Math.max(margin, bounds.width - previewBounds.width - margin);
    const left = Math.max(margin, Math.min(maxLeft,
      nodeBounds.left - bounds.left + (nodeBounds.width - previewBounds.width) / 2));
    // The orbit itself can be shorter than a card. Use the viewport's space
    // so a fully visible card never has to cover its own anchor button.
    const viewportMargin = 16;
    const viewportHeight = window.innerHeight;
    const below = nodeBounds.bottom + gap;
    const above = nodeBounds.top - previewBounds.height - gap;
    const fitsBelow = below + previewBounds.height <= viewportHeight - viewportMargin;
    const fitsAbove = above >= viewportMargin;
    const useBelow = fitsBelow || (!fitsAbove &&
      viewportHeight - nodeBounds.bottom >= nodeBounds.top);
    const preferredTop = useBelow ? below : above;
    const viewportTop = Math.max(viewportMargin, Math.min(
      Math.max(viewportMargin, viewportHeight - previewBounds.height - viewportMargin), preferredTop));
    const top = viewportTop - bounds.top;
    themePreview.style.left = `${left.toFixed(2)}px`;
    themePreview.style.top = `${top.toFixed(2)}px`;
    themePreview.dataset.placement = useBelow ? 'below' : 'above';
  }

  function showPreview(node) {
    if (!themePreview || drag?.moved) return;
    cancelPreviewHide();
    if (previewNode && previewNode !== node) previewNode.element.removeAttribute('aria-describedby');
    previewNode = node;
    selectTheme(node.element.dataset.theme);
    node.element.setAttribute('aria-describedby', 'theme-preview');
    themePreview.hidden = false;
    positionPreview();
  }

  function schedulePreviewHide() {
    cancelPreviewHide();
    previewHideTimer = window.setTimeout(hidePreview, 120);
  }

  function draw() {
    if (!stage || !lineLayer) return;
    nodes.forEach(node => {
      node.element.style.transform = `translate3d(${node.x.toFixed(2)}px, ${node.y.toFixed(2)}px, 0)`;
    });
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    lineLayer.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const connections = {
      human: { target: 'memory', side: 'top' },
      safety: { target: 'data', side: 'right' },
      piano: { target: 'photography', side: 'bottom' }
    };
    nodes.forEach(node => {
      const connection = connections[node.element.dataset.theme];
      const target = connection && nodes.find(item => item.element.dataset.theme === connection.target);
      if (!target) {
        node.line.setAttribute('display', 'none');
        return;
      }
      node.line.removeAttribute('display');
      const from = node.element.getBoundingClientRect();
      const to = target.element.getBoundingClientRect();
      let sx, sy, ex, ey, c1x, c1y, c2x, c2y;
      if (connection.side === 'right') {
        sx = from.right - bounds.left + 6;
        sy = from.top + from.height / 2 - bounds.top;
        ex = to.right - bounds.left + 6;
        ey = to.top + to.height / 2 - bounds.top;
        c1x = c2x = Math.min(bounds.width - 3, Math.max(sx, ex) + 42);
        c1y = sy + (ey - sy) * 0.2;
        c2y = sy + (ey - sy) * 0.8;
      } else {
        sx = from.right - bounds.left + 6;
        ex = to.left - bounds.left - 6;
        sy = (connection.side === 'top' ? from.top : from.bottom) - bounds.top;
        ey = (connection.side === 'top' ? to.top : to.bottom) - bounds.top;
        c1x = sx + (ex - sx) * 0.35;
        c2x = sx + (ex - sx) * 0.65;
        c1y = c2y = connection.side === 'top'
          ? Math.max(6, Math.min(sy, ey) - 35)
          : Math.min(bounds.height - 5, Math.max(sy, ey) + 30);
      }
      node.line.setAttribute('d', `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`);
    });
    positionPreview();
  }

  function ambientAllowed() {
    return motionEnabled && !reducedMotion.matches && !document.hidden && stageVisible;
  }

  // The title uses a compositor animation, but shares the tags' motion policy.
  function syncNameMotion() {
    if (stage) stage.dataset.nameMotion = ambientAllowed() ? 'running' : 'paused';
  }

  function syncMotionPolicy() {
    const enabled = motionEnabled && !reducedMotion.matches;
    document.documentElement.dataset.motion = enabled ? (document.hidden ? 'paused' : 'on') : 'off';
    window.dispatchEvent(new CustomEvent('site:motion', { detail: { enabled } }));
  }

  function tick(now) {
    frame = 0;
    const delta = previousTime ? Math.min((now - previousTime) / 16.667, 2) : 1;
    previousTime = now;
    const ambient = ambientAllowed();
    if (ambient) elapsedTime += delta / 60;
    let unsettled = false;

    nodes.forEach(node => {
      const activeDrag = drag?.node === node;
      const phase = node.index * 1.73;
      const driftX = ambient && !activeDrag ? Math.sin(elapsedTime * 0.48 + phase) * 5 : 0;
      const driftY = ambient && !activeDrag ? Math.cos(elapsedTime * 0.42 + phase) * 6 : 0;
      const pullX = ambient && pointer.active && !activeDrag ? pointer.x * (6 + Math.min(node.index, 4)) : 0;
      const pullY = ambient && pointer.active && !activeDrag ? pointer.y * (6 + Math.min(node.index, 4)) : 0;
      const targetX = node.anchorX + driftX + pullX;
      const targetY = node.anchorY + driftY + pullY;

      if (!ambient) {
        // Offscreen suspension keeps the last pose. Explicitly paused motion
        // and direct dragging still update immediately on a requested frame.
        if (activeDrag || !motionEnabled || reducedMotion.matches) {
          node.x = targetX;
          node.y = targetY;
        }
        node.vx = node.vy = 0;
      } else {
        const spring = activeDrag ? 0.22 : 0.035;
        const damping = Math.pow(activeDrag ? 0.57 : 0.80, delta);
        node.vx = (node.vx + (targetX - node.x) * spring * delta) * damping;
        node.vy = (node.vy + (targetY - node.y) * spring * delta) * damping;
        node.x += node.vx * delta;
        node.y += node.vy * delta;
        unsettled ||= Math.abs(targetX - node.x) + Math.abs(targetY - node.y) > 0.06;
      }
    });
    draw();
    if (ambient || unsettled) frame = window.requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function requestFrame() {
    if (!frame && stage) frame = window.requestAnimationFrame(tick);
  }

  function updateMotionControl() {
    syncNameMotion();
    syncMotionPolicy();
    if (!motionToggle) return;
    const active = motionEnabled && !reducedMotion.matches;
    motionToggle.textContent = active ? t('Motion on', '动画已开启') : t('Motion off', '动画已关闭');
    motionToggle.setAttribute('aria-pressed', String(active));
    motionToggle.setAttribute('aria-label', reducedMotion.matches
      ? t('Motion off: reduced motion preference is enabled', '动画已关闭：已启用“减少动态效果”设置')
      : active ? t('Turn off motion', '关闭动画') : t('Turn on motion', '开启动画'));
  }

  if (stage) {
    stage.addEventListener('pointermove', event => {
      const bounds = stage.getBoundingClientRect();
      pointer = {
        x: (event.clientX - bounds.left) / bounds.width * 2 - 1,
        y: (event.clientY - bounds.top) / bounds.height * 2 - 1,
        active: event.pointerType !== 'touch'
      };
      requestFrame();
    });
    stage.addEventListener('pointerleave', () => {
      pointer.active = false;
      requestFrame();
    });

    nodes.forEach(node => {
      node.element.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch' || drag) return;
        showPreview(node);
      });
      node.element.addEventListener('pointerleave', event => {
        if (event.pointerType !== 'touch') schedulePreviewHide();
      });
      node.element.addEventListener('focus', () => {
        // Pointer focus arrives between pointerdown and pointerup. Touch taps
        // open the preview on click, while keyboard focus opens it immediately.
        if (!drag) showPreview(node);
      });
      node.element.addEventListener('focusout', event => {
        const next = event.relatedTarget;
        if (next && (themePreview?.contains(next) || nodeElements.some(element => element.contains(next)))) return;
        hidePreview();
      });
      node.element.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        node.lastPointerType = event.pointerType;
        drag = {
          node, pointerId: event.pointerId,
          startX: event.clientX, startY: event.clientY,
          originX: node.x, originY: node.y,
          moved: false
        };
        node.anchorX = node.x;
        node.anchorY = node.y;
        node.vx = node.vy = 0;
        node.element.setPointerCapture(event.pointerId);
        node.element.classList.add('is-dragging');
        requestFrame();
      });

      const updateDrag = event => {
        if (!drag || drag.node !== node || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.hypot(dx, dy) > 5 && !drag.moved) {
          drag.moved = true;
          hidePreview();
        }
        if (!drag.moved) return;
        const bounds = stage.getBoundingClientRect();
        const nodeBounds = node.element.getBoundingClientRect();
        const baseLeft = nodeBounds.left - bounds.left - node.x;
        const baseTop = nodeBounds.top - bounds.top - node.y;
        node.anchorX = Math.max(10 - baseLeft, Math.min(bounds.width - baseLeft - nodeBounds.width - 10, drag.originX + dx));
        node.anchorY = Math.max(10 - baseTop, Math.min(bounds.height - baseTop - nodeBounds.height - 10, drag.originY + dy));
        requestFrame();
      };
      node.element.addEventListener('pointermove', updateDrag);

      const finishDrag = event => {
        if (!drag || drag.node !== node || drag.pointerId !== event.pointerId) return;
        // Some input sources coalesce the final movement into pointerup.
        // Apply that last position before releasing capture.
        if (event.type === 'pointerup') updateDrag(event);
        if (drag.moved) node.suppressClickUntil = performance.now() + 500;
        drag = null;
        node.element.classList.remove('is-dragging');
        if (node.element.hasPointerCapture(event.pointerId)) node.element.releasePointerCapture(event.pointerId);
        requestFrame();
      };
      node.element.addEventListener('pointerup', finishDrag);
      node.element.addEventListener('pointercancel', finishDrag);
      node.element.addEventListener('lostpointercapture', finishDrag);
      node.element.addEventListener('click', event => {
        // Keyboard button activation has detail=0 and always remains available.
        if (event.detail !== 0 && performance.now() < node.suppressClickUntil) {
          event.preventDefault();
          return;
        }
        if (event.detail !== 0 && (event.pointerType === 'touch' || node.lastPointerType === 'touch')) {
          if (previewNode === node && !themePreview?.hidden) hidePreview();
          else showPreview(node);
        } else {
          selectTheme(node.element.dataset.theme);
          if (event.detail === 0) showPreview(node);
        }
      });
    });

    themePreview?.addEventListener('pointerenter', cancelPreviewHide);
    themePreview?.addEventListener('pointerleave', schedulePreviewHide);
    themePreview?.addEventListener('focusout', event => {
      const next = event.relatedTarget;
      if (next && (themePreview.contains(next) || nodeElements.some(element => element.contains(next)))) return;
      hidePreview();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') hidePreview();
    });
    document.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !previewNode) return;
      if (!themePreview?.contains(event.target) && !nodeElements.some(element => element.contains(event.target))) hidePreview();
    });

    $('#reset-orbit')?.addEventListener('click', () => {
      hidePreview();
      if (drag && drag.node.element.hasPointerCapture(drag.pointerId)) {
        drag.node.element.releasePointerCapture(drag.pointerId);
      }
      drag = null;
      nodes.forEach(node => {
        node.anchorX = node.anchorY = node.x = node.y = node.vx = node.vy = 0;
        node.element.classList.remove('is-dragging');
      });
      pointer.active = false;
      elapsedTime = 0;
      selectTheme(initialTheme);
      draw();
      requestFrame();
      toast('Tags reset. Hover to discover or drag to explore.', '标签已重置。悬停查看介绍，也可以拖动探索。');
    });

    motionToggle?.addEventListener('click', () => {
      if (reducedMotion.matches) {
        toast('Motion is off to respect your reduced motion preference.', '已根据你的“减少动态效果”设置关闭动画。');
        return;
      }
      motionEnabled = !motionEnabled;
      updateMotionControl();
      requestFrame();
    });

    const onMotionPreferenceChange = () => {
      motionEnabled = !reducedMotion.matches;
      updateMotionControl();
      requestFrame();
    };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionPreferenceChange);
    else reducedMotion.addListener(onMotionPreferenceChange);

    document.addEventListener('visibilitychange', () => {
      syncNameMotion();
      syncMotionPolicy();
      if (document.hidden && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
      } else requestFrame();
    });
    if ('IntersectionObserver' in window) {
      const stageObserver = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === stage);
        if (!entry || stageVisible === entry.isIntersecting) return;
        stageVisible = entry.isIntersecting;
        syncNameMotion();
        if (!stageVisible) pointer.active = false;
        previousTime = 0;
        requestFrame();
      }, { threshold: 0 });
      stageObserver.observe(stage);
    }
    if ('ResizeObserver' in window) new ResizeObserver(() => requestFrame()).observe(stage);
    else window.addEventListener('resize', requestFrame, { passive: true });
    selectTheme(initialTheme);
    updateMotionControl();
    requestFrame();
  }

  // Section navigation stays native; motion.js coordinates the enter effects.
  const navLinks = $$('#main-nav a[href^="#"]');
  function markActive(id) {
    navLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (entering.length) markActive(entering[0].target.id);
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    const targets = new Set();
    navLinks.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (section && !targets.has(section)) {
        targets.add(section);
        sectionObserver.observe(section);
      }
    });
  }

  const menuToggle = $('#menu-toggle');
  const mainNav = $('#main-nav');
  function updateMenuControl() {
    const opened = mainNav?.classList.contains('is-open') || false;
    menuToggle?.setAttribute('aria-expanded', String(opened));
    menuToggle?.setAttribute('aria-label', opened ? t('Close navigation', '收起导航菜单') : t('Open navigation', '展开导航菜单'));
  }
  function closeMenu() {
    mainNav?.classList.remove('is-open');
    updateMenuControl();
  }
  menuToggle?.addEventListener('click', () => {
    mainNav?.classList.toggle('is-open');
    updateMenuControl();
  });
  updateMenuControl();
  navLinks.forEach(link => link.addEventListener('click', () => {
    markActive(link.getAttribute('href').slice(1));
    closeMenu();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mainNav?.classList.contains('is-open')) {
      closeMenu();
      menuToggle?.focus();
    }
  });

  const filterButtons = $$('[data-filter]');
  const projectCards = $$('.project-card[data-category]');
  function filterProjects(filter) {
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    projectCards.forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
  }
  filterButtons.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
  if (filterButtons.length) filterProjects(filterButtons.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all');

  const projectDetails = {
    echoloom: {
      kicker: 'Course project · July–September 2026',
      kickerZh: '课程项目 · 2026 年 7–9 月',
      title: 'EchoLoom',
      repository: 'https://github.com/Zhguo903/Echoloom',
      body: `<p>An AI emotional-companion MVP shaped by competitor research and interviews with six users. The project explored target users, product positioning, and willingness-to-pay signals.</p>
        <p>User insights became a story-first experience with five characters. MVP features were prioritized by user value, development effort, and technical feasibility.</p>
        <ul><li>Gemini-powered Node.js backend with character-specific context and AI-response validation.</li><li>Persistent memory with recovery and fallback mechanisms to support dialogue continuity.</li><li>Bilingual HTML, CSS, and JavaScript prototype with five investigation chapters and three endings.</li><li>Implementation validated through six automated test suites.</li></ul>`,
      bodyZh: `<p>基于竞品调研和对 6 位用户的访谈，设计 AI 情感陪伴产品的最小可行版本（MVP），探索目标用户、产品定位和付费意愿。</p>
        <p>根据用户调研结果，设计以故事为核心、包含 5 个角色的体验，并综合用户价值、开发投入和技术可行性，确定 MVP 功能的开发优先级。</p>
        <ul><li>基于 Gemini 构建 Node.js 后端，按角色设置上下文，并校验 AI 回复。</li><li>通过持久化记忆以及恢复、回退机制，保持对话连贯。</li><li>使用 HTML、CSS 和 JavaScript 构建双语原型，包含 5 个调查章节与 3 个结局。</li><li>使用 6 套自动化测试验证项目功能。</li></ul>`
    },
    courseinsight: {
      kicker: 'Personal project · 2026',
      kickerZh: '个人项目 · 2026 年',
      title: 'CourseInsight',
      repository: 'https://github.com/Zhguo903/Course-Evaluation',
      body: `<p>A course-planning tool for University of Toronto students, bringing official calendars, published timetables, historical feedback and learning-resource links into a local Streamlit app.</p>
        <ul><li><strong>Official coverage:</strong> 10,037 undergraduate courses from St. George Arts &amp; Science, UTM and UTSC, alongside 7,093 published offering records. Each campus retains its own breadth or distribution system.</li><li><strong>Course exploration:</strong> filter by campus, level, subject and requirements; compare prerequisites and offering status; export results as CSV. A 752-entry resource index links 575 current courses to syllabi, notes and other learning materials.</li><li><strong>Attributed feedback:</strong> 70,453 historical survey reports, of which 54,196 match 6,505 current courses, plus 28 personal reviews from one author. Survey dimensions, original scales and personal opinions remain separate.</li><li><strong>Reproducible pipeline:</strong> Python and pandas process the snapshots into DuckDB. Coverage checks, source hashes and atomic database publication protect the last valid dataset; 166 automated tests cover data handling and interface behaviour.</li></ul>
        <p>Catalogue and timetable snapshot: October 13, 2026. Historical surveys cover 2012–2024, with availability varying by campus, and come from publicly shared third-party copies. Published offerings do not indicate live seat availability; the app does not predict difficulty or grades.</p>`,
      bodyZh: `<p>面向多伦多大学学生的选课工具，将官方课程目录、已发布课表、历史反馈与学习资料链接整合到本地 Streamlit 应用中。</p>
        <ul><li><strong>官方课程覆盖：</strong>整合 St. George 文理学院、UTM 和 UTSC 的 10,037 门本科课程，以及 7,093 条已发布开课记录，保留各校区独立的广度／分布要求体系。</li><li><strong>课程查询与对比：</strong>按校区、级别、学科和修读要求筛选，比较先修要求与开课状态，并导出 CSV。752 条资源记录为 575 门当前课程提供大纲、讲义等资料入口。</li><li><strong>可追溯反馈：</strong>保留 70,453 条历史问卷报告，其中 54,196 条精确对应 6,505 门当前课程；另有同一作者的 28 条个人评价。问卷维度、原始量表和个人观点分别展示。</li><li><strong>可重建的数据流程：</strong>使用 Python 与 pandas 处理快照并构建 DuckDB，通过覆盖检查、来源哈希和原子数据库发布保护有效数据，166 项自动化测试覆盖数据处理与页面交互。</li></ul>
        <p>课程与课表快照核验于 2026 年 10 月 13 日。历史问卷来自公开的第三方副本，覆盖 2012–2024 年，各校区范围不同。已发布开课不等于实时有余位；项目不预测课程难度或成绩。</p>`
    },
    narrative: {
      kicker: 'Course project · February–April 2026',
      kickerZh: '课程项目 · 2026 年 2–4 月',
      title: 'Tracing the AI Narrative',
      repository: 'https://github.com/Zhguo903/Guardian-ai-news-analysis',
      body: `<p>Where does AI appear across a newsroom? This project traces The Guardian’s coverage from January 2021 to December 2025, using the Guardian Content API to narrow 40,232 broad search results to 3,120 AI-focused articles.</p>
        <ul><li><strong>Corpus quality:</strong> a saved 200-article relevance audit labeled 80 of 100 strict-corpus articles and 1 of 100 excluded articles as core AI. These are audit counts, not model accuracy.</li><li><strong>Coverage across sections:</strong> the filtered corpus spans 39 editorial sections; 53.3% of its articles appear outside Technology and Business.</li><li><strong>Text and placement:</strong> TF-IDF and metadata predict Technology/Business membership versus other sections, with section names excluded from predictors. XGBoost records 76.4% accuracy, 0.750 F1 and 0.847 ROC-AUC, against a 53.4% majority-baseline accuracy.</li><li><strong>Reusable outputs:</strong> six exploratory LDA topic groups, Plotly figures, aggregate tables, analysis scripts and a Quarto report. Raw article text is not redistributed.</li></ul>
        <p>Scope: one publisher and a query-defined corpus. Editorial section is a proxy for placement, not a direct measure of framing. Model selection used test-set F1, without a separate selection-validation set or future-time holdout; the results are exploratory and retrospective.</p>`,
      bodyZh: `<p>AI 的故事出现在哪些新闻栏目？本项目分析《卫报》2021 年 1 月至 2025 年 12 月的报道，使用 Guardian Content API，从 40,232 条宽泛搜索结果中筛选出 3,120 篇聚焦 AI 的文章。</p>
        <ul><li><strong>语料质量：</strong>仓库保存的 200 篇文章相关性复核中，严格语料样本的 100 篇有 80 篇被标为核心 AI 内容；被排除样本的 100 篇中有 1 篇。这里是复核计数，不是模型准确率。</li><li><strong>跨栏目报道：</strong>筛选后的语料覆盖 39 个栏目，其中 53.3% 的文章位于科技和商业栏目之外。</li><li><strong>文本与栏目归属：</strong>结合 TF-IDF 与元数据，区分科技／商业栏目和其他栏目，预测特征不含栏目名称。XGBoost 的准确率为 76.4%，F1 为 0.750，ROC-AUC 为 0.847；多数类基线准确率为 53.4%。</li><li><strong>可复用成果：</strong>6 组探索性 LDA 主题、Plotly 图表、汇总数据、分析脚本和 Quarto 报告；不重新分发新闻全文。</li></ul>
        <p>研究范围为单一媒体、由搜索条件界定的语料。栏目归属用于观察编辑分类，不能直接等同于报道框架。模型依据测试集 F1 选出，未设置独立的模型选择验证集或未来时间留出集，因此结果属于探索性回顾分析。</p>`
    }
  };
  const dialog = $('#project-dialog');
  let dialogOpener = null;
  let activeProjectKey = null;
  function renderProject(key) {
    const project = projectDetails[key];
    if (!project || !dialog) return;
    const kicker = $('#dialog-kicker');
    const title = $('#dialog-title');
    const body = $('#dialog-body');
    if (kicker) kicker.textContent = t(project.kicker, project.kickerZh);
    if (title) title.textContent = project.title;
    if (body) {
      body.innerHTML = t(project.body, project.bodyZh);
      if (project.repository) {
        const link = document.createElement('a');
        link.className = 'text-link project-repo';
        link.href = project.repository;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = t('View GitHub repo ↗', '查看 GitHub 仓库 ↗');
        body.append(link);
      }
    }
  }
  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.project;
    if (!projectDetails[key] || !dialog) return;
    dialogOpener = button;
    activeProjectKey = key;
    renderProject(key);
    if (!dialog.open) dialog.showModal();
    $('#dialog-close')?.focus();
  }));
  $('#dialog-close')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    if (dialogOpener?.isConnected) dialogOpener.focus({ preventScroll: true });
    dialogOpener = null;
    activeProjectKey = null;
  });

  let copyTimer;
  let copyStatus = 'idle';
  function updateCopyLabel() {
    const label = $('#copy-label');
    if (label) label.textContent = copyStatus === 'copied'
      ? t('Copied ✓', '已复制 ✓')
      : copyStatus === 'failed' ? t('Copy failed', '复制失败') : t('Copy email', '复制邮箱地址');
  }
  $('#copy-email')?.addEventListener('click', async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch { /* Fall through to the local clipboard fallback. */ }
    if (!copied) {
      const helper = document.createElement('textarea');
      helper.value = email;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(helper);
      helper.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      helper.remove();
      $('#copy-email')?.focus({ preventScroll: true });
    }
    copyStatus = copied ? 'copied' : 'failed';
    updateCopyLabel();
    if (copied) toast('Email copied to clipboard.', '邮箱地址已复制到剪贴板。');
    else toast(`Unable to copy. Email: ${email}`, `未能复制。邮箱地址：${email}`);
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyStatus = 'idle';
      updateCopyLabel();
    }, 2600);
  });
  updateCopyLabel();

  window.addEventListener('site:language', () => {
    selectTheme(selectedTheme);
    updateMotionControl();
    updateMenuControl();
    updateCopyLabel();
    if (dialog?.open && activeProjectKey) renderProject(activeProjectKey);
    if (activeToast) {
      const element = $('#toast');
      if (element) element.textContent = t(activeToast.enText, activeToast.zhText);
    }
    // Translation can change a preview's measured height even with motion off.
    positionPreview();
    requestFrame();
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

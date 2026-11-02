/* Local language preference and static copy. No network services required. */
(() => {
  'use strict';

  const storageKey = 'zihan-portfolio-language';
  let language = 'en';
  try {
    if (window.localStorage.getItem(storageKey) === 'zh') language = 'zh';
  } catch { /* The switch also works when browser storage is unavailable. */ }

  const copy = window.siteChinese || {};
  const originalCopy = new Map();
  document.querySelectorAll('[data-i18n]').forEach(element => {
    originalCopy.set(element, element.innerHTML);
  });

  const ariaCopy = {
    'Zihan Guo, home': '郭子涵的首页',
    'Zihan Guo': '郭子涵',
    'Main navigation': '主导航',
    'Interactive collection of research and interests. Hover or focus a tag for a preview, tap on touch screens, or drag to explore.': '研究与兴趣的互动拼贴。鼠标悬停或键盘聚焦可查看介绍；触屏可轻点查看，也可拖动标签探索。',
    'Portrait of Zihan Guo': '郭子涵的个人照片',
    'EchoLoom feature teaser showing companion chat, shared stories, and product features': 'EchoLoom 功能预览，展示陪伴对话、共同经历的故事和产品功能',
    'A little more about me': '再多了解我一点',
    'Reset scattered tags': '重置标签位置',
    'View full research teaser (opens in a new tab)': '查看完整研究图（在新标签页打开）',
    'Filter projects': '筛选项目',
    'Explore EchoLoom': '查看 EchoLoom 项目',
    'View EchoLoom on GitHub (opens in a new tab)': '查看 EchoLoom 的 GitHub 仓库（在新标签页打开）',
    'Explore Tracing the AI Narrative': '查看 Tracing the AI Narrative 项目',
    'Explore CourseInsight': '查看 CourseInsight 项目',
    'View full CourseInsight teaser (opens in a new tab)': '查看 CourseInsight 完整介绍图（在新标签页打开）',
    'Copy email address': '复制邮箱地址',
    'Close project details': '关闭项目详情'
  };
  const originalAria = new Map();
  document.querySelectorAll('[aria-label]').forEach(element => {
    const original = element.getAttribute('aria-label');
    if (Object.hasOwn(ariaCopy, original)) originalAria.set(element, original);
  });

  const descriptions = {
    en: 'Zihan Guo is a University of Toronto undergraduate exploring human–AI interaction, agent safety, data visualization, and computational genomics.',
    zh: '郭子涵是多伦多大学本科生，关注人机交互、智能体安全、数据可视化与计算基因组学。'
  };
  const titles = {
    en: 'Zihan Guo — Curiosity, connected.',
    zh: '郭子涵 — 保持好奇，发现联系'
  };

  function applyLanguage(next, announce = true) {
    language = next === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
    originalCopy.forEach((english, element) => {
      const key = element.dataset.i18n;
      element.innerHTML = language === 'zh' && Object.hasOwn(copy, key) ? copy[key] : english;
    });
    originalAria.forEach((english, element) => {
      element.setAttribute('aria-label', language === 'zh' ? ariaCopy[english] : english);
    });
    document.querySelector('.school-native')?.setAttribute('lang', language === 'zh' ? 'en' : 'zh-Hans');
    document.querySelectorAll('.portrait-photo').forEach(photo => photo.setAttribute('alt', language === 'zh'
      ? '郭子涵的个人照片'
      : 'Portrait of Zihan Guo'));
    document.querySelector('.project-teaser')?.setAttribute('alt', language === 'zh'
      ? 'EchoLoom 功能预览，展示陪伴对话、共同经历的故事和产品功能'
      : 'EchoLoom feature teaser showing companion chat, shared stories, and product features');
    document.querySelector('.memory-teaser')?.setAttribute('alt', language === 'zh'
      ? 'Before Bringing It Up 研究概览：用户期望、Reconsider 记忆检查流程与评估结果'
      : 'Overview of Before Bringing It Up: user expectations, Reconsider memory checks, and evaluation findings');
    document.querySelector('.safety-teaser')?.setAttribute('alt', language === 'zh'
      ? 'SkillScreen 研究概览：技能指令、风险评分流程与评估结果'
      : 'SkillScreen research overview: skill instructions, decision scoring, and evaluation findings');
    document.querySelector('.narrative-teaser')?.setAttribute('alt', language === 'zh'
      ? 'Tracing the AI Narrative：语料筛选、文本分析与《卫报》2021–2025 年 AI 报道的分析发现'
      : "Tracing the AI Narrative: corpus filtering, text analysis, and findings from The Guardian's 2021–2025 AI coverage");
    document.querySelector('.courseinsight-teaser')?.setAttribute('alt', language === 'zh'
      ? 'CourseInsight 项目概览：三校区课程目录、课程筛选、已发布开课信息、历史评价与学习资料'
      : 'CourseInsight overview: three campus catalogues, course filters, published offerings, historical feedback and learning resources');
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', button.dataset.language === 'zh' ? '切换为中文' : 'Switch to English');
    });
    document.title = titles[language];
    document.querySelector('meta[name="description"]')?.setAttribute('content', descriptions[language]);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', titles[language]);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', language === 'zh'
      ? '探索人、数据与智能系统之间的联系。'
      : 'Exploring the space between people, data, and intelligent systems.');
    try { window.localStorage.setItem(storageKey, language); } catch { /* Session-only preference. */ }
    window.dispatchEvent(new CustomEvent('site:language', { detail: { language } }));
    if (announce) {
      let status = document.getElementById('language-announcement');
      if (!status) {
        status = document.createElement('p');
        status.id = 'language-announcement';
        status.className = 'sr-only';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        document.body.appendChild(status);
      }
      status.textContent = language === 'zh' ? '已切换为中文' : 'Language changed to English';
    }
  }

  window.siteI18n = {
    get language() { return language; },
    t(english, chinese) { return language === 'zh' ? chinese : english; },
    setLanguage: applyLanguage
  };
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.language !== language) applyLanguage(button.dataset.language);
    });
  });
  applyLanguage(language, false);
})();

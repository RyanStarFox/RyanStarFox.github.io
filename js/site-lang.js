'use strict';

const SITE_I18N = {
  zh: {
    placeholder: '搜索标题、正文、标签、分类…',
    result_placeholder: '请输入关键词，或选择下方筛选条件',
    empty: '找不到您查询的内容: ${query}',
    hits: '找到 ${hits} 条结果',
    hits_time: '找到 ${hits} 条结果（用时 ${time} 毫秒）',
    author: '本文作者：',
    copyright_link: '本文链接：',
    copyright_license_title: '版权声明：',
    copyright_license_content: '本博客所有文章除特别声明外，均默认采用 %s 许可协议。',
    copy_success: '复制成功',
    copy_failure: '复制失败',
    open_read_mode: '进入阅读模式',
    exit_read_mode: '退出阅读模式',
    notice_outdate_message: '距离上次更新已经 %s 天了, 文章内容可能已经过时。',
    sticky: '置顶',
    just: '刚刚',
    min: '分钟前',
    hour: '小时前',
    day: '天前',
    month: '个月前',
  },
  en: {
    placeholder: 'Search titles, body, tags, categories…',
    result_placeholder: 'Type a keyword, or pick filters below',
    empty: "We didn't find any results for the search: ${query}.",
    hits: '${hits} results found',
    hits_time: '${hits} results found in ${time} ms',
    author: 'Post author: ',
    copyright_link: 'Post link: ',
    copyright_license_title: 'Copyright Notice: ',
    copyright_license_content: 'All articles in this blog are licensed under %s unless otherwise stated.',
    copy_success: 'Copied',
    copy_failure: 'Copy failed',
    open_read_mode: 'Enter reading mode',
    exit_read_mode: 'Exit reading mode',
    notice_outdate_message: 'It has been %s days since the last update, the content of the article may be outdated.',
    sticky: 'TOP',
    just: 'Just',
    min: 'minutes ago',
    hour: 'hours ago',
    day: 'days ago',
    month: 'months ago',
  },
};

function bilingualPattern() {
  return /([\u4e00-\u9fff][^\/]{0,40})\/([A-Za-z][\x20-\x7E]{0,60})$/;
}

function wrapBilingualTextNodes(root) {
  const skip = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'KBD', 'SAMP']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (skip.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.i18n-zh, .i18n-en, .trm-lang-switcher')) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return bilingualPattern().test(node.nodeValue.trim())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((textNode) => {
    const raw = textNode.nodeValue;
    const trimmed = raw.trim();
    const match = trimmed.match(bilingualPattern());
    if (!match) return;
    const zh = match[1].trim();
    const en = match[2].trim();
    const wrap = document.createElement('span');
    const zhSpan = document.createElement('span');
    zhSpan.className = 'i18n-zh';
    zhSpan.textContent = zh;
    const enSpan = document.createElement('span');
    enSpan.className = 'i18n-en';
    enSpan.textContent = en;
    wrap.appendChild(zhSpan);
    wrap.appendChild(enSpan);
    textNode.parentNode.replaceChild(wrap, textNode);
  });
}

function applyTypedText(lang) {
  if (!window.ASYNC_CONFIG) return;
  const cfg = window.SITE_LANG_CONFIG || {};
  if (lang === 'en' && Array.isArray(cfg.typed_text_en) && cfg.typed_text_en.length) {
    window.ASYNC_CONFIG.typed_text = cfg.typed_text_en.slice();
    window.ASYNC_CONFIG.typed_text_prefix = cfg.typed_text_prefix_en || 'Enjoy';
  } else if (Array.isArray(cfg.typed_text_zh) && cfg.typed_text_zh.length) {
    window.ASYNC_CONFIG.typed_text = cfg.typed_text_zh.slice();
    window.ASYNC_CONFIG.typed_text_prefix = cfg.typed_text_prefix_zh || '享受';
  }
}

let typedTimer = null;
let typedPauseTimer = null;

function stopTypedText() {
  if (typedTimer) {
    clearInterval(typedTimer);
    typedTimer = null;
  }
  if (typedPauseTimer) {
    clearTimeout(typedPauseTimer);
    typedPauseTimer = null;
  }
}

function startTypedText(el, words) {
  stopTypedText();
  if (!el || !Array.isArray(words) || !words.length) return;

  // Detach theme typing.js from this node by replacing it.
  const fresh = el.cloneNode(false);
  el.parentNode.replaceChild(fresh, el);
  el = fresh;

  const typeMs = 100;
  const holdMs = 3000;
  const MODE_TYPE = 0;
  const MODE_DELETE = 1;
  let mode = MODE_TYPE;
  let wordIndex = 0;
  let charIndex = 0;

  function tick() {
    const word = words[wordIndex] || '';
    if (mode === MODE_TYPE) {
      charIndex += 1;
      el.textContent = word.substring(0, charIndex);
      if (charIndex >= word.length) {
        mode = MODE_DELETE;
        clearInterval(typedTimer);
        typedTimer = null;
        typedPauseTimer = setTimeout(() => {
          typedTimer = setInterval(tick, typeMs);
        }, holdMs);
      }
      return;
    }

    charIndex -= 1;
    el.textContent = word.substring(0, Math.max(charIndex, 0));
    if (charIndex <= 0) {
      mode = MODE_TYPE;
      wordIndex = (wordIndex + 1) % words.length;
      charIndex = 0;
    }
  }

  typedTimer = setInterval(tick, typeMs);
}

function restartTypedText(lang) {
  applyTypedText(lang);
  const el = document.querySelector('.trm-typed-text');
  const words = (window.ASYNC_CONFIG && window.ASYNC_CONFIG.typed_text) || [];
  startTypedText(el, words);
}

function applyAsyncI18n(lang) {
  if (!window.ASYNC_CONFIG) return;
  const dict = SITE_I18N[lang] || SITE_I18N.zh;
  window.ASYNC_CONFIG.i18n = Object.assign({}, window.ASYNC_CONFIG.i18n || {}, dict);
}

function setLanguage(lang, { persist = true } = {}) {
  const next = lang === 'en' ? 'en' : 'zh';
  document.documentElement.setAttribute('data-lang', next);
  if (persist) {
    try { localStorage.setItem('site-lang', next); } catch (e) {}
  }
  applyAsyncI18n(next);
  restartTypedText(next);
  document.querySelectorAll('.trm-lang-btn').forEach((btn) => {
    const active = btn.getAttribute('data-lang') === next;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.documentElement.dispatchEvent(new CustomEvent('site-lang-change', { detail: { lang: next } }));
}

function bindSwitcher() {
  document.querySelectorAll('.trm-lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
  });
}

function initLanguage() {
  let lang = 'zh';
  try {
    lang = localStorage.getItem('site-lang') || 'zh';
  } catch (e) {}
  wrapBilingualTextNodes(document.body);
  setLanguage(lang, { persist: false });
  bindSwitcher();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguage);
} else {
  initLanguage();
}

document.addEventListener('swup:contentReplaced', () => {
  wrapBilingualTextNodes(document.body);
  let lang = 'zh';
  try { lang = localStorage.getItem('site-lang') || 'zh'; } catch (e) {}
  setLanguage(lang, { persist: false });
  bindSwitcher();
});

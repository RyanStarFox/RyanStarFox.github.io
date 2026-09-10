(() => {
  const state = {
    datas: null,
    facets: { tags: [], categories: [] },
    loading: null,
    mode: 'and',
    selectedTags: new Set(),
    selectedCategories: new Set(),
    dateFromYear: '',
    dateFromMonth: '',
    dateToYear: '',
    dateToMonth: '',
  };

  function currentLang() {
    return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  }

  function i18n() {
    return (window.ASYNC_CONFIG && window.ASYNC_CONFIG.i18n) || {};
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function displayTitle(item, lang) {
    if (lang === 'en' && item.title_en) return item.title_en;
    return item.title || item.title_en || '';
  }

  function displayFacet(facet, lang) {
    if (lang === 'en' && facet.name_en) return facet.name_en;
    return facet.name;
  }

  function searchableText(item) {
    return [
      item.title,
      item.title_en,
      item.content,
      item.content_en,
      ...(item.tags || []),
      ...(item.tags_en || []),
      ...(item.categories || []),
      ...(item.categories_en || []),
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
  }

  function tokenize(query) {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function matchKeywords(item, keywords) {
    if (!keywords.length) return { ok: true, hitCount: 0, includedCount: 0 };
    const text = searchableText(item);
    let hitCount = 0;
    const included = new Set();
    keywords.forEach((word) => {
      let from = 0;
      let pos = text.indexOf(word, from);
      let count = 0;
      while (pos !== -1) {
        count += 1;
        from = pos + word.length;
        pos = text.indexOf(word, from);
      }
      if (count > 0) {
        included.add(word);
        hitCount += count;
      }
    });
    return {
      ok: included.size === keywords.length,
      hitCount,
      includedCount: included.size,
    };
  }

  function itemMonth(item) {
    if (!item) return '';
    const raw = item.date;
    if (typeof raw === 'string') {
      const m = raw.match(/^(\d{4})[-/](\d{1,2})/);
      if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
      if (/^\d{4}$/.test(raw)) return `${raw}-01`;
    }
    const url = String(item.url || item.path || '');
    const um = url.match(/\/(20\d{2})\/(\d{1,2})\//);
    if (um) return `${um[1]}-${String(um[2]).padStart(2, '0')}`;
    return '';
  }

  function availableYears() {
    const now = new Date().getFullYear();
    const set = new Set();
    for (let y = now; y >= 2020; y -= 1) set.add(String(y));
    (state.datas || []).forEach((item) => {
      const month = itemMonth(item);
      if (month) set.add(month.slice(0, 4));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }

  function readDates(popup) {
    if (!popup) return;
    const val = (key) => {
      const el = popup.querySelector(`[data-date="${key}"]`);
      return el ? String(el.value || '') : '';
    };
    state.dateFromYear = val('from-year');
    state.dateFromMonth = val('from-month');
    state.dateToYear = val('to-year');
    state.dateToMonth = val('to-month');
  }

  function matchDate(item) {
    const fromYear = state.dateFromYear ? Number(state.dateFromYear) : null;
    const toYear = state.dateToYear ? Number(state.dateToYear) : null;
    if (fromYear == null && toYear == null) return true;

    const month = itemMonth(item);
    if (!month) return true;
    const year = Number(month.slice(0, 4));
    const mon = Number(month.slice(5, 7));
    if (!year || !mon) return true;

    const fromMon = state.dateFromMonth ? Number(state.dateFromMonth) : 1;
    const toMon = state.dateToMonth ? Number(state.dateToMonth) : 12;

    if (fromYear != null) {
      if (year < fromYear) return false;
      if (year === fromYear && mon < fromMon) return false;
    }
    if (toYear != null) {
      if (year > toYear) return false;
      if (year === toYear && mon > toMon) return false;
    }
    return true;
  }

  function hasActiveFilters() {
    return (
      state.selectedTags.size > 0 ||
      state.selectedCategories.size > 0 ||
      !!state.dateFromYear ||
      !!state.dateToYear
    );
  }

  function matchFacets(item) {
    const tags = state.selectedTags;
    const cats = state.selectedCategories;
    if (!tags.size && !cats.size) return true;

    const itemTags = new Set(item.tags || []);
    const itemCats = new Set(item.categories || []);

    if (state.mode === 'and') {
      for (const t of tags) if (!itemTags.has(t)) return false;
      for (const c of cats) if (!itemCats.has(c)) return false;
      return true;
    }

    for (const t of tags) if (itemTags.has(t)) return true;
    for (const c of cats) if (itemCats.has(c)) return true;
    return false;
  }

  function highlight(text, keywords) {
    const raw = String(text || '');
    if (!keywords.length || !raw) return escapeHtml(raw);
    const lower = raw.toLowerCase();
    const ranges = [];
    keywords.forEach((word) => {
      let from = 0;
      let pos = lower.indexOf(word, from);
      while (pos !== -1) {
        ranges.push([pos, pos + word.length]);
        from = pos + word.length;
        pos = lower.indexOf(word, from);
      }
    });
    if (!ranges.length) return escapeHtml(raw);
    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [];
    ranges.forEach(([s, e]) => {
      const last = merged[merged.length - 1];
      if (!last || s > last[1]) merged.push([s, e]);
      else last[1] = Math.max(last[1], e);
    });
    let out = '';
    let cursor = 0;
    merged.forEach(([s, e]) => {
      out += escapeHtml(raw.slice(cursor, s));
      out += `<mark class="search-keyword">${escapeHtml(raw.slice(s, e))}</mark>`;
      cursor = e;
    });
    out += escapeHtml(raw.slice(cursor));
    return out;
  }

  function excerpt(item, keywords, lang) {
    const body = lang === 'en' && item.content_en ? item.content_en : item.content || item.content_en || '';
    if (!body) return '';
    if (!keywords.length) return escapeHtml(body.slice(0, 120)) + (body.length > 120 ? '…' : '');
    const lower = body.toLowerCase();
    let best = -1;
    keywords.forEach((word) => {
      const pos = lower.indexOf(word);
      if (pos !== -1 && (best === -1 || pos < best)) best = pos;
    });
    if (best === -1) return escapeHtml(body.slice(0, 120)) + (body.length > 120 ? '…' : '');
    const start = Math.max(0, best - 24);
    const end = Math.min(body.length, best + 96);
    const slice = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
    return highlight(slice, keywords);
  }

  function metaLine(item, lang) {
    const cats = (item.categories || []).map((name, i) =>
      lang === 'en' && item.categories_en && item.categories_en[i] ? item.categories_en[i] : name
    );
    const tags = (item.tags || []).map((name, i) =>
      lang === 'en' && item.tags_en && item.tags_en[i] ? item.tags_en[i] : name
    );
    const parts = [];
    if (item.date) parts.push(item.date);
    if (cats.length) parts.push(cats.join(' / '));
    if (tags.length) parts.push(tags.join(', '));
    return parts.map(escapeHtml).join(' · ');
  }

  async function ensureData() {
    if (state.datas) return state.datas;
    if (state.loading) return state.loading;
    const cfg = window.ASYNC_CONFIG && window.ASYNC_CONFIG.search;
    if (!cfg || !cfg.path) {
      console.warn('[site-search] missing ASYNC_CONFIG.search.path');
      return null;
    }
    const root = (window.ASYNC_CONFIG && window.ASYNC_CONFIG.root) || '/';
    const url = cfg.path.startsWith('http') ? cfg.path : root + cfg.path.replace(/^\//, '');
    state.loading = fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          state.datas = data;
          state.facets = { tags: [], categories: [] };
        } else {
          state.datas = data.items || [];
          state.facets = data.facets || { tags: [], categories: [] };
        }
        state.loading = null;
        document.querySelectorAll('.trm-search-popup').forEach(renderDateSelects);
        return state.datas;
      })
      .catch((err) => {
        console.error('[site-search] fetch failed', err);
        state.loading = null;
        return null;
      });
    return state.loading;
  }

  function renderDateSelects(popup) {
    if (!popup) return;
    const lang = currentLang();
    const any = lang === 'en' ? 'Any' : '不限';
    const years = availableYears();

    const fill = (key, opts, current) => {
      const el = popup.querySelector(`[data-date="${key}"]`);
      if (!el) return;
      el.innerHTML = opts
        .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
        .join('');
      const wanted = current || '';
      el.value = opts.some(([value]) => value === wanted) ? wanted : '';
    };

    const yearOpts = [['', any], ...years.map((y) => [y, y])];
    const monthOpts = [
      ['', any],
      ...Array.from({ length: 12 }, (_, i) => {
        const mm = String(i + 1).padStart(2, '0');
        const label = lang === 'en' ? mm : `${i + 1}月`;
        return [mm, label];
      }),
    ];

    fill('from-year', yearOpts, state.dateFromYear);
    fill('to-year', yearOpts, state.dateToYear);
    fill('from-month', monthOpts, state.dateFromMonth);
    fill('to-month', monthOpts, state.dateToMonth);
  }

  function renderChips(popup) {
    const lang = currentLang();
    ['categories', 'tags'].forEach((key) => {
      const box = popup.querySelector(`[data-chips="${key}"]`);
      if (!box) return;
      const selected = key === 'tags' ? state.selectedTags : state.selectedCategories;
      const list = state.facets[key] || [];
      box.innerHTML = list
        .map((facet) => {
          const active = selected.has(facet.name) ? ' is-active' : '';
          const label = escapeHtml(displayFacet(facet, lang));
          return `<button type="button" class="trm-search-chip${active}" data-facet="${key}" data-name="${escapeHtml(facet.name)}" aria-pressed="${active ? 'true' : 'false'}">${label}</button>`;
        })
        .join('');
    });
  }

  function renderResults(popup) {
    const input = popup.querySelector('.trm-search-input');
    const container = popup.querySelector('.trm-search-result-container');
    const stats = popup.querySelector('.trm-search-stats');
    if (!input || !container || !stats) return;

    const query = input.value.trim();
    const keywords = tokenize(query);
    readDates(popup);
    const hasFilters = hasActiveFilters();
    const dict = i18n();
    const lang = currentLang();

    if (!query && !hasFilters) {
      const tip =
        dict.result_placeholder ||
        (lang === 'en' ? 'Type a keyword or pick filters' : '请输入关键词，或选择筛选条件');
      container.innerHTML = `<div class="trm-search-empty">${escapeHtml(tip)}</div>`;
      stats.innerHTML = '';
      return;
    }

    if (!state.datas) {
      container.innerHTML = `<div class="trm-search-empty">${lang === 'en' ? 'Loading…' : '加载中…'}</div>`;
      stats.innerHTML = '';
      return;
    }

    const results = [];
    state.datas.forEach((item, id) => {
      if (!matchFacets(item)) return;
      if (!matchDate(item)) return;
      const kw = matchKeywords(item, keywords);
      if (!kw.ok) return;
      results.push({ item, id, ...kw });
    });

    results.sort((a, b) => {
      if (a.includedCount !== b.includedCount) return b.includedCount - a.includedCount;
      if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
      return b.id - a.id;
    });

    if (!results.length) {
      const emptyTpl = dict.empty || (lang === 'en'
        ? "We didn't find any results for the search: ${query}."
        : '找不到您查询的内容: ${query}');
      const shown = query || (lang === 'en' ? 'selected filters' : '所选筛选');
      container.innerHTML = `<div class="trm-search-empty">${escapeHtml(emptyTpl.replace('${query}', shown))}</div>`;
      stats.innerHTML = '';
      return;
    }

    const list = results
      .map(({ item }) => {
        const title = highlight(displayTitle(item, lang), keywords);
        const snippet = excerpt(item, keywords, lang);
        const meta = metaLine(item, lang);
        const href = item.url || '#';
        return `<li>
          <a class="search-result-link" href="${href}">
            <div class="search-result-title">${title}</div>
            ${meta ? `<div class="search-result-meta">${meta}</div>` : ''}
            ${snippet ? `<div class="search-result-snippet">${snippet}</div>` : ''}
          </a>
        </li>`;
      })
      .join('');

    container.innerHTML = `<ul class="search-result-list">${list}</ul>`;
    const hitsTpl = dict.hits || (lang === 'en' ? '${hits} results found' : '找到 ${hits} 条结果');
    stats.innerHTML = escapeHtml(hitsTpl.replace('${hits}', String(results.length)));
  }

  function setMode(popup, mode) {
    state.mode = mode === 'or' ? 'or' : 'and';
    popup.querySelectorAll('.trm-search-mode-btn').forEach((btn) => {
      const active = btn.getAttribute('data-mode') === state.mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncPlaceholder(popup) {
    const input = popup.querySelector('.trm-search-input');
    if (!input) return;
    const dict = i18n();
    if (dict.placeholder) input.setAttribute('placeholder', dict.placeholder);
  }

  function bindPopup(popup) {
    const openBtn = document.querySelector('#trm-search-btn');
    const closeBtn = popup.querySelector('.trm-search-btn-close');
    const escBtn = popup.querySelector('.trm-search-esc-btn');
    const input = popup.querySelector('.trm-search-input');
    const filters = popup.querySelector('.trm-search-filters');
    const clearBtn = popup.querySelector('.trm-search-filter-clear');
    if (!openBtn || !input) return () => {};

    const run = () => renderResults(popup);

    const onDate = (e) => {
      const el = e.target.closest && e.target.closest('[data-date]');
      if (!el) return;
      readDates(popup);
      run();
    };

    const open = async () => {
      popup.classList.add('show');
      setTimeout(() => input.focus(), 200);
      await ensureData();
      if (filters) filters.hidden = false;
      renderDateSelects(popup);
      renderChips(popup);
      syncPlaceholder(popup);
      run();
    };

    const close = () => popup.classList.remove('show');

    const onKey = (e) => {
      if (!popup.classList.contains('show')) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        close();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onBackdrop = (e) => {
      if (e.target === popup) close();
    };

    const onMode = (e) => {
      const btn = e.target.closest('.trm-search-mode-btn');
      if (!btn) return;
      setMode(popup, btn.getAttribute('data-mode'));
      run();
    };

    const onChip = (e) => {
      const chip = e.target.closest('.trm-search-chip');
      if (!chip) return;
      const facet = chip.getAttribute('data-facet');
      const name = chip.getAttribute('data-name');
      const set = facet === 'tags' ? state.selectedTags : state.selectedCategories;
      if (set.has(name)) set.delete(name);
      else set.add(name);
      renderChips(popup);
      run();
    };

    const onClear = () => {
      state.selectedTags.clear();
      state.selectedCategories.clear();
      state.dateFromYear = '';
      state.dateFromMonth = '';
      state.dateToYear = '';
      state.dateToMonth = '';
      renderDateSelects(popup);
      renderChips(popup);
      run();
    };

    const cfg = window.ASYNC_CONFIG && window.ASYNC_CONFIG.search;
    if (cfg && cfg.trigger === 'auto') input.addEventListener('input', run);
    else input.addEventListener('keypress', (e) => { if (e.key === 'Enter') run(); });

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (escBtn) escBtn.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    popup.addEventListener('click', onBackdrop);
    popup.addEventListener('click', onMode);
    popup.addEventListener('click', onChip);
    popup.addEventListener('change', onDate);
    if (clearBtn) clearBtn.addEventListener('click', onClear);

    const onLang = () => {
      syncPlaceholder(popup);
      renderDateSelects(popup);
      renderChips(popup);
      run();
    };
    document.documentElement.addEventListener('site-lang-change', onLang);

    if (cfg && cfg.preload) ensureData();

    return () => {
      openBtn.removeEventListener('click', open);
      if (closeBtn) closeBtn.removeEventListener('click', close);
      if (escBtn) escBtn.removeEventListener('click', close);
      input.removeEventListener('input', run);
      window.removeEventListener('keydown', onKey);
      popup.removeEventListener('click', onBackdrop);
      popup.removeEventListener('click', onMode);
      popup.removeEventListener('click', onChip);
      popup.removeEventListener('change', onDate);
      if (clearBtn) clearBtn.removeEventListener('click', onClear);
      document.documentElement.removeEventListener('site-lang-change', onLang);
    };
  }

  let cleanup = null;

  function init() {
    if (!(window.ASYNC_CONFIG && window.ASYNC_CONFIG.search)) return;
    const popup = document.querySelector('.trm-search-popup');
    if (!popup) return;
    if (cleanup) cleanup();
    cleanup = bindPopup(popup);
  }

  init();
  if (window.ASYNC_CONFIG && window.ASYNC_CONFIG.swup) {
    document.addEventListener('swup:contentReplaced', init);
  }
})();

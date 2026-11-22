(() => {
  'use strict';

  const PAGES = [
    { key: 'notes',  name: '大小事' },
    { key: 'events', name: '活動' },
    { key: 'about',  name: '關於我' }
  ];

  const TEXT = {
    notes:  { title: '大小事', sub: '隨手記下來的東西，想到什麼就寫什麼。', empty: '還沒有東西，之後會有的。' },
    events: { title: '活動',   sub: '比賽、活動，還有事後的一些心得。',     empty: '還沒有活動紀錄。' }
  };

  const view  = document.getElementById('view');
  const sw    = document.getElementById('switch');
  const knob  = document.getElementById('knob');

  const activeTag = { notes: null, events: null };
  const listState = {};
  let current = 0;
  let lastIdx = 0;
  let renderId = 0;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- Markdown ---------- */

  if (window.marked) {
    marked.use({
      renderer: {
        // ![說明](網址 "圖說")  ->  有圖說的話會顯示在圖片下方
        image(href, title, text) {
          const cap = title ? `<figcaption>${esc(title)}</figcaption>` : '';
          return `<figure><img src="${esc(href)}" alt="${esc(text)}" loading="lazy">${cap}</figure>`;
        }
      }
    });
  }

  const md = src => window.marked ? marked.parse(src) : `<pre>${esc(src)}</pre>`;

  /* ---------- 讀檔 ---------- */

  async function load(path, type = 'text') {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return type === 'json' ? res.json() : res.text();
  }

  /* ---------- 左上角開關 ---------- */

  // 每格寬度與內距從 CSS 變數讀，手機/電腦尺寸不同也不用改這裡
  function metrics() {
    const cs = getComputedStyle(sw);
    return {
      slot: parseFloat(cs.getPropertyValue('--slot')) || 72,
      pad:  parseFloat(cs.getPropertyValue('--pad'))  || 3
    };
  }

  const setKnob = px => sw.style.setProperty('--x', px + 'px');

  // 拖動中：旋鈕跟著手指走，上面的字跟著換成最靠近的那一頁
  function preview(px) {
    setKnob(px);
    knob.textContent = PAGES[clamp(Math.round(px / metrics().slot), 0, 2)].name;
  }

  function setSwitch(i) {
    current = i;
    setKnob(i * metrics().slot);
    knob.textContent = PAGES[i].name;
    sw.setAttribute('aria-valuenow', i);
    sw.setAttribute('aria-valuetext', PAGES[i].name);
  }

  function go(i) {
    const target = '#/' + PAGES[i].key;
    if (location.hash !== target) location.hash = target;
  }

  // 指標位置換成旋鈕的位移 (讓旋鈕中心對準手指；1px 是外框)
  function knobPos(e) {
    const { slot, pad } = metrics();
    const r = sw.getBoundingClientRect();
    return clamp(e.clientX - r.left - 1 - pad - slot / 2, 0, 2 * slot);
  }

  let dragging = false;

  sw.addEventListener('pointerdown', e => {
    dragging = true;
    sw.setPointerCapture(e.pointerId);
    sw.classList.add('drag');
    preview(knobPos(e));
  });

  sw.addEventListener('pointermove', e => {
    if (dragging) preview(knobPos(e));
  });

  sw.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    sw.classList.remove('drag');
    const i = clamp(Math.round(knobPos(e) / metrics().slot), 0, 2);
    setSwitch(i);
    go(i);
  });

  sw.addEventListener('pointercancel', () => {
    dragging = false;
    sw.classList.remove('drag');
    setSwitch(current);
  });

  sw.addEventListener('keydown', e => {
    let i = current;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i++;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i--;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = 2;
    else return;
    e.preventDefault();
    i = clamp(i, 0, 2);
    setSwitch(i);
    go(i);
  });

  /* ---------- 路由 ---------- */

  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, slug] = h.split('/').map(s => { try { return decodeURIComponent(s); } catch { return s; } });
    const idx = PAGES.findIndex(p => p.key === page);
    return idx < 0 ? { idx: 0, slug: null } : { idx, slug: slug || null };
  }

  /* ---------- 列表頁 ---------- */

  const tagsHTML = tags => (tags || []).map(t => `<span>#${esc(t)}</span>`).join('');

  function rowHTML(kind, it) {
    const sub = [];
    if (kind === 'events') {
      const where = [it.place, it.result].filter(Boolean).map(esc).join(' · ');
      if (where) sub.push(where);
    }
    if (it.summary) sub.push(esc(it.summary));
    const s = sub.map(x => `<span class="s">${x}</span>`).join('');
    return `<a class="row" href="#/${kind}/${encodeURIComponent(it.slug)}">
      <time>${esc(it.date || '')}</time>
      <span><span class="t">${esc(it.title)}</span>${s}</span>
      <span class="tags">${tagsHTML(it.tags)}</span>
    </a>`;
  }

  function rowsHTML(kind, items) {
    const tag = activeTag[kind];
    const shown = tag ? items.filter(i => (i.tags || []).includes(tag)) : items;
    if (!shown.length) return `<p class="empty">${esc(TEXT[kind].empty)}</p>`;
    let out = '', year = '';
    for (const it of shown) {
      if (kind === 'events') {
        const y = (it.date || '').slice(0, 4);
        if (y && y !== year) { year = y; out += `<h3 class="year">${esc(y)}</h3>`; }
      }
      out += rowHTML(kind, it);
    }
    return out;
  }

  function chipsHTML(kind, items) {
    const count = {};
    items.forEach(it => (it.tags || []).forEach(t => { count[t] = (count[t] || 0) + 1; }));
    const names = Object.keys(count);
    if (!names.length) return '';
    const on = activeTag[kind];
    const chip = (tag, label, n) =>
      `<button class="chip${(on || '') === tag ? ' on' : ''}" data-kind="${kind}" data-tag="${esc(tag)}">${esc(label)}<i>${n}</i></button>`;
    return chip('', '全部', items.length) + names.map(t => chip(t, '#' + t, count[t])).join('');
  }

  async function listView(kind) {
    const raw = await load(`data/${kind}.json`, 'json');
    const items = raw.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    listState[kind] = items;
    const all = new Set(items.flatMap(i => i.tags || []));
    if (activeTag[kind] && !all.has(activeTag[kind])) activeTag[kind] = null;
    return `
      <div class="hd"><h1>${esc(TEXT[kind].title)}</h1><p>${esc(TEXT[kind].sub)}</p></div>
      <div class="chips" id="chips">${chipsHTML(kind, items)}</div>
      <div id="list">${rowsHTML(kind, items)}</div>`;
  }

  function updateList(kind) {
    const items = listState[kind] || [];
    document.getElementById('chips').innerHTML = chipsHTML(kind, items);
    document.getElementById('list').innerHTML = rowsHTML(kind, items);
  }

  /* ---------- 單篇 ---------- */

  async function detailView(kind, slug) {
    const [items, body] = await Promise.all([
      load(`data/${kind}.json`, 'json'),
      load(`${kind}/${slug}.md`)
    ]);
    const it = items.find(i => i.slug === slug) || { title: slug, tags: [] };
    document.title = `${it.title} — Jeremy 的小角落`;

    const meta = [];
    if (it.date) meta.push(`<span>${esc(it.date)}</span>`);
    if (kind === 'events' && it.place)  meta.push(`<span>@ ${esc(it.place)}</span>`);
    if (kind === 'events' && it.result) meta.push(`<span>${esc(it.result)}</span>`);
    (it.tags || []).forEach(t =>
      meta.push(`<a href="#/${kind}" data-kind="${kind}" data-tag="${esc(t)}">#${esc(t)}</a>`));

    return `
      <a class="back" href="#/${kind}">← 回${esc(TEXT[kind].title)}</a>
      <article class="post">
        <h1>${esc(it.title)}</h1>
        <div class="meta">${meta.join('')}</div>
        <div class="md">${md(body)}</div>
      </article>`;
  }

  /* ---------- 關於我 ---------- */

  async function aboutView() {
    const [info, intro] = await Promise.all([load('data/about.json', 'json'), load('about.md')]);
    const avatar = info.avatar
      ? `<img class="avatar" src="${esc(info.avatar)}" alt="頭像">`
      : `<div class="avatar ph">頭像</div>`;
    const contacts = (info.contacts || []).map(c => {
      const v = c.value
        ? (c.href ? `<a href="${esc(c.href)}">${esc(c.value)}</a>` : esc(c.value))
        : `<span class="blank">（待填）</span>`;
      return `<li><span class="k">${esc(c.label)}</span><span>${v}</span></li>`;
    }).join('');
    return `
      <div class="about">
        ${avatar}
        <div>
          <h1>${esc(info.name || '')}</h1>
          ${info.tagline ? `<p class="tagline">${esc(info.tagline)}</p>` : ''}
          <ul class="contacts">${contacts}</ul>
        </div>
      </div>
      <div class="md">${md(intro)}</div>`;
  }

  /* ---------- 繪製 ---------- */

  function errorView(err) {
    const local = location.protocol === 'file:';
    return `<div class="err"><b>讀不到內容。</b><br>${
      local
        ? '直接雙擊開啟 index.html 的話，瀏覽器會擋住讀檔。請放到 GitHub Pages，或在資料夾裡執行 <code>python -m http.server</code> 再開 localhost:8000。'
        : '檢查一下檔名、slug 跟 data 裡的 json 有沒有對上。'
    }<br><small>${esc(err.message)}</small></div>`;
  }

  async function render() {
    const my = ++renderId;
    const { idx, slug } = parseRoute();
    setSwitch(idx);

    const dir = idx > lastIdx ? 'from-right' : idx < lastIdx ? 'from-left' : 'fade';
    lastIdx = idx;

    document.title = `${PAGES[idx].name} — Jeremy 的小角落`;

    let html;
    try {
      if (idx === 2) html = await aboutView();
      else {
        const kind = PAGES[idx].key;
        html = slug ? await detailView(kind, slug) : await listView(kind);
      }
    } catch (err) {
      html = errorView(err);
    }
    if (my !== renderId) return; // 中途又換頁了

    view.className = 'wrap';
    void view.offsetWidth;
    view.classList.add(dir);
    view.innerHTML = html;
    view.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    window.scrollTo(0, 0);
  }

  /* ---------- 標籤點擊 ---------- */

  view.addEventListener('click', e => {
    const t = e.target.closest('[data-tag]');
    if (!t) return;
    const kind = t.dataset.kind;
    activeTag[kind] = t.dataset.tag || null;
    if (t.tagName === 'BUTTON') updateList(kind);
    // 如果是 <a>，讓它照常跳回列表頁，列表會套用剛設定的標籤
  });

  // 視窗大小改變 (例如手機轉向)：旋鈕格寬會變，重新對位
  window.addEventListener('resize', () => { if (!dragging) setSwitch(current); });
  window.addEventListener('hashchange', render);
  render();
})();

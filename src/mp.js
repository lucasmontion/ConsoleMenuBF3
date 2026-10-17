// Multiplayer: server browser (Browse / Friends / History / Favorites / Search) and the filter screen.
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;
  let PAGE = 11; // rows per page; recalculated to fill the available height (see fitPage)
  const players = (sv) => (sv.slots && sv.slots[2] ? sv.slots[2].current : 0);
  const maxPlayers = (sv) => (sv.slots && sv.slots[2] ? sv.slots[2].max : 0);

  // ---------- Real player counts ----------
  // Some servers report a fake player count. Battlelog's per-server player list shows who is really
  // there, so it is looked up for the servers on screen only, cached, and rate-limited.
  const REAL_TTL = 60000, BUDGET_PER_MIN = 30, CONCURRENCY = 2;
  const realCache = new Map(); // guid -> { n, at }
  const inflight = new Set();
  const recent = [];
  let pausedUntil = 0;
  M.realPlayers = (sv) => {
    const c = sv && realCache.get(sv.guid);
    return c && Date.now() - c.at < REAL_TTL ? c.n : null;
  };
  const count = (sv) => { const r = M.realPlayers(sv); return r === null ? players(sv) : r; };
  async function ensureReal(servers, onUpdate) {
    if (Date.now() < pausedUntil) return;
    const todo = servers.filter((sv) => sv.slots && sv.guid && M.realPlayers(sv) === null && !inflight.has(sv.guid));
    if (!todo.length) return;
    let changed = false;
    const worker = async () => {
      while (todo.length) {
        const now = Date.now();
        while (recent.length && now - recent[0] > 60000) recent.shift();
        if (recent.length >= BUDGET_PER_MIN || now < pausedUntil) return;
        const sv = todo.shift();
        inflight.add(sv.guid);
        recent.push(now);
        try {
          const j = await M.json(`/bf3/servers/getPlayersOnServer/pc/${sv.guid}/`);
          if (j && Array.isArray(j.players)) {
            realCache.set(sv.guid, { n: Math.min(j.players.length, maxPlayers(sv) || j.players.length), at: Date.now() });
            changed = true;
          }
        } catch (e) {
          if (/busy/i.test(e.message)) pausedUntil = Date.now() + 120000;
        } finally {
          inflight.delete(sv.guid);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (changed && onUpdate) onUpdate();
  }

  // ---------- Ping ----------
  // Measured by the EA app through Battlelog (launcher.pingServers), like Battlelog's own list.
  // Cached 2 minutes; servers that hide their IP can't be pinged.
  const PING_TTL = 120000;
  const pingCache = new Map(); // guid -> { ms, at }
  const pinging = new Set();
  M.pingOf = (sv) => {
    const c = sv && pingCache.get(sv.guid);
    return c && Date.now() - c.at < PING_TTL ? c.ms : (sv && !sv.ip ? -1 : null);
  };
  async function ensurePing(servers, onUpdate) {
    const todo = servers.filter((sv) => sv.ip && sv.guid && M.pingOf(sv) === null && !pinging.has(sv.guid));
    if (!todo.length) return;
    todo.forEach((sv) => pinging.add(sv.guid));
    const r = await M.call('ping', { servers: todo.map((sv) => ({ key: sv.guid, ip: sv.ip })) }, 9000);
    todo.forEach((sv) => pinging.delete(sv.guid));
    const res = (r && r.results) || {};
    todo.forEach((sv) => {
      const ms = Number(res[sv.guid]);
      pingCache.set(sv.guid, { ms: res[sv.guid] == null || isNaN(ms) ? -1 : ms, at: Date.now() });
    });
    onUpdate && onUpdate();
  }
  M.ensurePing = ensurePing;
  // Five signal bars + the number, like the console. ms: number, null = measuring, -1 = unavailable.
  M.pingBars = (ms, header) => {
    const c = el('span', 'bf3m-ping' + (header ? ' bf3m-pinghead' : ''));
    const lit = header ? 5 : ms == null || ms < 0 ? 0 : ms <= 50 ? 5 : ms <= 80 ? 4 : ms <= 120 ? 3 : ms <= 180 ? 2 : 1;
    const bars = el('span', 'bf3m-bars bf3m-bars-' + lit);
    for (let i = 1; i <= 5; i++) bars.append(el('i', i <= lit ? 'bf3m-on' : ''));
    if (!header) {
      c.append(el('span', 'bf3m-ms', ms == null ? '…' : ms < 0 ? '—' : String(Math.round(ms))));
      c.title = ms == null ? 'Measuring ping…' : ms < 0 ? 'Ping not available for this server' : `${Math.round(ms)} ms`;
    }
    c.prepend(bars);
    return c;
  };

  // Join through Battlelog and show the joining screen (used by the list and Server Settings).
  M.joinServer = async (sv) => {
    if (!sv) return;
    M.sfx.select();
    if (!(await M.requireLogin())) return;
    const r = await M.call('join', { guid: sv.guid });
    if (r && r.error) return M.toast('Join failed: ' + r.error, 4000);
    M.push('joining', { server: sv });
  };

  // ---------- Filter logic ----------
  const PLAYER_OPTS = [20, 15, 10, 5];
  function passes(sv, f) {
    if (f.players && count(sv) < f.players) return false;
    if (f.modes.length && !f.modes.includes(Number(sv.mapMode))) return false;
    if (f.maps.length && !f.maps.includes(sv.map)) return false;
    if (f.presets.length && !f.presets.includes(Number(sv.preset))) return false;
    if (f.ranked === 1 && !sv.ranked) return false;
    if (f.ranked === 2 && sv.ranked) return false;
    if (f.regions.length && !f.regions.includes(Number(sv.region))) return false;
    if (!f.showFull && count(sv) >= maxPlayers(sv)) return false;
    return true;
  }
  function summary(f) {
    const many = (arr, fn) => (!arr.length ? 'Any' : arr.length === 1 ? fn(arr[0]) : 'Multiple');
    return [
      f.players ? f.players + '+' : 'Any',
      many(f.modes, (m) => D.modeShort(m)),
      many(f.maps, (m) => D.mapName(m)),
      many(f.presets, (p) => D.PRESETS[p]),
      f.ranked === 1 ? 'Yes' : f.ranked === 2 ? 'No' : 'Any',
      many(f.regions, (r) => D.REGIONS[r])
    ];
  }
  const FILTER_HEADS = ['Players', 'Mode', 'Map', 'Preset', 'Ranked', 'Region'];

  function filterBar(f) {
    const bar = el('div', 'bf3m-filterbar');
    const vals = summary(f);
    FILTER_HEADS.forEach((h, i) => {
      const c = el('div', 'bf3m-fcol bf3m-fcol-' + i);
      c.append(el('div', 'bf3m-fhead', h), el('div', 'bf3m-fval', vals[i]));
      bar.append(c);
    });
    return bar;
  }

  // ---------- Server browser ----------
  M.register('mp', () => {
    const pg = M.page('Main / Multiplayer /', 'Server Browser');
    const TABS = ['Browse', 'Friends', 'History', 'Favorites', 'Search'];
    let tab = 0, all = [], visible = [], sel = 0, page = 0, timer = null, query = '';
    const favGuids = new Set();

    const top = el('div', 'bf3m-mp-top');
    const table = el('div', 'bf3m-table bf3m-servers');
    const head = el('div', 'bf3m-thead');
    ['★', 'Name', 'Players', 'Map', 'Mode'].forEach((t) => head.append(el('span', null, t)));
    head.append(el('span', 'bf3m-rankedhead', '^'), M.pingBars(null, true));
    const rows = el('div', 'bf3m-tbody');
    table.append(head, rows);
    const pager = el('div', 'bf3m-pager');
    const pagePrev = el('span', 'bf3m-pg-arrow', '‹'), pageNum = el('span', 'bf3m-pg-num'), pageNext = el('span', 'bf3m-pg-arrow', '›');
    const countEl = el('span', 'bf3m-pg-count');
    const pgBox = el('div', 'bf3m-pg-box');
    pgBox.append(pagePrev, pageNum, pageNext);
    const legend = el('span', 'bf3m-pg-legend');
    legend.append(el('span', 'bf3m-pl-real', 'Blue'), document.createTextNode(' real players  '),
      el('span', 'bf3m-pl-listed', '00'), document.createTextNode(' server reports'));
    pager.append(legend, pgBox, countEl);
    pagePrev.addEventListener('click', () => flip(-1));
    pageNext.addEventListener('click', () => flip(1));
    const search = el('input', 'bf3m-search');
    search.placeholder = 'Type a server or map name';
    search.spellcheck = false;
    search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); sel = 0; page = 0; render(); });
    pg.body.append(top, table, pager);

    function setTab(i) {
      tab = (i + TABS.length) % TABS.length;
      M.sfx.tab();
      sel = 0; page = 0; all = [];
      pg.setTabs(TABS, tab, setTab);
      footer();
      load();
    }

    function footer() {
      const hints = [['↵', 'Server info', () => openInfo(), 'bf3m-k-a'], ['Space', 'Join', () => joinSelected(), 'bf3m-k-y'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b'],
        ['R', 'Refresh', () => load(true), 'bf3m-k-x']];
      if (tab === 0 || tab === 4) hints.push(['F', 'Show filter', () => M.push('mpfilter', { onDone: () => render() }), 'bf3m-k-y']);
      pg.setFooter(hints);
    }

    async function fetchBrowse() {
      const seen = new Map();
      for (let offset = 0; offset < 300; offset += 60) {
        const j = await M.json(`/bf3/servers/getAutoBrowseServers/?offset=${offset}&count=60`);
        const list = (j && j.data) || [];
        list.forEach((sv) => seen.set(sv.guid, sv));
        if (list.length < 60) break;
      }
      return [...seen.values()];
    }
    async function fetchList(path) {
      const j = await M.json(path, true);
      const s = j && j.context && j.context.servers;
      return Array.isArray(s) ? s : [];
    }
    async function fetchFriends() {
      const r = await M.call('friends');
      const friends = (r && r.friends) || [];
      return friends.filter((f) => f.serverGuid).map((f) => ({
        guid: f.serverGuid, name: f.serverName || 'Server', friend: f.name, map: f.map || '', mapMode: '', slots: null
      }));
    }

    // Battlelog rate-limits busy clients, so lists are cached briefly and stale loads are dropped.
    let loadSeq = 0;
    const cache = {};
    async function cached(key, maxAge, force, fetcher) {
      const c = cache[key];
      if (!force && c && Date.now() - c.at < maxAge) return c.data;
      const data = await fetcher();
      cache[key] = { at: Date.now(), data };
      return data;
    }

    async function load(force) {
      const seq = ++loadSeq;
      const forTab = tab;
      top.replaceChildren();
      if (tab === 0) top.append(filterBar(M.prefs.filters));
      if (tab === 4) { top.append(search); setTimeout(() => search.focus(), 50); }
      if (!all.length) rows.replaceChildren(el('div', 'bf3m-msg', 'Searching for servers…'));
      try {
        const favs = await cached('favs', 120000, force && tab === 3, () => fetchList('/bf3/servers/favourites/')).catch(() => []);
        favGuids.clear(); favs.forEach((s) => favGuids.add(s.guid));
        let list;
        if (forTab === 0 || forTab === 4) list = await cached('browse', 25000, force, fetchBrowse);
        else if (forTab === 1) list = await fetchFriends();
        else if (forTab === 2) list = await cached('history', 60000, force, () => fetchList('/bf3/servers/history/'));
        else list = favs;
        if (seq !== loadSeq) return;
        all = list;
        render(visible[sel] && visible[sel].guid);
      } catch (e) {
        if (seq === loadSeq) rows.replaceChildren(el('div', 'bf3m-msg', (e && e.message) || 'Could not reach Battlelog. Press R to retry.'));
      }
    }

    // As many rows as fit between the table header and the pager (taller screens show more servers).
    function fitPage() {
      const rowsTop = rows.getBoundingClientRect().top, pagerTop = pager.getBoundingClientRect().top;
      const sample = rows.querySelector('.bf3m-trow');
      const rowH = sample ? sample.offsetHeight : head.offsetHeight * 4.2 / 3.6;
      if (!rowH || pagerTop <= rowsTop) return PAGE;
      return Math.max(5, Math.min(30, Math.floor((pagerTop - rowsTop - rowH * 0.3) / rowH)));
    }

    function render(keepGuid) {
      if (tab === 0) top.replaceChildren(filterBar(M.prefs.filters));
      PAGE = fitPage();
      let list = all.slice();
      if (tab === 0) list = list.filter((sv) => passes(sv, M.prefs.filters));
      if (tab === 4) list = list.filter((sv) => !query || sv.name.toLowerCase().includes(query) || D.mapName(sv.map).toLowerCase().includes(query));
      // Real players when known, otherwise what the server reports (until it is checked).
      if (tab === 0 || tab === 4) list.sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
      visible = list;
      if (keepGuid) { const i = visible.findIndex((sv) => sv.guid === keepGuid); if (i >= 0) sel = i; }
      sel = Math.max(0, Math.min(sel, visible.length - 1));
      page = Math.floor(sel / PAGE);
      const pages = Math.max(1, Math.ceil(visible.length / PAGE));
      pageNum.textContent = `${page + 1} / ${pages}`;
      countEl.replaceChildren(document.createTextNode('Servers '), el('b', null, String(visible.length)));
      if (!visible.length) {
        const msg = tab === 1 ? 'No friends are playing right now.' : tab === 3 ? 'No favorite servers yet.' :
          tab === 2 ? 'No recently played servers.' : all.length ? 'No servers match your filter.' : 'No servers found.';
        rows.replaceChildren(el('div', 'bf3m-msg', msg));
        return;
      }
      const slice = visible.slice(page * PAGE, page * PAGE + PAGE);
      rows.replaceChildren(...slice.map((sv, k) => {
        const i = page * PAGE + k;
        const r = el('div', 'bf3m-trow' + (i === sel ? ' bf3m-sel' : ''));
        if (sv.slots && count(sv) >= maxPlayers(sv)) r.classList.add('bf3m-full');
        r.append(
          el('span', 'bf3m-star', favGuids.has(sv.guid) ? '★' : ''),
          el('span', 'bf3m-name', sv.friend ? `${sv.name}  (${sv.friend})` : sv.name),
          playersCell(sv),
          el('span', null, sv.map ? D.mapName(sv.map) : ''),
          el('span', null, sv.mapMode ? D.modeShort(sv.mapMode) : ''),
          el('span', 'bf3m-ranked', sv.ranked ? '^' : ''),
          pingCell(sv));
        r.addEventListener('mousemove', () => select(i));
        r.addEventListener('click', () => select(i));
        r.addEventListener('dblclick', () => { select(i); openInfo(); });
        return r;
      }));
      // Check the real counts of what is on screen; re-sort when they arrive (keeps the same page).
      ensureReal(slice, () => { if (M.current() && M.current().node === pg.node) render(); });
      // Ping only what's on screen (the EA app pings each server); fills in as results arrive.
      ensurePing(slice, () => { if (M.current() && M.current().node === pg.node) refreshPings(); });
    }

    function pingCell(sv) {
      const c = M.pingBars(M.pingOf(sv));
      c.dataset.guid = sv.guid;
      return c;
    }
    function refreshPings() {
      rows.querySelectorAll('.bf3m-ping[data-guid]').forEach((c) => {
        const sv = visible.find((x) => x.guid === c.dataset.guid);
        if (sv) c.replaceWith(pingCell(sv));
      });
    }

    function playersCell(sv) {
      const c = el('span', 'bf3m-pl');
      if (!sv.slots) return c;
      const real = M.realPlayers(sv), listed = players(sv), max = maxPlayers(sv);
      if (real === null) {
        c.classList.add('bf3m-pl-pending');
        c.textContent = `${listed}/${max}`;
        c.title = 'Checking real player count…';
        return c;
      }
      c.append(el('span', 'bf3m-pl-real', `${real}/${max}`));
      if (real !== listed) {
        c.append(el('span', 'bf3m-pl-listed', String(listed)));
        c.title = `Server reports ${listed}, ${real} really playing`;
      }
      return c;
    }

    function select(i) {
      if (!visible.length) return;
      i = Math.max(0, Math.min(visible.length - 1, i));
      if (i === sel) return;
      const oldPage = page;
      sel = i; M.sfx.move();
      if (Math.floor(sel / PAGE) !== oldPage) render();
      else [...rows.children].forEach((r, k) => r.classList.toggle('bf3m-sel', page * PAGE + k === sel));
    }
    function flip(d) {
      const pages = Math.max(1, Math.ceil(visible.length / PAGE));
      const np = Math.max(0, Math.min(pages - 1, page + d));
      if (np !== page) { sel = np * PAGE; M.sfx.move(); render(); }
    }

    function joinSelected() { if (visible[sel]) M.joinServer(visible[sel]); }
    function openInfo() {
      const sv = visible[sel];
      if (!sv || !sv.slots) return joinSelected();
      M.sfx.select();
      M.push('serverinfo', {
        server: sv, favorite: favGuids.has(sv.guid),
        onFavorite: (on) => { if (on) favGuids.add(sv.guid); else favGuids.delete(sv.guid); delete cache.favs; }
      });
    }

    pg.setTabs(TABS, tab, setTab);
    footer();
    window.addEventListener('resize', () => { if (M.current() && M.current().node === pg.node && visible.length) render(); });

    return {
      node: pg.node,
      onShow() {
        load();
        clearInterval(timer);
        timer = setInterval(() => { if (M.current() && M.current().node === pg.node && M.isShown() && tab !== 4) load(true); }, 60000);
      },
      onHide() { clearInterval(timer); },
      onKey(e) {
        if (e.typing) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') search.blur(); else return false;
        }
        switch (e.key) {
          case 'ArrowDown': select(sel + 1); break;
          case 'ArrowUp': select(sel - 1); break;
          case 'ArrowRight': case 'PageDown': flip(1); break;
          case 'ArrowLeft': case 'PageUp': flip(-1); break;
          case 'Enter': openInfo(); break;
          case ' ': joinSelected(); break;
          case 'r': load(true); break;
          case 'f': if (tab === 0 || tab === 4) M.push('mpfilter', { onDone: () => render() }); break;
          case 'q': setTab(tab - 1); break;
          case 'e': setTab(tab + 1); break;
          case '/': if (tab !== 4) setTab(4); else search.focus(); break;
          default: return false;
        }
        return true;
      }
    };
  });

  // ---------- Filter screen ----------
  M.register('mpfilter', () => {
    const pg = M.page('Main / Multiplayer /', 'Server Browser');
    let onDone = null;
    const f = () => M.prefs.filters;
    const toggleIn = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
    const columns = [
      { opts: PLAYER_OPTS.map((n) => [n, n + '+']), checked: (v) => f().players === v, toggle: (v) => { f().players = f().players === v ? 0 : v; } },
      { opts: Object.keys(D.MODES).map((b) => [Number(b), D.modeShort(b)]), checked: (v) => f().modes.includes(v), toggle: (v) => toggleIn(f().modes, v) },
      { opts: Object.keys(D.MAPS).map((c) => [c, `${D.mapName(c)} (${D.MAPS[c][1]})`]), checked: (v) => f().maps.includes(v), toggle: (v) => toggleIn(f().maps, v) },
      { opts: Object.keys(D.PRESETS).map((p) => [Number(p), D.PRESETS[p]]), checked: (v) => f().presets.includes(v), toggle: (v) => toggleIn(f().presets, v) },
      { opts: [[1, 'Yes'], [2, 'No']], checked: (v) => f().ranked === v, toggle: (v) => { f().ranked = f().ranked === v ? 0 : v; } },
      { opts: Object.keys(D.REGIONS).map((r) => [Number(r), D.REGIONS[r]]), checked: (v) => f().regions.includes(v), toggle: (v) => toggleIn(f().regions, v) }
    ];
    const bottom = [
      ['Include and show games where the server is full.', () => f().showFull, () => { f().showFull = !f().showFull; }]
    ];
    let col = 1, row = 0, inBottom = false;
    const grid = el('div', 'bf3m-fgrid');
    const bottomBox = el('div', 'bf3m-fbottom');
    pg.body.append(grid, bottomBox);

    // Built once; hovering and toggling only update classes and text, so the lists keep their
    // scroll position (rebuilding them reset it to the top on every mouse move).
    const CHECK_ON = '[×]', CHECK_OFF = '[  ]';
    const optNodes = [], valNodes = [], bottomNodes = [];
    columns.forEach((c, ci) => {
      const colEl = el('div', 'bf3m-fcol bf3m-fcol-' + ci);
      const val = el('div', 'bf3m-fval');
      colEl.append(el('div', 'bf3m-fhead', FILTER_HEADS[ci]), val);
      valNodes.push(val);
      const list = el('div', 'bf3m-flist');
      optNodes.push(c.opts.map(([, label], ri) => {
        const o = el('div', 'bf3m-fopt');
        o.append(el('span', 'bf3m-check'), el('span', null, label));
        o.addEventListener('mousemove', () => { if (inBottom || col !== ci || row !== ri) { inBottom = false; col = ci; row = ri; M.sfx.move(); paint(false); } });
        o.addEventListener('click', () => { inBottom = false; col = ci; row = ri; activate(); });
        list.append(o);
        return o;
      }));
      colEl.append(list);
      grid.append(colEl);
    });
    bottom.forEach(([label], i) => {
      const o = el('div', 'bf3m-fopt bf3m-fwide');
      o.append(el('span', 'bf3m-check'), el('span', 'bf3m-lower', label));
      o.addEventListener('mousemove', () => { if (!inBottom || row !== i) { inBottom = true; row = i; M.sfx.move(); paint(false); } });
      o.addEventListener('click', () => { inBottom = true; row = i; activate(); });
      bottomBox.append(o);
      bottomNodes.push(o);
    });

    function refresh() {
      const vals = summary(f());
      columns.forEach((c, ci) => {
        valNodes[ci].textContent = vals[ci];
        c.opts.forEach(([v], ri) => { optNodes[ci][ri].firstChild.textContent = c.checked(v) ? CHECK_ON : CHECK_OFF; });
      });
      bottom.forEach(([, get], i) => { bottomNodes[i].firstChild.textContent = get() ? CHECK_ON : CHECK_OFF; });
    }
    function paint(scroll) {
      let selected = null;
      optNodes.forEach((list, ci) => list.forEach((o, ri) => {
        const on = !inBottom && ci === col && ri === row;
        o.classList.toggle('bf3m-sel', on);
        if (on) selected = o;
      }));
      bottomNodes.forEach((o, i) => o.classList.toggle('bf3m-sel', inBottom && row === i));
      // Only the keyboard scrolls the list to keep the selection visible.
      if (scroll && selected) selected.scrollIntoView({ block: 'nearest' });
    }
    function render() { refresh(); paint(true); }
    function activate() {
      M.sfx.select();
      if (inBottom) bottom[row][2]();
      else { const c = columns[col]; c.toggle(c.opts[row][0]); }
      M.savePrefs();
      refresh();
      paint(false);
    }
    pg.setFooter([['↵', 'Toggle', null, 'bf3m-k-a'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      setParams(p) { onDone = p && p.onDone; },
      onShow: render,
      onHide() { onDone && onDone(); },
      onKey(e) {
        const c = columns[col];
        switch (e.key) {
          case 'ArrowDown':
            if (inBottom) { if (row < bottom.length - 1) row++; }
            else if (row < c.opts.length - 1) row++;
            else { inBottom = true; row = 0; }
            break;
          case 'ArrowUp':
            if (inBottom) { if (row > 0) row--; else { inBottom = false; row = columns[col].opts.length - 1; } }
            else if (row > 0) row--;
            break;
          case 'ArrowRight': if (!inBottom && col < columns.length - 1) { col++; row = Math.min(row, columns[col].opts.length - 1); } break;
          case 'ArrowLeft': if (!inBottom && col > 0) { col--; row = Math.min(row, columns[col].opts.length - 1); } break;
          case 'Enter': activate(); return true;
          default: return false;
        }
        M.sfx.move(); paint(true);
        return true;
      }
    };
  });
})();

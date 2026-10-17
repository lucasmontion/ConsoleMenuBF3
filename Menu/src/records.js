// Assignments (per pack, requirements + completion reward), Unlocks (upcoming unlocks per kit) and
// Game Activity (recent awards / events) — all from Battlelog, in the console style.
(() => {
  const M = BF3M, el = M.el;
  const PACKS = { 1024: 'Premium', 512: 'Back to Karkand', 2048: 'Close Quarters', 4096: 'Armored Kill', 8192: 'Aftermath', 16384: 'End Game' };

  function bar(pct) {
    const b = el('div', 'bf3m-bar');
    const f = el('div', 'bf3m-bar-fill');
    f.style.width = Math.max(0, Math.min(100, pct)) + '%';
    b.append(f);
    return b;
  }
  const msg = (container, text) => container.replaceChildren(el('div', 'bf3m-msg', text));
  const ago = (sec) => {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - (sec || 0)));
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    const d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : d + ' days ago';
  };
  function gridCols(cells) {
    if (!cells.length) return 1;
    const top0 = cells[0].offsetTop; let n = 0;
    while (n < cells.length && cells[n].offsetTop === top0) n++;
    return Math.max(1, n);
  }

  // ---------- Assignments ----------
  let missionsCache = null;
  M.register('assignments', () => {
    const pg = M.page('Main / My Soldier /', 'Assignments');
    const wrap = el('div', 'bf3m-as');
    const grid = el('div', 'bf3m-as-grid');
    const titleRow = el('div', 'bf3m-as-title');
    const title = el('span');
    const count = el('span', 'bf3m-as-count');
    titleRow.append(title, count);
    const req = el('div', 'bf3m-as-req');
    const reward = el('div', 'bf3m-as-reward');
    wrap.append(grid, titleRow, req, reward);
    pg.body.append(wrap);
    let groups = [], tab = 0, nav = null, list = [];

    function setTab(i) {
      if (!groups.length) return;
      tab = (i + groups.length) % groups.length;
      M.sfx.tab();
      render();
    }

    function render() {
      const g = groups[tab];
      pg.setTabs(groups.map((x) => PACKS[x.exp] || x.exp), tab, setTab);
      if (!g) return msg(grid, 'No assignments found.');
      list = g.missions;
      count.replaceChildren(document.createTextNode('Completed '), el('b', null, `${g.completed}/${g.count}`));
      const cells = list.map((m) => {
        const c = el('div', 'bf3m-as-card' + (m.locked ? ' bf3m-locked' : '') + (m.completed ? ' bf3m-done' : ''));
        c.append(el('div', 'bf3m-as-cardname', m.name));
        const img = el('img');
        img.src = M.img(m.locked ? `profile/bf3/assignments/${g.exp}/a00.jpg` : m.image);
        img.alt = '';
        img.onerror = () => { img.style.visibility = 'hidden'; };
        c.append(img, bar(m.completion));
        if (m.completed) c.append(el('span', 'bf3m-as-check', '✔'));
        if (m.locked) c.append(el('span', 'bf3m-as-lock', 'Locked'));
        return c;
      });
      grid.replaceChildren(...cells);
      nav = M.selectable(cells, { wrap: false, onMove: show });
      nav.set(0, true);
      show(0);
    }

    function show(i) {
      const m = list[i];
      if (!m) return;
      title.textContent = m.name;
      req.replaceChildren(el('div', 'bf3m-panelhead', 'Requirements'));
      if (m.locked) req.append(el('div', 'bf3m-as-note', 'Complete the previous assignment to unlock this one.'));
      m.criteria.forEach((c) => {
        const r = el('div', 'bf3m-statrow');
        r.append(el('span', 'bf3m-as-crit', c.text), el('b', null, `${M.fmt(Math.min(c.actual, c.needed))}/${M.fmt(c.needed)}`));
        req.append(r);
      });
      reward.replaceChildren(el('div', 'bf3m-panelhead', 'Completion reward'));
      const body = el('div', 'bf3m-as-rewardbody');
      const w = m.reward && m.reward.weapon;
      if (w) {
        const pic = el('div', 'bf3m-ld-img bf3m-as-rewardimg');
        pic.style.backgroundImage = `url("${M.itemImg(BF3M.weaponImage(w))}")`;
        const txt = el('div', 'bf3m-as-rewardtxt');
        // "Unlocks QBB-95" reads better than Battlelog's internal weapon name ("XP1 QBB95").
        const fromDesc = /^Unlocks\s+(?:the\s+)?(.+)$/i.exec(m.desc || '');
        txt.append(el('div', 'bf3m-as-rewardname', fromDesc ? fromDesc[1] : String(w.name || '').replace(/^XP\d\s+/, '')), el('div', 'bf3m-blue', w.category || 'Weapon'));
        body.append(pic, txt);
      } else body.append(el('div', 'bf3m-as-rewardtxt', m.desc || 'Reward'));
      reward.append(body, el('div', 'bf3m-as-desc', m.desc));
    }

    async function load() {
      msg(grid, 'Loading your assignments from Battlelog…');
      if (!missionsCache) {
        const r = await M.call('missions', {}, 20000);
        if (!r || r.error) return msg(grid, 'Could not load your assignments. ' + ((r && r.error) || ''));
        missionsCache = r.groups || [];
      }
      groups = missionsCache;
      tab = Math.min(tab, Math.max(0, groups.length - 1));
      render();
    }

    pg.setFooter([['Q/E', 'Switch pack', null, 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow: load,
      onKey(e) {
        if (e.key === 'q') { setTab(tab - 1); return true; }
        if (e.key === 'e') { setTab(tab + 1); return true; }
        if (!nav) return false;
        const cols = gridCols([...grid.children]);
        if (e.key === 'ArrowRight') nav.move(1);
        else if (e.key === 'ArrowLeft') nav.move(-1);
        else if (e.key === 'ArrowDown') nav.move(cols);
        else if (e.key === 'ArrowUp') nav.move(-cols);
        else return false;
        return true;
      }
    };
  });

  // ---------- Unlocks ----------
  M.register('unlocks', () => {
    const pg = M.page('Main / My Soldier /', 'Unlocks');
    const TABS = [['All', null], ['Assault', 1], ['Engineer', 2], ['Support', 32], ['Recon', 8], ['General', 64], ['Vehicles', 16]];
    const wrap = el('div', 'bf3m-ul');
    const listEl = el('div', 'bf3m-ul-list');
    const detail = el('div', 'bf3m-ul-detail');
    wrap.append(listEl, detail);
    pg.body.append(wrap);
    let all = [], tab = 0, rows = [], items = [], nav = null;

    function setTab(i) { tab = (i + TABS.length) % TABS.length; M.sfx.tab(); render(); }

    function render() {
      pg.setTabs(TABS.map((t) => t[0]), tab, setTab);
      const kit = TABS[tab][1];
      items = all.filter((u) => kit === null || u.kit === kit);
      if (!items.length) { msg(listEl, all.length ? 'Nothing coming up for this kit.' : 'No upcoming unlocks.'); detail.replaceChildren(); nav = null; return; }
      rows = items.map((u) => {
        const r = el('div', 'bf3m-ul-row');
        const pic = el('div', 'bf3m-ld-img bf3m-ul-img');
        if (u.img && u.img !== 'none') pic.style.backgroundImage = u.img; else pic.classList.add('bf3m-empty');
        const mid = el('div', 'bf3m-ul-mid');
        const head = el('div', 'bf3m-ul-head');
        head.append(el('span', null, u.name), el('span', 'bf3m-blue', u.percent + '%'));
        mid.append(head, bar(u.percent), el('div', 'bf3m-ul-desc', u.needed ? `${M.fmt(u.actual)}/${M.fmt(u.needed)}  ·  ${u.desc}` : u.desc));
        r.append(pic, mid);
        return r;
      });
      listEl.replaceChildren(...rows);
      nav = M.selectable(rows, { wrap: false, onMove: show });
      nav.set(0, true);
      show(0);
    }

    function show(i) {
      const u = items[i];
      if (!u) return;
      const pic = el('div', 'bf3m-ld-bigimg');
      if (u.img && u.img !== 'none') pic.style.backgroundImage = u.img;
      const kitName = (TABS.find((t) => t[1] === u.kit) || ['General'])[0];
      detail.replaceChildren(el('div', 'bf3m-panelhead', kitName), pic, el('div', 'bf3m-ld-bigname', u.name),
        el('div', 'bf3m-ul-desc', u.desc), bar(u.percent),
        el('div', 'bf3m-ul-progress', u.needed ? `${M.fmt(u.actual)} / ${M.fmt(u.needed)}  (${u.percent}%)` : `${u.percent}% done`));
    }

    async function load() {
      msg(listEl, 'Loading your unlocks from Battlelog…');
      try { all = await M.soldierData.unlocksList(); render(); }
      catch (e) { msg(listEl, 'Could not load your unlocks. ' + e.message); }
    }

    pg.setFooter([['Q/E', 'Switch kit', null, 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow() { tab = 0; load(); },
      onKey(e) {
        if (e.key === 'q') { setTab(tab - 1); return true; }
        if (e.key === 'e') { setTab(tab + 1); return true; }
        if (!nav) return false;
        if (e.key === 'ArrowDown') nav.move(1);
        else if (e.key === 'ArrowUp') nav.move(-1);
        else return false;
        return true;
      }
    };
  });

  // ---------- Game Activity ----------
  const EVENT_LABEL = { BF3AWARDS: 'Received awards', BF3RANKUP: 'Ranked up', BF3ASSIGNMENTS: 'Completed an assignment', BF3GAMEREPORT: 'Played a round', BF3DOGTAGS: 'New dog tags' };
  function awardImg(it) {
    const folder = it.kind === 2048 ? 'ribbons' : 'medals';
    return M.img(`profile/bf3/stats/${folder}/m/${it.image}.png`);
  }
  M.register('activity', () => {
    const pg = M.page('Main / My Soldier /', 'Game Activity');
    const wrap = el('div', 'bf3m-ga');
    const listEl = el('div', 'bf3m-ga-list');
    wrap.append(listEl);
    pg.body.append(wrap);
    let nav = null;

    async function load() {
      msg(listEl, 'Loading your activity from Battlelog…');
      const r = await M.call('activity', {}, 15000);
      if (!r || r.error) return msg(listEl, 'Could not load your activity. ' + ((r && r.error) || ''));
      const events = r.events || [];
      if (!events.length) return msg(listEl, 'No recent activity.');
      const rows = events.map((ev) => {
        const row = el('div', 'bf3m-ga-row');
        const head = el('div', 'bf3m-ga-head');
        head.append(el('span', null, EVENT_LABEL[ev.type] || ev.type.replace(/^BF3/, '')), el('span', 'bf3m-ga-time', ago(ev.time)));
        row.append(head);
        if (ev.items.length) {
          const items = el('div', 'bf3m-ga-items');
          ev.items.forEach((it) => {
            const c = el('div', 'bf3m-ga-item');
            const i = el('img');
            i.src = awardImg(it); i.alt = '';
            // Weapon/vehicle service stars have no award picture; use Battlelog's service star icon.
            i.onerror = () => {
              if (/service star/i.test(it.name) && !i.dataset.fallback) { i.dataset.fallback = '1'; i.src = 'https://d34ymitoc1pg7m.cloudfront.net/bf3/stats/servicestars/servicestar-31x31-75f64728.png'; }
              else i.remove();
            };
            const t = el('div', 'bf3m-ga-itemtxt');
            t.append(el('div', 'bf3m-ga-itemname', it.name), el('div', 'bf3m-ga-itemdesc', it.desc));
            c.append(i, t);
            items.append(c);
          });
          row.append(items);
        } else {
          const info = Object.entries(ev.info).filter(([k]) => !/id$/i.test(k)).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join('  ·  ');
          if (info) row.append(el('div', 'bf3m-ga-itemdesc', info));
        }
        return row;
      });
      listEl.replaceChildren(...rows);
      nav = M.selectable(rows, { wrap: false });
      nav.set(0, true);
    }

    pg.setFooter([['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow: load,
      onKey(e) {
        if (!nav) return false;
        if (e.key === 'ArrowDown') nav.move(1);
        else if (e.key === 'ArrowUp') nav.move(-1);
        else return false;
        return true;
      }
    };
  });
})();

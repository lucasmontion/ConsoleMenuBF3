// My Soldier hub, Multiplayer Stats (Stats / Ribbons / Medals) and Multiplayer Progression (Kits / Vehicles).
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;

  // ---------- Data ----------
  // Successful answers are kept for the page's lifetime; failed ones are forgotten so the next visit retries.
  const cache = {};
  function once(key, load) {
    if (!cache[key]) cache[key] = load().catch((e) => { delete cache[key]; throw e; });
    return cache[key];
  }
  M.soldierData = {
    overview: () => once('overview', () => M.json(`/bf3/overviewPopulateStats/${M.state.persona.id}/None/1/`).then((j) => j.data)),
    unlocksList: async () => scrapeUnlocks(await M.soldierData.unlocksDoc()),
    vehicles: () => once('vehicles', () => M.json(`/bf3/vehiclesPopulateStats/${M.state.persona.id}/1/`).then((j) => j.data.mainVehicleStats || [])),
    async awardsDoc() {
      return M.loadFrame('awards', M.soldierPath('awards'), (doc) => doc.querySelector('.base-item-ribbon-small'));
    },
    async dogtagsDoc() {
      return M.loadFrame('dogtags', M.soldierPath('dogtags'), (doc) => doc.querySelectorAll('svg[width="320"] image').length >= 2);
    },
    async unlocksDoc() {
      return M.loadFrame('unlocks', M.soldierPath('unlocks'), (doc) => doc.querySelector('tr.leaderboard-venice-specific-row'));
    }
  };


  function scrapeAwards(doc, kind) {
    const seen = new Set();
    const out = [];
    doc.querySelectorAll('.base-item-' + kind + '-small').forEach((icon) => {
      const item = icon.parentElement;
      const tip = (item.dataset.tooltip || '').split(/<br\s*\/?>/i).map((s) => s.replace(/<[^>]+>/g, '').trim());
      if (!tip[0] || seen.has(tip[0])) return;
      seen.add(tip[0]);
      const cs = doc.defaultView.getComputedStyle(icon);
      const cnt = item.textContent.match(/x\s*(\d+)/);
      const prog = (tip[2] || '').match(/([\d,]+)\s*\/\s*([\d,]+)/);
      const taken = !item.classList.contains('nottaken');
      out.push({
        name: tip[0], desc: tip[1] || '',
        progress: prog ? [Number(prog[1].replace(/,/g, '')), Number(prog[2].replace(/,/g, ''))] : null,
        taken, count: cnt ? Number(cnt[1]) : taken ? 1 : 0,
        bg: cs.backgroundImage, pos: cs.backgroundPosition,
        w: icon.offsetWidth || (kind === 'ribbon' ? 75 : 52), h: icon.offsetHeight || (kind === 'ribbon' ? 28 : 52)
      });
    });
    return out;
  }

  function scrapeUnlocks(doc) {
    return [...doc.querySelectorAll('tr.leaderboard-venice-specific-row')].map((tr) => {
      const kitM = tr.className.match(/filterByKit_(\d+)/);
      const text = tr.textContent.replace(/\s+/g, ' ').trim();
      const pct = text.match(/^(\d+)\s*%\s*/);
      const rest = pct ? text.slice(pct[0].length) : text;
      const prog = rest.match(/([\d,]+)\s*\/\s*([\d,]+)\s*,?\s*(.*)$/);
      const name = prog ? rest.slice(0, prog.index).trim() : rest.replace(/Complete assignment.*/i, '').trim();
      const desc = prog ? prog[3] : (rest.match(/Complete assignment.*/i) || [''])[0];
      const imgs = [...tr.querySelectorAll('*')].map((x) => doc.defaultView.getComputedStyle(x).backgroundImage)
        .concat([...tr.querySelectorAll('img')].map((i) => `url("${i.src}")`)).filter((b) => /items_|weapons|gadget|spec/i.test(b));
      return {
        kit: kitM ? Number(kitM[1]) : 0, percent: pct ? Number(pct[1]) : 0, name, desc,
        actual: prog ? Number(prog[1].replace(/,/g, '')) : null, needed: prog ? Number(prog[2].replace(/,/g, '')) : null,
        img: imgs[0] || null
      };
    });
  }

  function bar(pct) {
    const b = el('div', 'bf3m-bar');
    const f = el('div', 'bf3m-bar-fill');
    f.style.width = Math.max(0, Math.min(100, pct)) + '%';
    b.append(f);
    return b;
  }
  function statRows(rows) {
    const box = el('div', 'bf3m-statbox');
    rows.forEach(([k, v]) => {
      const r = el('div', 'bf3m-statrow');
      r.append(el('span', null, k), el('b', null, v));
      box.append(r);
    });
    return box;
  }
  function loadingMsg(container, text) { container.replaceChildren(el('div', 'bf3m-msg', text || 'Loading from Battlelog…')); }
  function errorMsg(container, err) { container.replaceChildren(el('div', 'bf3m-msg', 'Could not load this from Battlelog. ' + (err && err.message ? err.message : ''))); }

  // ---------- My Soldier hub ----------
  M.register('soldier', () => {
    const pg = M.page('Main /', 'My Soldier');
    const left = el('div', 'bf3m-hub');
    const sections = [
      ['Multiplayer', [
        ['Stats', () => M.push('stats')],
        ['My Progression', () => M.push('progression')],
        ['Customize', () => M.push('customize')],
        ['My Dog Tag', () => M.push('dogtags')],
        ['Assignments', () => M.push('assignments')],
        ['Unlocks', () => M.push('unlocks')],
        ['Game Activity', () => M.push('activity')]
      ]],
      ['Co-op', [
        ['Stats & Progression', () => M.goBattlelog(`/bf3/coop/${M.state.persona.id}/${encodeURIComponent(M.state.persona.name)}/`)]
      ]]
    ];
    const items = [], acts = [];
    sections.forEach(([title, entries]) => {
      left.append(el('div', 'bf3m-hub-section', title));
      entries.forEach(([label, act]) => {
        const it = el('div', 'bf3m-hub-item', label);
        left.append(it); items.push(it); acts.push(act);
      });
    });
    const tags = el('div', 'bf3m-dogtags');
    const tagA = el('div', 'bf3m-dogtag'), tagB = el('div', 'bf3m-dogtag bf3m-dogtag-b');
    tags.append(tagA, tagB);
    pg.body.append(left, tags);
    const list = M.selectable(items, { onActivate: (i) => { M.sfx.select(); acts[i](); } });
    pg.setFooter([M.HINT_SELECT, ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow() {
        const p = M.state.persona;
        // Already showing the real tags: just swap in whatever was equipped since (Dog Tag screen).
        if (tags.dataset.real) { M.applyEquippedTags(tags.querySelectorAll('svg')); return; }
        tagA.replaceChildren(el('span', 'bf3m-tag-hole'), el('span', 'bf3m-tag-name', p ? p.name : ''));
        tagB.replaceChildren(el('span', 'bf3m-tag-hole'), el('span', 'bf3m-tag-big', 'BF3'));
        M.soldierData.overview().then((d) => {
          const r = d.overviewStats.rank;
          tagA.append(el('span', 'bf3m-tag-rank', D.rankName(r)));
        }).catch(() => {});
        // Swap in the player's real dog tags (Battlelog draws them as SVG) when available.
        M.soldierData.dogtagsDoc().then((doc) => {
          const svgs = [...doc.querySelectorAll('svg[width="320"]')].slice(0, 2);
          if (svgs.length < 2) return;
          tags.dataset.real = '1';
          tags.classList.add('bf3m-dogtags-real');
          tags.replaceChildren(...svgs.map((s, i) => {
            const w = el('div', 'bf3m-realtag bf3m-realtag-' + i);
            w.append(document.importNode(s, true));
            return w;
          }));
          M.applyEquippedTags(tags.querySelectorAll('svg'));
        }).catch(() => {});
      },
      onKey(e) {
        if (e.key === 'ArrowDown') list.move(1);
        else if (e.key === 'ArrowUp') list.move(-1);
        else if (e.key === 'Enter') list.activate();
        else return false;
        return true;
      }
    };
  });

  // ---------- Multiplayer Stats ----------
  M.register('stats', () => {
    const pg = M.page('Main / My Soldier /', 'Multiplayer Stats');
    const TABS = ['Stats', 'Ribbons', 'Medals'];
    let tab = 0, grid = null;

    function setTab(i) {
      tab = (i + TABS.length) % TABS.length;
      M.sfx.tab();
      pg.setTitle('Multiplayer ' + TABS[tab]);
      pg.setTabs(TABS, tab, setTab);
      render();
    }

    async function renderStats() {
      loadingMsg(pg.body);
      try {
        const [d, vehicles] = await Promise.all([M.soldierData.overview(), M.soldierData.vehicles()]);
        if (tab !== 0) return;
        const o = d.overviewStats;
        const cur = d.currentRankNeeded || { pointsNeeded: 0 }, next = d.rankNeeded || { pointsNeeded: o.rankScore || 1 };
        const span = Math.max(1, next.pointsNeeded - cur.pointsNeeded);
        const pct = ((o.rankScore - cur.pointsNeeded) / span) * 100;

        const rankBox = el('div', 'bf3m-rankbox');
        const rb = el('div', 'bf3m-rankbar');
        rb.append(bar(pct));
        const info = el('div', 'bf3m-rankinfo');
        const who = el('div');
        who.append(el('div', 'bf3m-rank-name', M.state.persona.name), el('div', 'bf3m-blue', D.rankName(o.rank)));
        const pts = el('div', 'bf3m-rank-pts');
        pts.append(el('span', 'bf3m-blue', M.fmt(o.rankScore)), document.createTextNode('/' + M.fmt(next.pointsNeeded)));
        info.append(who, pts);
        rb.append(info);
        const badge = el('div', 'bf3m-rankbadge');
        badge.append(el('div', 'bf3m-rank-num', String(o.rank).padStart(2, '0')));
        const rimg = el('img', 'bf3m-rank-img');
        rimg.alt = '';
        rimg.src = BF3M.rankImg(o.rank, 'large');
        badge.append(rimg);
        rankBox.append(rb, badge);

        const best = d.topStats && d.topStats[0];
        const bestVeh = vehicles.slice().sort((a, b) => b.kills - a.kills)[0];
        const bestBox = (title, item, name, picture) => {
          const b = el('div', 'bf3m-bestbox');
          b.append(el('div', 'bf3m-panelhead', title));
          const frame = el('div', 'bf3m-bestimg');
          if (item) {
            const i = el('img');
            i.src = M.itemImg(picture || item.slug);
            i.onerror = () => i.remove();
            frame.append(i, el('div', 'bf3m-bestname', name));
          }
          b.append(frame);
          return b;
        };
        const kpm = o.timePlayed ? o.kills / (o.timePlayed / 60) : 0;
        const cols = el('div', 'bf3m-statcols');
        const c1 = el('div'), c2 = el('div'), c3 = el('div');
        c1.append(bestBox('Best weapon', best, best ? `${best.name}  ·  ${M.fmt(best.kills)} kills` : '', BF3M.weaponImage(best)),
          el('div', 'bf3m-sublabel', 'Kills'),
          statRows([['Kills', M.fmt(o.kills)], ['Deaths', M.fmt(o.deaths)], ['K/D ratio', M.fmt2(o.deaths ? o.kills / o.deaths : o.kills)], ['Kills per minute', M.fmt2(kpm)]]));
        c2.append(bestBox('Best vehicle', bestVeh, bestVeh ? `${BF3M.vehicleName(bestVeh)}  ·  ${M.fmt(bestVeh.kills)} kills` : '', BF3M.vehicleImage(bestVeh)),
          el('div', 'bf3m-sublabel', 'Kills'),
          statRows([['Highest streak', M.fmt(o.killStreakBonus)], ['Highest nemesis streak', M.fmt(o.nemesisStreak)], ['Dog tags taken', M.fmt(o.dogtagsTaken)], ['Longest headshot', M.fmt(o.longestHeadshot) + ' m']]));
        c3.append(el('div', 'bf3m-spacer'),
          statRows([['Total play time', M.duration(o.timePlayed)], ['Award score', M.fmt(o.sc_award)], ['Total score', M.fmt(o.totalScore || o.score)], ['Score per minute', M.fmt(o.scorePerMinute)]]));
        cols.append(c1, c2, c3);
        pg.body.replaceChildren(rankBox, cols);
      } catch (e) { errorMsg(pg.body, e); }
    }

    async function renderAwards(kind) {
      loadingMsg(pg.body);
      try {
        const doc = await M.soldierData.awardsDoc();
        if (TABS[tab].toLowerCase() !== kind + 's') return;
        const awards = scrapeAwards(doc, kind);
        const wrap = el('div', 'bf3m-awards bf3m-awards-' + kind);
        const gridEl = el('div', 'bf3m-awardgrid');
        const detail = el('div', 'bf3m-awarddetail');
        const preview = el('div', 'bf3m-awardpreview');
        wrap.append(gridEl, detail, preview);
        const cells = awards.map((a) => {
          const c = el('div', 'bf3m-awardcell' + (a.taken ? '' : ' bf3m-nottaken'));
          const ic = el('div', 'bf3m-awardicon');
          Object.assign(ic.style, { backgroundImage: a.bg, backgroundPosition: a.pos, width: a.w + 'px', height: a.h + 'px' });
          c.append(ic);
          if (a.count > 1) c.append(el('span', 'bf3m-awardcount', 'x' + a.count));
          gridEl.append(c);
          return c;
        });
        const show = (i) => {
          const a = awards[i];
          if (!a) return;
          detail.replaceChildren(el('div', 'bf3m-award-name', a.name),
            el('div', 'bf3m-award-taken', 'Times taken: ' + a.count), el('div', 'bf3m-award-desc', a.desc));
          preview.replaceChildren();
          const big = el('div', 'bf3m-awardicon bf3m-award-big' + (a.taken ? '' : ' bf3m-nottaken'));
          Object.assign(big.style, { backgroundImage: a.bg, backgroundPosition: a.pos, width: a.w + 'px', height: a.h + 'px' });
          preview.append(big);
          if (a.progress) {
            const p = el('div', 'bf3m-award-progress');
            const head = el('div', 'bf3m-award-progress-head');
            head.append(el('span', null, 'Progress'), el('span', 'bf3m-blue', `${M.fmt(a.progress[0])}/${M.fmt(a.progress[1])}`));
            p.append(head, bar(a.progress[0] / a.progress[1] * 100));
            preview.append(p);
          }
        };
        if (!awards.length) return pg.body.replaceChildren(el('div', 'bf3m-msg', 'No ' + kind + 's found on Battlelog.'));
        pg.body.replaceChildren(wrap);
        // columns per row depends on width; compute from layout for up/down
        grid = M.selectable(cells, { onMove: show, wrap: false });
        grid.cols = () => {
          const top0 = cells[0].offsetTop;
          let n = 0; while (n < cells.length && cells[n].offsetTop === top0) n++;
          return Math.max(1, n);
        };
        show(0);
      } catch (e) { errorMsg(pg.body, e); }
    }

    function render() {
      grid = null;
      if (tab === 0) renderStats();
      else renderAwards(tab === 1 ? 'ribbon' : 'medal');
    }

    pg.setTabs(TABS, tab, setTab);
    pg.setFooter([['Q/E', 'Switch tab', null, 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow() { tab = 0; pg.setTitle('Multiplayer Stats'); pg.setTabs(TABS, tab, setTab); render(); },
      onKey(e) {
        if (e.key === 'q') { setTab(tab - 1); return true; }
        if (e.key === 'e') { setTab(tab + 1); return true; }
        if (!grid) return false;
        if (e.key === 'ArrowRight') grid.move(1);
        else if (e.key === 'ArrowLeft') grid.move(-1);
        else if (e.key === 'ArrowDown') grid.move(grid.cols());
        else if (e.key === 'ArrowUp') grid.move(-grid.cols());
        else return false;
        return true;
      }
    };
  });

  // ---------- Multiplayer Progression ----------
  M.register('progression', () => {
    const pg = M.page('Main / My Soldier /', 'Multiplayer Progression');
    const TABS = ['Kits', 'Vehicles'];
    let tab = 0;

    function setTab(i) {
      tab = (i + TABS.length) % TABS.length;
      M.sfx.tab();
      pg.setTabs(TABS, tab, setTab);
      render();
    }

    function vehicleIcon(category) {
      const span = el('span', 'bf3m-kitsvg');
      span.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${BF3M.VEHICLE_TYPE_SVG[BF3M.vehicleType(category)]}</svg>`;
      return span;
    }

    function progRow(icon, label, chip, actual, needed, next, percent) {
      const row = el('div', 'bf3m-progrow');
      const ic = el('div', 'bf3m-progicon');
      if (icon instanceof Node) ic.append(icon);
      else if (icon) { const i = el('img'); i.src = icon; i.onerror = () => i.remove(); ic.append(i); ic.classList.add('bf3m-progicon-rank'); }
      const mid = el('div', 'bf3m-progmid');
      if (chip != null) mid.append(el('span', 'bf3m-chip', chip));
      mid.append(bar(needed ? actual / needed * 100 : 100));
      const lab = el('div', 'bf3m-proglabel');
      const nums = el('span');
      if (percent) nums.append(el('span', 'bf3m-blue', Math.round(actual) + '%'));
      else if (needed) nums.append(el('span', 'bf3m-blue', M.fmt(actual)), document.createTextNode('/' + M.fmt(needed)));
      else nums.textContent = actual != null ? M.fmt(actual) : '';
      lab.append(el('span', null, label), nums);
      mid.append(lab);
      const nx = el('div', 'bf3m-prognext');
      const nimg = el('div', 'bf3m-prognext-img');
      if (next && next.img) nimg.style.backgroundImage = next.img;
      else nimg.classList.add('bf3m-empty');
      if (next && next.rank) nimg.classList.add('bf3m-prognext-rank');
      const ntxt = el('div', 'bf3m-prognext-txt');
      if (next) ntxt.append(el('div', 'bf3m-blue', next.desc || ''), el('div', null, next.name));
      else ntxt.append(el('div', 'bf3m-blue', ''), el('div', null, 'All unlocked'));
      nx.append(nimg, ntxt);
      row.append(ic, mid, nx);
      return row;
    }

    async function renderKits() {
      loadingMsg(pg.body);
      try {
        const d = await M.soldierData.overview();
        let unlocks = [];
        try { unlocks = scrapeUnlocks(await M.soldierData.unlocksDoc()); } catch (e) {}
        if (tab !== 0) return;
        const o = d.overviewStats;
        const box = el('div', 'bf3m-progress');
        const heads = el('div', 'bf3m-proghead');
        heads.append(el('span', null, 'Kits'), el('span', null, 'Next item'));
        box.append(heads);
        D.KITS.forEach((k) => {
          const score = Number((o.kitScores || {})[k.id] || 0);
          const kitRows = unlocks.filter((u) => u.kit === k.id);
          const next = kitRows.find((u) => /score/i.test(u.desc)) || kitRows[0] || null;
          const stars = (o.serviceStars || {})[k.id] || 0;
          box.append(progRow(M.kitIcon(k.icon), k.name, stars ? '★ ' + stars : null,
            next && next.needed ? next.actual : score, next && next.needed ? next.needed : 0, next));
        });
        const cur = d.currentRankNeeded || { pointsNeeded: 0 }, nextRank = d.rankNeeded || { pointsNeeded: o.rankScore };
        const rh = el('div', 'bf3m-proghead');
        rh.append(el('span', null, 'Rank'), el('span', null, 'Next rank'));
        const nextImg = BF3M.rankImg(o.rank + 1, 'medium');
        box.append(rh, progRow(BF3M.rankImg(o.rank, 'medium'), D.rankName(o.rank), String(o.rank), o.rankScore - cur.pointsNeeded,
          Math.max(1, nextRank.pointsNeeded - cur.pointsNeeded),
          { name: D.rankName(o.rank + 1), desc: M.fmt(nextRank.pointsNeeded) + ' score', img: nextImg ? `url("${nextImg}")` : null, rank: true }));
        pg.body.replaceChildren(box);
      } catch (e) { errorMsg(pg.body, e); }
    }

    async function renderVehicles() {
      loadingMsg(pg.body);
      try {
        const vehicles = await M.soldierData.vehicles();
        let unlocks = [];
        try { unlocks = scrapeUnlocks(await M.soldierData.unlocksDoc()).filter((u) => u.kit === 16); } catch (e) {}
        if (tab !== 1) return;
        const groups = new Map();
        vehicles.forEach((v) => {
          const g = groups.get(v.category) || { kills: 0, time: 0, stars: 0, progress: 0, top: v };
          g.kills += v.kills || 0; g.time += v.timeIn || 0;
          if ((v.serviceStars || 0) > g.stars) g.stars = v.serviceStars;
          g.progress = Math.max(g.progress, v.serviceStarsProgress || 0);
          if ((v.kills || 0) > (g.top.kills || 0)) g.top = v;
          groups.set(v.category, g);
        });
        const box = el('div', 'bf3m-progress');
        const heads = el('div', 'bf3m-proghead');
        heads.append(el('span', null, 'Vehicles'), el('span', null, 'Most used'));
        box.append(heads);
        [...groups.entries()].sort((a, b) => b[1].kills - a[1].kills).forEach(([cat, g]) => {
          const label = cat.replace(/^Vehicle /, '');
          const next = unlocks.find((u) => label.toLowerCase().split(' ').some((w) => w.length > 3 && u.desc.toLowerCase().includes(w)));
          box.append(progRow(vehicleIcon(cat), `${label}  ·  ${M.fmt(g.kills)} kills  ·  ${M.duration(g.time)}`, g.stars ? '★ ' + g.stars : null,
            g.progress, 100, next || { name: BF3M.vehicleName(g.top), desc: M.fmt(g.top.kills) + ' kills', img: `url("${M.itemImg(BF3M.vehicleImage(g.top))}")` }, true));
        });
        pg.body.replaceChildren(box);
      } catch (e) { errorMsg(pg.body, e); }
    }

    function render() { if (tab === 0) renderKits(); else renderVehicles(); }
    pg.setTabs(TABS, tab, setTab);
    pg.setFooter([['Q/E', 'Switch tab', null, 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow() { tab = 0; pg.setTabs(TABS, tab, setTab); render(); },
      onKey(e) {
        if (e.key === 'q') { setTab(tab - 1); return true; }
        if (e.key === 'e') { setTab(tab + 1); return true; }
        return false;
      }
    };
  });
})();

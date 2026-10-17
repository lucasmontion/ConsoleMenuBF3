// My Dog Tag: console-style dog tag grid (Left tag = basic, Right tag = advanced), details
// (times taken, last taken, victim) and equipping, saved through Battlelog's own "Save Dog Tags" form.
(() => {
  const M = BF3M, el = M.el;
  const EDITOR = 'dogtageditor';
  const SIDES = [{ side: '1', cls: 'basic', label: 'Left tag' }, { side: '2', cls: 'advanced', label: 'Right tag' }];

  // ---------- Data from Battlelog's pages ----------
  function editorPath() { return `/bf3/user/createdogtag/${M.state.persona.id}/1/`; }
  function editorDoc(fresh) {
    return M.loadFrame(EDITOR, editorPath(), (d) => d.querySelector('form input[name=basic]') && d.querySelector('li.profile-dogtags-dogtag'), fresh);
  }

  const lines = (html) => String(html || '').split(/<br\s*\/?>/i).map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);

  function scrapeStats(doc) {
    // Every BF3 dog tag (locked ones included) with times taken and last victim.
    return [...doc.querySelectorAll('.profile-stats-dogtags > li.dogtag-item')].map((li) => {
      const tipEl = li.querySelector('[data-tooltip]');
      const html = tipEl ? tipEl.dataset.tooltip : '';
      const tip = lines(html);
      const name = (li.querySelector('.dogtag-name') || {}).textContent || tip[0] || '';
      const timesLine = tip.find((t) => /^Times taken/i.test(t)) || '';
      const lastLine = tip.find((t) => /^Last taken/i.test(t)) || '';
      // "Last taken from <a>Victim</a> about 3 weeks ago." -> victim from the link, the rest is when.
      // (the victim is sometimes a link, sometimes plain text)
      const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
      const link = parsed.querySelector('a');
      const rest = lastLine.replace(/^Last taken from\s*/i, '').replace(/\.$/, '').trim();
      const m = rest.match(/^(.+?)\s+((?:about|less than|over|almost|\d+)\b.*)$/i);
      const victim = link ? link.textContent.trim() : m ? m[1] : rest;
      const when = m ? m[2] : rest.replace(victim, '').trim();
      const desc = tip.slice(1).filter((t) => t !== timesLine && t !== lastLine && t !== victim && t !== when && !/^(about|less than|over|almost)\b.*ago\.?$/i.test(t)).join(' ');
      const img = li.querySelector('img');
      return {
        name: name.trim(), key: name.trim().toUpperCase(), desc,
        side: li.classList.contains('advanced') ? '2' : '1',
        unlocked: li.classList.contains('unlocked'),
        times: Number((timesLine.match(/(\d+)/) || [0, 0])[1]),
        victim, when, img: img ? img.src : ''
      };
    });
  }

  function scrapeEditor(doc) {
    const form = [...doc.forms].find((f) => f.querySelector('input[name=basic]'));
    const items = new Map();
    doc.querySelectorAll('li.profile-dogtags-dogtag').forEach((li) => {
      items.set(li.dataset.side + ':' + String(li.dataset.tooltip || '').trim().toUpperCase(), {
        side: li.dataset.side, index: li.dataset.index, image: li.dataset.image ? location.protocol + li.dataset.image.replace(/^https?:/, '') : ''
      });
    });
    return { form, items, basic: form ? form.basic.value : null, advanced: form ? form.advanced.value : null };
  }

  // ---------- Screen ----------
  M.register('dogtags', () => {
    const pg = M.page('Main / My Soldier /', 'My Dog Tag');
    const wrap = el('div', 'bf3m-dt');
    const grid = el('div', 'bf3m-dt-grid');
    const preview = el('div', 'bf3m-dt-preview');
    const tags = el('div', 'bf3m-dt-tags');
    const sideHints = el('div', 'bf3m-dt-sides');
    preview.append(tags, sideHints);
    const detail = el('div', 'bf3m-dt-detail');
    const total = el('div', 'bf3m-dt-total');
    wrap.append(grid, preview, detail, total);
    pg.body.append(wrap);

    let all = [], editor = null, side = 0, sel = 0, cells = [], list = [], nav = null, saving = false;
    let svgs = [null, null];

    function equippedIndex(s) { return editor ? (s === '1' ? editor.basic : editor.advanced) : null; }
    function editorItem(t) { return editor && editor.items.get(t.side + ':' + t.key); }
    function isEquipped(t) { const e = editorItem(t); return !!e && e.index === equippedIndex(t.side); }

    function sideTabs() {
      sideHints.replaceChildren();
      SIDES.forEach((s, i) => {
        const h = el('span', 'bf3m-dt-side' + (i === side ? ' bf3m-sel' : ''));
        if (i === 0) h.append(el('span', 'bf3m-bumper', 'Q'), document.createTextNode(s.label));
        else h.append(document.createTextNode(s.label), el('span', 'bf3m-bumper', 'E'));
        h.addEventListener('click', () => setSide(i));
        sideHints.append(h);
      });
    }
    function setSide(i) {
      if (i === side) return;
      side = i; sel = 0; M.sfx.tab();
      render();
    }

    function render() {
      sideTabs();
      list = all.filter((t) => t.side === SIDES[side].side);
      // Equipped first, then unlocked, then locked (Battlelog's order inside each group).
      list.sort((a, b) => (isEquipped(b) - isEquipped(a)) || (b.unlocked - a.unlocked));
      grid.replaceChildren();
      cells = list.map((t) => {
        const c = el('div', 'bf3m-dt-cell' + (t.unlocked ? '' : ' bf3m-locked') + (isEquipped(t) ? ' bf3m-equipped' : ''));
        const i = el('img');
        i.src = t.img; i.alt = ''; i.loading = 'lazy';
        c.append(i);
        if (isEquipped(t)) c.append(el('span', 'bf3m-dt-check', '✔'));
        grid.append(c);
        return c;
      });
      nav = M.selectable(cells, { start: sel, wrap: false, onMove: (i) => { sel = i; showDetail(); }, onActivate: (i) => { sel = i; equip(); } });
      nav.cols = () => { if (!cells.length) return 1; const top0 = cells[0].offsetTop; let n = 0; while (n < cells.length && cells[n].offsetTop === top0) n++; return Math.max(1, n); };
      nav.set(Math.min(sel, cells.length - 1), true);
      showDetail();
      paintTags();
    }

    function showDetail() {
      const t = list[sel];
      if (!t) { detail.replaceChildren(); return; }
      const status = isEquipped(t) ? 'Equipped' : t.unlocked ? 'Unlocked' : 'Locked';
      const rows = el('div', 'bf3m-dt-rows');
      [['Times taken', String(t.times)], ['Last taken', t.when || 'Not taken yet'], ['Victim', t.victim || 'Not taken yet']]
        .forEach(([k, v]) => { const r = el('div', 'bf3m-statrow'); r.append(el('span', null, k), el('b', null, v)); rows.append(r); });
      detail.replaceChildren(el('div', 'bf3m-dt-name', t.name), el('div', 'bf3m-dt-desc', t.desc),
        el('div', 'bf3m-dt-status bf3m-dt-' + status.toLowerCase(), status), rows);
      pg.setFooter([
        ['↵', t.unlocked && !isEquipped(t) ? 'Equip on ' + SIDES[side].label.toLowerCase() : 'Select', () => equip(), 'bf3m-k-a'],
        ['Q/E', 'Left / right tag', null, 'bf3m-k-x'],
        ['Esc', 'Back', () => M.back(), 'bf3m-k-b']
      ]);
    }

    // The two big tags: Battlelog's own SVGs (they draw your name/clan tag), with the picture swapped
    // for the equipped tag of each side.
    function paintTags() {
      if (!editor) return;
      // Record what's equipped so other screens (My Soldier) show the same tags, then draw them here.
      SIDES.forEach((s, i) => {
        const eq = [...editor.items.values()].find((e) => e.side === s.side && e.index === equippedIndex(s.side));
        if (eq && eq.image) M.equippedTags[i] = eq.image;
      });
      M.applyEquippedTags(svgs.filter(Boolean));
    }

    async function equip() {
      const t = list[sel];
      if (!t || saving) return;
      if (!t.unlocked) { M.sfx.back(); return M.toast('This dog tag is locked. ' + (t.desc || ''), 4000); }
      if (isEquipped(t)) return;
      const item = editorItem(t);
      if (!item) return M.toast('Battlelog does not list this tag as selectable yet.', 3500);
      saving = true;
      M.sfx.select();
      M.toast('Saving dog tags…', 15000);
      try {
        const frame = document.getElementById('bf3m-frame-' + EDITOR);
        const form = editor.form;
        form.querySelector(`input[name=${t.side === '1' ? 'basic' : 'advanced'}]`).value = item.index;
        const loaded = new Promise((res) => frame.addEventListener('load', res, { once: true }));
        // Battlelog's own form (with its post-check-sum), posted exactly like its Save Dog Tags button.
        form.ownerDocument.defaultView.HTMLFormElement.prototype.submit.call(form);
        await Promise.race([loaded, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))]);
        // Battlelog answers with the editor page again; re-read it to confirm what is now saved.
        const doc = await editorDoc(true);
        editor = scrapeEditor(doc);
        if (equippedIndex(t.side) === item.index) { M.toast(`${t.name} equipped`); M.sfx.select(); }
        else M.toast('Battlelog did not save that dog tag. Try again.', 4000);
      } catch (e) {
        M.toast('Could not save dog tags: ' + e.message, 4000);
        editor = scrapeEditor(await editorDoc(true).catch(() => null) || document);
      }
      saving = false;
      render();
      // The equipped tag moves to the front; keep the highlight on it.
      const i = list.findIndex((x) => x.key === t.key);
      if (i >= 0 && nav) { sel = i; nav.set(i, true); showDetail(); }
    }

    async function load() {
      grid.replaceChildren(el('div', 'bf3m-msg', 'Loading your dog tags from Battlelog…'));
      try {
        const [statsDoc, edDoc, ov] = await Promise.all([M.soldierData.dogtagsDoc(), editorDoc(false), M.soldierData.overview().catch(() => null)]);
        all = scrapeStats(statsDoc);
        editor = scrapeEditor(edDoc);
        const found = [...statsDoc.querySelectorAll('svg[width="320"]')].slice(0, 2).map((s) => document.importNode(s, true));
        svgs = found.length === 2 ? found : [null, null];
        tags.replaceChildren(...svgs.filter(Boolean).map((s, i) => { const w = el('div', 'bf3m-realtag bf3m-realtag-' + i); w.append(s); return w; }));
        const taken = ov && ov.overviewStats ? ov.overviewStats.dogtagsTaken : all.reduce((n, t) => n + t.times, 0);
        total.replaceChildren(el('span', null, 'Total dog tags taken from victims'), el('b', null, M.fmt(taken)));
        render();
      } catch (e) {
        grid.replaceChildren(el('div', 'bf3m-msg', 'Could not load your dog tags. ' + e.message));
      }
    }

    pg.setFooter([['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return {
      node: pg.node,
      onShow() { side = 0; sel = 0; load(); },
      onKey(e) {
        if (e.key === 'q') { setSide(0); return true; }
        if (e.key === 'e') { setSide(1); return true; }
        if (!nav) return false;
        if (e.key === 'ArrowRight') nav.move(1);
        else if (e.key === 'ArrowLeft') nav.move(-1);
        else if (e.key === 'ArrowDown') nav.move(nav.cols());
        else if (e.key === 'ArrowUp') nav.move(-nav.cols());
        else if (e.key === 'Enter') equip();
        else return false;
        return true;
      }
    };
  });
})();

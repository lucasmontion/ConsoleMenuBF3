// Customize: Kits / Land / Air loadouts, read from Battlelog's loadout page and saved with its own "Apply".
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;
  const FRAME = 'loadout';

  function scrape(doc) {
    const win = doc.defaultView;
    const bgOf = (n) => (n ? win.getComputedStyle(n).backgroundImage : 'none');
    const labelOf = (w, sel) => { const l = w.querySelector(sel); return l ? l.textContent.trim() : ''; };

    function weaponAccessories(w) {
      const groups = {};
      w.querySelectorAll('.profile-stats-loadout-box-inner-secondary-box-item-wrapper[data-type="accessory"]').forEach((a) => {
        const s = a.dataset.slot;
        (groups[s] = groups[s] || []).push({
          key: a.dataset.key,
          name: labelOf(a, '.profile-stats-loadout-box-inner-secondary-box-item-label') || a.dataset.key,
          img: bgOf(a.querySelector('.profile-stats-loadout-box-inner-secondary-box-item'))
        });
      });
      return groups;
    }
    function options(selector) {
      return [...doc.querySelectorAll(selector)].map((w) => ({
        key: w.dataset.key,
        name: labelOf(w, '.profile-stats-loadout-box-selector-item-label') || w.textContent.trim().split('\n')[0],
        img: bgOf(w.querySelector('.profile-stats-loadout-box-selector-item')),
        acc: weaponAccessories(w)
      }));
    }
    const accValue = (guid, slot) => {
      const i = doc.querySelector(`.profile-stats-loadout-selected-item-accessory-key[data-parent="${guid}"][data-slot="${slot}"]`);
      return i ? i.value : '';
    };

    const kits = D.KITS.map((k) => ({
      title: k.name, icon: k.icon,
      slots: D.KIT_SLOTS.map(([slot, label]) => {
        const input = doc.querySelector(`.profile-stats-loadout-selected-item-key[data-kit="${k.id}"][data-slot="${slot}"]`);
        return {
          type: 'item', kit: k.id, slot, label, value: input ? input.value : null,
          weapon: slot === 'primary' || slot === 'secondary',
          options: options(`.profile-stats-loadout-box-selector-item-wrapper[data-kit="${k.id}"][data-slot="${slot}"]`)
        };
      }).filter((s) => s.value !== null)
    }));

    const vehicles = new Map();
    doc.querySelectorAll('.profile-stats-loadout-selected-vehicle-key').forEach((input) => {
      const kit = input.dataset.kit, slot = input.dataset.slot;
      if (!vehicles.has(kit)) vehicles.set(kit, { title: kit.replace(/^Vehicle /, ''), kitName: kit, slots: [] });
      const opts = [...doc.querySelectorAll('.profile-stats-loadout-box-selector-item-wrapper[data-type="vehicle"]')]
        .filter((w) => w.dataset.kit === kit && w.dataset.slot === slot)
        .map((w) => ({
          key: w.dataset.key,
          name: labelOf(w, '.profile-stats-loadout-box-selector-item-label') || (w.dataset.key === '0' ? 'None' : w.dataset.key),
          img: bgOf(w.querySelector('.profile-stats-loadout-box-selector-item')), acc: {}
        }));
      vehicles.get(kit).slots.push({ type: 'vehicle', kit, slot, label: D.VEHICLE_SLOTS[slot] || slot, value: input.value, options: opts });
    });
    const all = [...vehicles.values()];
    const isAir = (v) => /Air (Jet|Helicopter)/.test(v.kitName);
    return {
      kits,
      land: all.filter((v) => !isAir(v)),
      air: all.filter(isAir),
      accValue
    };
  }

  M.register('customize', () => {
    const pg = M.page('Main / My Soldier / Customize', 'Kits');
    const TABS = ['Kits', 'Land', 'Air'];
    let tab = 0, model = null, row = 0, col = 0, chooser = null, saving = false;
    const left = el('div', 'bf3m-loadout');
    const right = el('div', 'bf3m-loadout-preview');
    const modal = el('div', 'bf3m-chooser');
    pg.body.append(left, right, modal);

    const groups = () => (!model ? [] : tab === 0 ? model.kits : tab === 1 ? model.land : model.air);
    const currentOpt = (slot) => slot.options.find((o) => o.key === slot.value) || null;

    async function load(fresh) {
      left.replaceChildren(el('div', 'bf3m-msg', 'Loading your loadout from Battlelog…'));
      right.replaceChildren();
      try {
        const doc = await M.loadFrame(FRAME, M.soldierPath('loadout'),
          (d) => d.querySelector('.profile-stats-loadout-selected-item-key') && d.querySelector('#profile-stats-loadout-action-use'), fresh);
        model = scrape(doc);
        render();
      } catch (e) {
        left.replaceChildren(el('div', 'bf3m-msg', 'Could not load your loadout. ' + e.message));
      }
    }

    function imgBox(img, cls) {
      const b = el('div', cls || 'bf3m-ld-img');
      if (img && img !== 'none') b.style.backgroundImage = img;
      return b;
    }

    function render() {
      pg.setTitle(TABS[tab]);
      pg.setTabs(TABS, tab, (i) => { tab = i; row = 0; col = 0; M.sfx.tab(); render(); });
      if (!model) return;
      const gs = groups();
      row = Math.min(row, Math.max(0, gs.length - 1));
      left.replaceChildren();
      if (!gs.length) { left.append(el('div', 'bf3m-msg', 'Nothing to customize here.')); right.replaceChildren(); return; }
      gs.forEach((g, gi) => {
        const block = el('div', 'bf3m-ld-block' + (gi === row ? ' bf3m-active' : ''));
        const head = el('div', 'bf3m-ld-head');
        if (g.icon) head.append(M.kitIcon(g.icon, 'bf3m-ld-kiticon'));
        head.append(el('span', null, g.title));
        const cells = el('div', 'bf3m-ld-cells');
        g.slots.forEach((s, si) => {
          const o = currentOpt(s);
          const c = el('div', 'bf3m-ld-cell' + (gi === row && si === col ? ' bf3m-sel' : ''));
          c.append(el('div', 'bf3m-ld-name', o ? o.name : 'None'), imgBox(o && o.img));
          c.addEventListener('mousemove', () => { if (row !== gi || col !== si) { row = gi; col = si; M.sfx.move(); paintSel(false); } });
          c.addEventListener('click', () => { row = gi; col = si; open(); });
          cells.append(c);
        });
        block.append(head, cells);
        left.append(block);
      });
      paintSel(true);
    }

    // Moves the highlight without rebuilding the list (rebuilding lost the scroll position on hover).
    // Only keyboard moves scroll the selected kit/vehicle into view.
    function paintSel(scroll) {
      [...left.children].forEach((block, gi) => {
        block.classList.toggle('bf3m-active', gi === row);
        block.querySelectorAll('.bf3m-ld-cell').forEach((c, si) => c.classList.toggle('bf3m-sel', gi === row && si === col));
      });
      const active = left.children[row];
      if (scroll && active) active.scrollIntoView({ block: 'nearest' });
      preview();
    }

    function preview() {
      const g = groups()[row];
      const s = g && g.slots[col];
      right.replaceChildren();
      if (!s) return;
      const o = currentOpt(s);
      right.append(el('div', 'bf3m-ld-slotlabel', s.label), imgBox(o && o.img, 'bf3m-ld-bigimg'), el('div', 'bf3m-ld-bigname', o ? o.name : 'None'));
      if (s.weapon && o) {
        const list = el('div', 'bf3m-ld-acclist');
        Object.keys(o.acc).sort().forEach((slot) => {
          const cur = model.accValue(o.key, slot);
          const a = o.acc[slot].find((x) => x.key === cur);
          const r = el('div', 'bf3m-statrow');
          r.append(el('span', null, D.ACCESSORY_SLOTS[slot] || 'Slot ' + slot), el('b', null, a ? a.name : 'None'));
          list.append(r);
        });
        right.append(list);
      }
    }

    // ----- chooser (modal list) -----
    function openChooser(title, entries, onPick) {
      modal.replaceChildren();
      const panel = el('div', 'bf3m-chooser-panel');
      panel.append(el('div', 'bf3m-panelhead', title));
      const list = el('div', 'bf3m-chooser-list');
      const nodes = entries.map((en) => {
        const r = el('div', 'bf3m-chooser-row' + (en.current ? ' bf3m-current' : ''));
        r.append(imgBox(en.img, 'bf3m-chooser-img'), el('span', 'bf3m-chooser-name', en.name));
        if (en.sub) r.append(el('span', 'bf3m-chooser-sub', en.sub));
        else if (en.current) r.append(el('span', 'bf3m-chooser-sub', 'Equipped'));
        list.append(r);
        return r;
      });
      panel.append(list);
      modal.append(panel);
      modal.classList.add('bf3m-open');
      const start = Math.max(0, entries.findIndex((e) => e.current));
      const nav = M.selectable(nodes, { start, wrap: false, onActivate: (i) => { M.sfx.select(); onPick(entries[i], i); } });
      nav.set(start, true);
      chooser = nav;
    }
    function closeChooser() { modal.classList.remove('bf3m-open'); modal.replaceChildren(); chooser = null; }

    function open() {
      const g = groups()[row];
      const s = g && g.slots[col];
      if (!s || saving) return;
      M.sfx.select();
      const o = currentOpt(s);
      if (s.weapon && o && Object.keys(o.acc).length) {
        const entries = [{ name: s.label, sub: o.name, img: o.img, action: () => pickItem(s) }];
        Object.keys(o.acc).sort().forEach((slot) => {
          const cur = model.accValue(o.key, slot);
          const a = o.acc[slot].find((x) => x.key === cur);
          entries.push({ name: D.ACCESSORY_SLOTS[slot] || 'Slot ' + slot, sub: a ? a.name : 'None', img: a && a.img, action: () => pickAccessory(s, o, slot) });
        });
        openChooser(o.name, entries, (en) => en.action());
      } else pickItem(s);
    }

    function pickItem(s) {
      openChooser(s.label, s.options.map((o) => ({ name: o.name, img: o.img, current: o.key === s.value, key: o.key })), async (en) => {
        if (en.key === s.value) return closeChooser();
        const change = s.type === 'vehicle' ? { type: 'vehicle', kit: s.kit, slot: s.slot, value: en.key } : { type: 'item', kit: s.kit, slot: s.slot, value: en.key };
        if (await save([change], `${en.name} equipped`)) s.value = en.key;
        closeChooser(); render();
      });
    }

    function pickAccessory(s, weapon, slot) {
      const cur = model.accValue(weapon.key, slot);
      openChooser(`${weapon.name} · ${D.ACCESSORY_SLOTS[slot] || 'Slot ' + slot}`,
        weapon.acc[slot].map((a) => ({ name: a.name, img: a.img, current: a.key === cur, key: a.key })), async (en) => {
          if (en.key === cur) return closeChooser();
          await save([{ type: 'acc', parent: weapon.key, slot, value: en.key }], `${en.name} equipped`);
          closeChooser(); render();
        });
    }

    async function save(changes, okText) {
      if (saving) return false;
      saving = true;
      M.toast('Saving loadout…', 15000);
      const r = await M.call('loadout', { frameId: 'bf3m-frame-' + FRAME, changes }, 20000);
      saving = false;
      if (r && r.ok) { M.toast(okText); M.sfx.select(); return true; }
      M.toast('Not saved: ' + ((r && (r.message || r.error)) || 'unknown error'), 5000);
      load(true);
      return false;
    }

    pg.setFooter([['↵', 'Loadout', () => open(), 'bf3m-k-a'], ['Esc', 'Back', () => (chooser ? closeChooser() : M.back()), 'bf3m-k-b'],
      ['Q/E', 'Switch tab', null, 'bf3m-k-x']]);

    return {
      node: pg.node,
      onShow() { tab = 0; row = 0; col = 0; closeChooser(); if (!model) load(false); else render(); },
      onKey(e) {
        if (chooser) {
          if (e.key === 'ArrowDown') chooser.move(1);
          else if (e.key === 'ArrowUp') chooser.move(-1);
          else if (e.key === 'Enter') chooser.activate();
          else if (e.key === 'Escape' || e.key === 'Backspace') { M.sfx.back(); closeChooser(); }
          return true;
        }
        const gs = groups();
        switch (e.key) {
          case 'q': tab = (tab + 2) % 3; row = 0; col = 0; M.sfx.tab(); render(); break;
          case 'e': tab = (tab + 1) % 3; row = 0; col = 0; M.sfx.tab(); render(); break;
          case 'ArrowDown': if (row < gs.length - 1) { row++; col = Math.min(col, gs[row].slots.length - 1); M.sfx.move(); paintSel(true); } break;
          case 'ArrowUp': if (row > 0) { row--; col = Math.min(col, gs[row].slots.length - 1); M.sfx.move(); paintSel(true); } break;
          case 'ArrowRight': if (gs[row] && col < gs[row].slots.length - 1) { col++; M.sfx.move(); paintSel(true); } break;
          case 'ArrowLeft': if (col > 0) { col--; M.sfx.move(); paintSel(true); } break;
          case 'Enter': open(); break;
          default: return false;
        }
        return true;
      }
    };
  });
})();

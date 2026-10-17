// Server Settings: console-style details for one server (description, map, mode, players, type, ping,
// preset, region, all game settings), plus Players and Maps tabs. Join and add/remove favorite.
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;

  // Battlelog's short setting codes -> [label, format]. Formats: b = on/off, p = percent, s = seconds, n = number.
  const SETTINGS = [
    ['vffi', 'Friendly fire', 'b'], ['vnit', 'Kick idle', 's'], ['vaba', 'Team balance', 'b'], ['vtkk', '# of TK before kick', 'n'],
    ['vtkc', 'Ban player after kicks', 'n'], ['vvsa', 'Vehicles', 'b'], ['vrhe', 'Regenerative health', 'b'],
    ['osls', 'Only squad leader spawn', 'b'], ['vmin', 'Show minimap', 'b'], ['vhud', 'Show HUD', 'b'], ['v3sp', '3D spotting', 'b'],
    ['vmsp', 'Minimap spotting', 'b'], ['vnta', 'Nametags', 'b'], ['v3ca', '3P vehicle cam', 'b'], ['vkca', 'Kill cam', 'b'],
    ['vshe', 'Soldier health', 'p'], ['vbdm', 'Bullet damage', 'p'], ['vprt', 'Respawn time', 'p'], ['vvsd', 'Vehicle spawn delay', 'p'],
    ['vpmd', 'Man down time', 'p'], ['vgmc', 'Tickets', 'p']
  ];
  const fmt = (v, f) => (v == null ? '—' : f === 'b' ? (Number(v) ? 'On' : 'Off') : f === 'p' ? `${v}%` : f === 's' ? (Number(v) ? `${v} s` : 'Off') : String(v));
  const players = (sv) => (sv.slots && sv.slots[2] ? sv.slots[2].current : 0);
  const maxPlayers = (sv) => (sv.slots && sv.slots[2] ? sv.slots[2].max : 0);
  const mapImg = (code) => M.img(`base/bf3/map_images/146x79/${String(code || '').toLowerCase()}.jpg`);

  function cell(label, ...content) {
    const c = el('div', 'bf3m-si-cell');
    c.append(el('div', 'bf3m-si-label', label), ...content);
    return c;
  }

  M.register('serverinfo', () => {
    const pg = M.page('Main / Multiplayer /', 'Server Settings');
    const TABS = ['Settings', 'Players', 'Maps'];
    let params = {}, info = null, tab = 0, favorite = false, busy = false, nav = null;

    function footer() {
      pg.setFooter([
        ['Space', 'Join', () => M.joinServer(params.server), 'bf3m-k-a'],
        ['F', favorite ? 'Remove from favorites' : 'Add to favorites', () => toggleFav(), 'bf3m-k-x'],
        ['Q/E', 'Switch tab', null, 'bf3m-k-y'],
        ['Esc', 'Back', () => M.back(), 'bf3m-k-b']
      ]);
    }
    function setTab(i) { tab = (i + TABS.length) % TABS.length; M.sfx.tab(); render(); }

    function renderSettings(sv) {
      const s = (info && info.server) || sv;
      const wrap = el('div', 'bf3m-si');
      const left = el('div', 'bf3m-si-left');
      const head = el('div', 'bf3m-panelhead bf3m-si-name', s.name || sv.name);
      // Descriptions can contain HTML (links); show only their text.
      const rawDesc = (s.extendedInfo && (s.extendedInfo.desc || s.extendedInfo.message)) || '';
      const descText = new DOMParser().parseFromString(`<div>${rawDesc}</div>`, 'text/html').body.textContent.trim();
      const desc = el('div', 'bf3m-si-desc', descText || 'No description.');
      const grid = el('div', 'bf3m-si-grid');
      const img = el('img', 'bf3m-si-mapimg');
      img.src = mapImg(s.map); img.alt = ''; img.onerror = () => img.remove();
      const real = M.realPlayers(sv);
      const plText = el('div', 'bf3m-si-value');
      plText.append(el('span', 'bf3m-pl-real', `${real === null ? players(s) : real}/${maxPlayers(s)}`));
      if (real !== null && real !== players(s)) plText.append(el('span', 'bf3m-pl-listed', String(players(s))));
      const pingEl = el('div', 'bf3m-si-value');
      pingEl.append(M.pingBars(M.pingOf(sv)));
      if (M.pingOf(sv) === null) M.ensurePing([sv], () => { pingEl.replaceChildren(M.pingBars(M.pingOf(sv))); });
      grid.append(
        cell('Map', el('div', 'bf3m-si-value', D.mapName(s.map)), img),
        cell('Mode', el('div', 'bf3m-si-value', D.modeLong(s.mapMode)), el('div', 'bf3m-si-mode', D.modeShort(s.mapMode))),
        cell('Players', plText), cell('Server type', el('div', 'bf3m-si-value', s.ranked ? 'Ranked' : 'Unranked')),
        cell('Ping', pingEl), cell('Preset', el('div', 'bf3m-si-value', D.PRESETS[s.preset] || 'Custom')),
        cell('Region', el('div', 'bf3m-si-value', [D.REGIONS[s.region], (s.country || '').toUpperCase()].filter(Boolean).join('  ·  ') || 'Unavailable')),
        cell('Server', el('div', 'bf3m-si-value', [s.punkbuster ? 'PunkBuster' : null, s.hasPassword ? 'Password' : null, `${s.tickRate || 30} Hz`].filter(Boolean).join('  ·  ')))
      );
      left.append(head, desc, grid);
      const right = el('div', 'bf3m-si-right');
      right.append(el('div', 'bf3m-panelhead', 'Preset  ·  ' + (D.PRESETS[s.preset] || 'Custom')));
      const list = el('div', 'bf3m-si-settings');
      const set = s.settings || {};
      SETTINGS.forEach(([k, label, f]) => {
        if (!(k in set)) return;
        const r = el('div', 'bf3m-statrow');
        r.append(el('span', null, label), el('b', null, fmt(set[k], f)));
        list.append(r);
      });
      if (!list.childElementCount) list.append(el('div', 'bf3m-msg', info ? 'This server does not share its settings.' : 'Loading settings…'));
      right.append(list);
      wrap.append(left, right);
      return wrap;
    }

    function renderPlayers() {
      const box = el('div', 'bf3m-si-list');
      const ps = (info && info.players) || [];
      if (!info) return (box.append(el('div', 'bf3m-msg', 'Loading players…')), box);
      if (!ps.length) return (box.append(el('div', 'bf3m-msg', 'Nobody is playing on this server right now.')), box);
      box.append(el('div', 'bf3m-thead bf3m-sectionhead', `Players  ·  ${ps.length}`));
      const rows = ps.map((p) => {
        const name = p.personaName || (p.persona && p.persona.personaName) || p.name || '?';
        const clan = (p.persona && p.persona.clanTag) || p.clanTag || '';
        const r = el('div', 'bf3m-trow bf3m-si-prow');
        r.append(el('span', 'bf3m-name', clan ? `[${clan}] ${name}` : name));
        box.append(r);
        return r;
      });
      nav = M.selectable(rows, { wrap: false });
      return box;
    }

    function renderMaps() {
      const box = el('div', 'bf3m-si-list');
      const maps = (info && info.server && info.server.maps && info.server.maps.maps) || [];
      if (!info) return (box.append(el('div', 'bf3m-msg', 'Loading map rotation…')), box);
      if (!maps.length) return (box.append(el('div', 'bf3m-msg', 'This server does not share its map rotation.')), box);
      box.append(el('div', 'bf3m-thead bf3m-sectionhead', `Map rotation  ·  ${maps.length}`));
      const cur = info.server.maps.currentMapIndex;
      const rows = maps.map((mp, i) => {
        const r = el('div', 'bf3m-si-maprow' + (i === cur ? ' bf3m-current' : ''));
        const img = el('img'); img.src = mapImg(mp.map); img.alt = ''; img.onerror = () => { img.style.visibility = 'hidden'; };
        r.append(img, el('span', 'bf3m-si-mapname', D.mapName(mp.map)), el('span', 'bf3m-blue', D.modeLong(mp.mapMode)), el('span', 'bf3m-si-now', i === cur ? 'Now playing' : ''));
        box.append(r);
        return r;
      });
      nav = M.selectable(rows, { wrap: false });
      return box;
    }

    function render() {
      nav = null;
      pg.setTabs(TABS, tab, setTab);
      const sv = params.server;
      if (!sv) return;
      pg.body.replaceChildren(tab === 0 ? renderSettings(sv) : tab === 1 ? renderPlayers() : renderMaps());
      footer();
    }

    async function load() {
      info = null;
      render();
      try {
        const j = await M.json(`/bf3/servers/show/pc/${params.server.guid}/`, true);
        info = { server: (j.context && j.context.server) || null, players: (j.context && j.context.players) || [] };
        if (!info.server) info.server = params.server;
      } catch (e) {
        M.toast('Could not load server details. ' + e.message, 4000);
        info = { server: params.server, players: [] };
      }
      render();
    }

    async function toggleFav() {
      if (busy || !params.server) return;
      if (!(await M.requireLogin())) return;
      busy = true;
      const r = await M.call('togglefav', { guid: params.server.guid }, 10000);
      busy = false;
      if (!r || r.error) return M.toast('Could not change favorites. ' + ((r && r.error) || ''), 3500);
      favorite = r.added;
      params.onFavorite && params.onFavorite(favorite);
      M.sfx.select();
      M.toast(favorite ? 'Added server to favorites' : 'Removed server from favorites');
      footer();
    }

    return {
      node: pg.node,
      setParams(p) { params = p || {}; favorite = !!params.favorite; tab = 0; },
      onShow: load,
      onKey(e) {
        switch (e.key) {
          case 'q': setTab(tab - 1); break;
          case 'e': setTab(tab + 1); break;
          case ' ': case 'Enter': M.joinServer(params.server); break;
          case 'f': toggleFav(); break;
          case 'ArrowDown': if (nav) nav.move(1); else return false; break;
          case 'ArrowUp': if (nav) nav.move(-1); else return false; break;
          default: return false;
        }
        return true;
      }
    };
  });
})();

// Friends (who's online / playing, join their game, view profile) and Invites (game / co-op invites
// received while the menu is open, friend requests). Data comes from Battlelog's chat panel via bridge.js.
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;

  const ago = (sec) => {
    if (!sec) return '';
    const s = Math.max(0, Math.floor(Date.now() / 1000 - sec));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  };

  function friendStatus(f) {
    if (f.playingMp && f.server) return { rank: 0, text: `Playing ${f.server.map ? D.mapName(f.server.map) : 'multiplayer'}`, cls: 'bf3m-st-play' };
    if (f.playingCoop) return { rank: 0, text: 'Playing co-op', cls: 'bf3m-st-play' };
    if (f.inGame) return { rank: 1, text: 'In game', cls: 'bf3m-st-play' };
    if (f.away) return { rank: 2, text: 'Away', cls: 'bf3m-st-away' };
    if (f.online) return { rank: 1, text: 'Online', cls: 'bf3m-st-on' };
    return { rank: 3, text: 'Offline', cls: 'bf3m-st-off' };
  }
  const SECTION = ['Playing', 'Online', 'Away', 'Offline'];

  function actionButtons(container, actions) {
    container.replaceChildren(...actions.map(([label, fn, primary]) => {
      const b = el('div', 'bf3m-actbtn' + (primary ? ' bf3m-primary' : ''), label);
      b.addEventListener('click', fn);
      return b;
    }));
  }

  async function joinServer(server, friendPersonaId) {
    if (!(await M.requireLogin())) return;
    M.sfx.select();
    const r = await M.call('join', { guid: server.guid, friendPersonaId: friendPersonaId || null });
    if (r && r.error) return M.toast('Join failed: ' + r.error, 4000);
    const mode = Number(server.mapMode || server.mode);
    M.push('joining', { server: { guid: server.guid, name: server.name, map: server.map, mapMode: isNaN(mode) || !mode ? '' : mode, modeLabel: isNaN(mode) ? server.mode : '' } });
  }

  // ---------- Friends ----------
  M.register('friends', () => {
    const pg = M.page('Main /', 'Friends');
    const wrap = el('div', 'bf3m-social-page');
    const list = el('div', 'bf3m-table bf3m-friendlist');
    const detail = el('div', 'bf3m-social-detail');
    wrap.append(list, detail);
    pg.body.append(wrap);
    let friends = [], sel = 0, rows = [], timer = null;

    function primary(f) { return f && f.server && f.server.guid && (!f.server.game || f.server.game === 2) ? 'join' : 'profile'; }
    function footer() {
      const f = friends[sel];
      const join = primary(f) === 'join';
      pg.setFooter([
        ['↵', join ? 'Join game' : 'View profile', () => act(), 'bf3m-k-a'],
        ...(join ? [['P', 'View profile', () => profile(), 'bf3m-k-y']] : []),
        ['Esc', 'Back', () => M.back(), 'bf3m-k-b']
      ]);
    }

    function render() {
      list.replaceChildren();
      rows = [];
      if (!friends.length) {
        list.append(el('div', 'bf3m-msg', 'No friends on Battlelog yet.'));
        detail.replaceChildren();
        return;
      }
      let section = -1;
      friends.forEach((f, i) => {
        const st = f._st;
        if (st.rank !== section) {
          section = st.rank;
          const count = friends.filter((x) => x._st.rank === section).length;
          list.append(el('div', 'bf3m-thead bf3m-sectionhead', `${SECTION[section]}  ·  ${count}`));
        }
        const r = el('div', 'bf3m-trow bf3m-friendrow' + (i === sel ? ' bf3m-sel' : ''));
        r.append(el('span', 'bf3m-dot ' + st.cls), el('span', 'bf3m-name', f.username), el('span', 'bf3m-fstatus', st.text));
        r.addEventListener('mousemove', () => select(i, false));
        r.addEventListener('click', () => select(i, false));
        r.addEventListener('dblclick', () => { select(i, false); act(); });
        list.append(r);
        rows.push(r);
      });
      select(sel, true, true);
    }

    function select(i, scroll, force) {
      if (!friends.length) return;
      i = Math.max(0, Math.min(friends.length - 1, i));
      if (i === sel && !force) return;
      if (i !== sel) M.sfx.move();
      sel = i;
      rows.forEach((r, k) => r.classList.toggle('bf3m-sel', k === sel));
      if (scroll && rows[sel]) rows[sel].scrollIntoView({ block: 'nearest' });
      showDetail();
      footer();
    }

    function showDetail() {
      const f = friends[sel];
      if (!f) return detail.replaceChildren();
      const st = f._st;
      const head = el('div', 'bf3m-panelhead', 'Friend');
      const name = el('div', 'bf3m-social-name', f.username);
      const status = el('div', 'bf3m-social-status ' + st.cls, st.text);
      const info = el('div', 'bf3m-social-info');
      if (f.personaName && f.personaName !== f.username) info.append(el('div', null, 'Soldier: ' + f.personaName));
      if (f.server) {
        info.append(el('div', 'bf3m-social-server', f.server.name || 'Unknown server'));
        if (f.server.map) info.append(el('div', 'bf3m-blue', D.mapName(f.server.map)));
      }
      const actions = el('div', 'bf3m-actions');
      const list2 = [];
      if (primary(f) === 'join') list2.push(['Join game', () => act(), true]);
      list2.push(['View profile', () => profile(), primary(f) !== 'join']);
      actionButtons(actions, list2);
      detail.replaceChildren(head, name, status, info, actions);
    }

    function act() {
      const f = friends[sel];
      if (!f) return;
      if (primary(f) === 'join') joinServer(f.server, f.personaId);
      else profile();
    }
    function profile() {
      const f = friends[sel];
      if (f) M.goBattlelog(`/bf3/user/${encodeURIComponent(f.username)}/`);
    }

    async function load() {
      const r = await M.call('social');
      if (!r || r.error) { list.replaceChildren(el('div', 'bf3m-msg', 'Could not read your friends from Battlelog.')); return; }
      const keep = friends[sel] && friends[sel].userId;
      friends = (r.friends || []).map((f) => Object.assign(f, { _st: friendStatus(f) }))
        .sort((a, b) => a._st.rank - b._st.rank || a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }));
      const i = friends.findIndex((f) => f.userId === keep);
      sel = i >= 0 ? i : Math.min(sel, Math.max(0, friends.length - 1));
      render();
    }

    return {
      node: pg.node, socialId: 'friends',
      onShow() { load(); clearInterval(timer); timer = setInterval(() => { if (M.current() && M.current().node === pg.node) load(); }, 10000); },
      onHide() { clearInterval(timer); },
      onKey(e) {
        switch (e.key) {
          case 'ArrowDown': select(sel + 1, true); break;
          case 'ArrowUp': select(sel - 1, true); break;
          case 'Enter': act(); break;
          case 'p': profile(); break;
          default: return false;
        }
        return true;
      }
    };
  });

  // ---------- Invites ----------
  M.register('invites', () => {
    const pg = M.page('Main /', 'Invites');
    const wrap = el('div', 'bf3m-social-page');
    const list = el('div', 'bf3m-table bf3m-friendlist');
    const detail = el('div', 'bf3m-social-detail');
    wrap.append(list, detail);
    pg.body.append(wrap);
    let items = [], sel = 0, rows = [], timer = null, busy = false;

    function footer() {
      const it = items[sel];
      if (!it) return pg.setFooter([['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
      pg.setFooter(it.type === 'request'
        ? [['↵', 'Accept', () => primary(), 'bf3m-k-a'], ['D', 'Decline', () => secondary(), 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]
        : [['↵', it.inv.kind === 'game' ? 'Join server' : 'Open in Battlelog', () => primary(), 'bf3m-k-a'], ['D', 'Dismiss', () => secondary(), 'bf3m-k-x'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    }

    function render() {
      list.replaceChildren();
      rows = [];
      if (!items.length) {
        list.append(el('div', 'bf3m-msg', 'No invites right now.'));
        detail.replaceChildren(el('div', 'bf3m-social-hint',
          'Game and co-op invites from friends show up here when they arrive while this menu is open. Friend requests show up here too.'));
        footer();
        return;
      }
      let section = '';
      items.forEach((it, i) => {
        const s = it.type === 'request' ? 'Friend requests' : 'Game invites';
        if (s !== section) {
          section = s;
          list.append(el('div', 'bf3m-thead bf3m-sectionhead', `${s}  ·  ${items.filter((x) => (x.type === 'request') === (it.type === 'request')).length}`));
        }
        const r = el('div', 'bf3m-trow bf3m-friendrow' + (i === sel ? ' bf3m-sel' : ''));
        if (it.type === 'request') r.append(el('span', 'bf3m-dot bf3m-st-on'), el('span', 'bf3m-name', it.req.username), el('span', 'bf3m-fstatus', 'Wants to be your friend'));
        else r.append(el('span', 'bf3m-dot bf3m-st-play'), el('span', 'bf3m-name', it.inv.from), el('span', 'bf3m-fstatus',
          (it.inv.kind === 'coop' ? 'Co-op invite' : (it.inv.server && it.inv.server.name) || 'Game invite') + '  ·  ' + ago(it.inv.createdAt)));
        r.addEventListener('mousemove', () => select(i, false));
        r.addEventListener('click', () => select(i, false));
        list.append(r);
        rows.push(r);
      });
      select(sel, true, true);
    }

    function select(i, scroll, force) {
      if (!items.length) return;
      i = Math.max(0, Math.min(items.length - 1, i));
      if (i === sel && !force) return;
      if (i !== sel) M.sfx.move();
      sel = i;
      rows.forEach((r, k) => r.classList.toggle('bf3m-sel', k === sel));
      if (scroll && rows[sel]) rows[sel].scrollIntoView({ block: 'nearest' });
      showDetail();
      footer();
    }

    function showDetail() {
      const it = items[sel];
      if (!it) return detail.replaceChildren();
      const actions = el('div', 'bf3m-actions');
      if (it.type === 'request') {
        actionButtons(actions, [['Accept', () => primary(), true], ['Decline', () => secondary()]]);
        detail.replaceChildren(el('div', 'bf3m-panelhead', 'Friend request'), el('div', 'bf3m-social-name', it.req.username),
          el('div', 'bf3m-social-status', 'Wants to be your friend' + (it.req.createdAt ? '  ·  ' + ago(it.req.createdAt) : '')), actions);
        return;
      }
      const inv = it.inv, info = el('div', 'bf3m-social-info');
      if (inv.server) {
        info.append(el('div', 'bf3m-social-server', inv.server.name || 'Server'));
        if (inv.server.map) info.append(el('div', 'bf3m-blue', D.mapName(inv.server.map) + (inv.server.mapMode ? '  ·  ' + D.modeLong(inv.server.mapMode) : '')));
      }
      actionButtons(actions, [[inv.kind === 'game' ? 'Join server' : 'Open in Battlelog', () => primary(), true], ['Dismiss', () => secondary()]]);
      detail.replaceChildren(el('div', 'bf3m-panelhead', inv.kind === 'coop' ? 'Co-op invite' : 'Game invite'),
        el('div', 'bf3m-social-name', inv.from), el('div', 'bf3m-social-status', 'Invited you  ·  ' + ago(inv.createdAt)), info, actions);
    }

    async function answerRequest(accept) {
      const it = items[sel];
      if (!it || busy) return;
      busy = true;
      M.sfx.select();
      const r = await M.call('friendrequest', { userId: it.req.userId, accept }, 10000);
      busy = false;
      M.toast(r && r.ok ? (accept ? `${it.req.username} is now your friend` : 'Friend request declined') : 'Battlelog did not accept that. Try again.', 3500);
      load();
    }
    async function primary() {
      const it = items[sel];
      if (!it) return;
      if (it.type === 'request') return answerRequest(true);
      await M.call('dismissinvite', { key: it.inv.key });
      if (it.inv.kind === 'game' && it.inv.server && it.inv.server.guid) joinServer(it.inv.server, null);
      else { M.session.hidden = true; M.hide(); }
    }
    async function secondary() {
      const it = items[sel];
      if (!it) return;
      if (it.type === 'request') return answerRequest(false);
      M.sfx.back();
      await M.call('dismissinvite', { key: it.inv.key });
      load();
    }

    async function load() {
      const r = await M.call('social');
      if (!r || r.error) { list.replaceChildren(el('div', 'bf3m-msg', 'Could not read your invites from Battlelog.')); return; }
      items = (r.invites || []).map((inv) => ({ type: 'invite', inv })).concat((r.requests || []).map((req) => ({ type: 'request', req })));
      sel = Math.min(sel, Math.max(0, items.length - 1));
      M.state.pendingInvites = items.length;
      M.updateSocial();
      render();
    }

    return {
      node: pg.node, socialId: 'invites',
      onShow() { load(); clearInterval(timer); timer = setInterval(() => { if (M.current() && M.current().node === pg.node) load(); }, 10000); },
      onHide() { clearInterval(timer); },
      onKey(e) {
        switch (e.key) {
          case 'ArrowDown': select(sel + 1, true); break;
          case 'ArrowUp': select(sel - 1, true); break;
          case 'Enter': primary(); break;
          case 'd': secondary(); break;
          default: return false;
        }
        return true;
      }
    };
  });
})();

// Main menu, Options, Credits, keyboard routing and start-up.
(() => {
  const M = BF3M, el = M.el;

  // ---------- Main menu ----------
  M.register('main', () => {
    const node = el('div', 'bf3m-mainmenu');
    const box = el('div', 'bf3m-main');
    const logo = el('div', 'bf3m-logo', 'Battlefield');
    logo.append(el('span', 'bf3m-three', '3'));
    const ul = el('ul', 'bf3m-items');
    const entries = [
      ['Campaign', launchCampaign],
      ['Co-op', () => M.goBattlelog('/bf3/coop/')],
      ['Multiplayer', () => M.push('mp')],
      ['My Soldier', async () => { if (await M.requireLogin()) M.push('soldier'); }],
      ['Options', () => M.push('options')],
      ['Credits', () => M.push('credits')],
      ['Quit', () => chrome.runtime.sendMessage({ type: 'quit' })]
    ];
    const lis = entries.map(([label]) => { const li = el('li', 'bf3m-item', label); ul.append(li); return li; });
    box.append(logo, ul);
    const user = el('div', 'bf3m-user');
    const foot = el('div', 'bf3m-foot');
    M.footer(foot, [M.HINT_SELECT, ['Alt+M', 'Battlelog', () => { M.session.hidden = true; M.hide(); }]]);
    node.append(box, user, foot);
    const list = M.selectable(lis, { onActivate: (i) => { M.sfx.select(); entries[i][1](); } });

    async function launchCampaign() {
      if (!(await M.requireLogin())) return;
      const r = await M.call('campaign');
      if (r && r.error) return M.toast('Launch failed: ' + r.error, 4000);
      M.push('joining', { campaign: true });
    }

    return {
      node, main: true,
      onShow() {
        M.refreshState().then((s) => {
          user.replaceChildren();
          if (!s.battlelogReady) {
            user.textContent = 'Battlelog did not load · press F5';
            M.toast('Battlelog did not load (it may be busy). Wait a moment, then press F5.', 6000);
          } else if (s.persona) user.append(document.createTextNode('Soldier  '), el('b', null, s.persona.name));
          else user.textContent = s.loggedIn ? 'Signed in' : 'Not signed in';
        });
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

  // ---------- Options ----------
  M.register('options', () => {
    const pg = M.page('Main /', 'Options');
    const tabNames = ['Menu', 'About'];
    let tab = 0, list = null;
    const onOff = (v) => (v ? 'On' : 'Off');
    const tabs = [
      [
        ['Menu sounds', () => onOff(M.prefs.sounds), () => { M.prefs.sounds = !M.prefs.sounds; }],
        ['Show menu on start', () => onOff(M.prefs.showOnStart), () => { M.prefs.showOnStart = !M.prefs.showOnStart; }],
        ['Mirror main menu art', () => onOff(M.prefs.mirrorBg), () => { M.prefs.mirrorBg = !M.prefs.mirrorBg; M.applyBgPrefs(); }],
        ['Reset server filters', () => '', () => { M.prefs.filters = { players: 0, modes: [], maps: [], presets: [], ranked: 0, regions: [], showFull: true }; M.toast('Server filters reset'); }],
        ['Battlelog account settings', () => '', () => M.goBattlelog('/bf3/user/edit/')]
      ],
      null
    ];
    const desc = el('div', 'bf3m-desc');

    function render() {
      pg.setTabs(tabNames, tab, (i) => { tab = i; M.sfx.tab(); render(); });
      pg.body.replaceChildren();
      if (tab === 1) {
        list = null;
        const about = el('div', 'bf3m-about');
        about.append(el('p', null, 'Controls, audio and video settings live inside the game, so change them from the in-game Options menu.'),
          el('p', null, 'These options only change this menu. They are saved in this browser.'));
        pg.body.append(about);
        return;
      }
      const table = el('div', 'bf3m-optlist');
      const rows = tabs[0].map(([label, value]) => {
        const r = el('div', 'bf3m-optrow');
        r.append(el('span', null, label), el('span', 'bf3m-optval', value()));
        table.append(r);
        return r;
      });
      pg.body.append(table, desc);
      list = M.selectable(rows, {
        onActivate: (i) => {
          M.sfx.select(); tabs[0][i][2](); M.savePrefs();
          rows.forEach((r, k) => { r.lastChild.textContent = tabs[0][k][1](); });
        }
      });
    }
    pg.setFooter([['↵', 'Change', null, 'bf3m-k-a'], ['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    render();
    return {
      node: pg.node,
      onShow: render,
      onKey(e) {
        if (e.key === 'q' || e.key === 'e') { tab = (tab + (e.key === 'e' ? 1 : -1) + 2) % 2; M.sfx.tab(); render(); return true; }
        if (!list) return false;
        if (e.key === 'ArrowDown') list.move(1);
        else if (e.key === 'ArrowUp') list.move(-1);
        else if (e.key === 'Enter') list.activate();
        else return false;
        return true;
      }
    };
  });

  // ---------- Credits ----------
  M.register('credits', () => {
    const pg = M.page('Main /', 'Credits');
    const c = el('div', 'bf3m-about');
    [['Battlefield 3', 'Developed by DICE, published by Electronic Arts (2011).'],
     ['Battlelog', 'Server browser, stats, loadouts, joining and launching are all powered by Battlelog.'],
     ['Console-Style Menu for Battlelog', 'A fan-made, console-style front end for Battlelog. Not affiliated with EA or DICE.']]
      .forEach(([h, t]) => c.append(el('h4', null, h), el('p', null, t)));
    pg.body.append(c);
    pg.setFooter([['Esc', 'Back', () => M.back(), 'bf3m-k-b']]);
    return { node: pg.node, onKey: () => false };
  });

  // ---------- Keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault(); e.stopPropagation();
      if (M.isShown()) { M.session.hidden = true; M.hide(); } else M.show();
      return;
    }
    if (!M.isShown()) return;
    const focused = M.activeElement();
    const typing = !!focused && focused.tagName === 'INPUT';
    const cur = M.current();
    const ev = { key: e.key.length === 1 ? e.key.toLowerCase() : e.key, typing, shift: e.shiftKey, raw: e };
    let handled = false;
    if (cur && cur.onKey) handled = cur.onKey(ev) === true;
    if (!handled && !typing && (e.key === 'Escape' || e.key === 'Backspace')) handled = M.back();
    if (!handled && typing && e.key === 'Escape') { focused.blur(); handled = true; }
    if (handled) e.preventDefault();
    if (handled || !typing) e.stopPropagation();
  }, true);

  // ---------- Start ----------
  M.attach();
  M.applyBgPrefs();
  M.push('main');
  if (M.session.hidden || !M.prefs.showOnStart) M.hide();
  else M.show();
})();

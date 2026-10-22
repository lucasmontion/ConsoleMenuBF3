// Joining / launching screen: shows Battlelog's launch progress (slot, queue, connecting, loading, in game)
// in the menu's style instead of revealing Battlelog's blue launch bar.
(() => {
  const M = BF3M, el = M.el, D = BF3M.data;

  const LABELS = {
    RESERVING_SLOT: 'Reserving a slot', State_ClaimReservation: 'Connecting', State_ConnectToGameId: 'Connecting',
    State_ConnectToUserId: 'Joining friend', State_Connecting: 'Connecting', State_InQueue: 'In server queue',
    State_Init: 'Starting the game', State_Starting: 'Starting the game', State_LoadLevel: 'Loading level',
    State_GameLoading: 'Loading level', State_WaitForLevel: 'Loading level', State_Game: 'In game',
    State_Ready: 'In game', State_ResumeCampaign: 'Resuming campaign', State_GameLeaving: 'Leaving level',
    State_Error: 'Could not join', EXITING_GAME: 'Game closed', GAMEISGONE: 'Game closed'
  };
  const IN_GAME = ['State_Game', 'State_Ready'];
  const ENDED = ['EXITING_GAME', 'GAMEISGONE', 'NONE', 'State_NA', ''];

  M.register('joining', () => {
    const pg = M.page('Main / Multiplayer /', 'Joining Server');
    const wrap = el('div', 'bf3m-join');
    const map = el('div', 'bf3m-join-map');
    const mapImg = el('img');
    mapImg.alt = '';
    mapImg.onerror = () => { mapImg.style.visibility = 'hidden'; };
    map.append(mapImg);
    const info = el('div', 'bf3m-join-info');
    const mapName = el('div', 'bf3m-join-mapname');
    const mode = el('div', 'bf3m-join-mode');
    const server = el('div', 'bf3m-join-server');
    info.append(mapName, mode, server);
    const status = el('div', 'bf3m-join-status');
    const spinner = el('span', 'bf3m-spinner');
    const statusText = el('span', 'bf3m-join-statustext');
    status.append(spinner, statusText);
    const detail = el('div', 'bf3m-join-detail');
    wrap.append(map, info, status, detail);
    pg.body.append(wrap);

    let params = {}, timer = null, seenActive = false, seenGame = false, startedAt = 0, finished = false, notRunning = 0, polling = false;

    function setFooter(inGame) {
      pg.setFooter([
        inGame ? ['Esc', 'Back to menu', () => M.back(), 'bf3m-k-b'] : ['Esc', 'Cancel', () => cancel(), 'bf3m-k-b'],
        ['Alt+M', 'Battlelog', () => { M.session.hidden = true; M.hide(); }]
      ]);
    }

    function fill() {
      const sv = params.server;
      if (params.campaign) {
        pg.setTitle('Campaign');
        mapName.textContent = 'Battlefield 3';
        mode.textContent = 'Single player campaign';
        server.textContent = '';
        map.style.display = 'none';
        return;
      }
      pg.setTitle('Joining Server');
      map.style.display = '';
      mapImg.style.visibility = '';
      mapImg.src = sv && sv.map ? M.img(`base/bf3/map_images/146x79/${sv.map.toLowerCase()}.jpg`) : '';
      mapName.textContent = sv && sv.map ? D.mapName(sv.map) : '';
      mode.textContent = sv && sv.mapMode ? D.modeLong(sv.mapMode) : (sv && sv.modeLabel) || '';
      const real = M.realPlayers ? M.realPlayers(sv) : null;
      const pl = sv && sv.slots && sv.slots[2] ? `  ·  ${real === null ? sv.slots[2].current : real}/${sv.slots[2].max} players` : '';
      server.textContent = sv ? sv.name + pl : '';
    }

    function show(text, opts = {}) {
      statusText.textContent = text;
      spinner.style.display = opts.spin === false ? 'none' : '';
      status.classList.toggle('bf3m-error', !!opts.error);
      detail.textContent = opts.detail || '';
    }

    async function poll() {
      if (finished || polling) return;
      polling = true;
      try { await pollOnce(); } finally { polling = false; }
    }

    async function pollOnce() {
      const r = await M.call('launchstate', {}, 3000);
      if (!r || r.error) return;
      const st = r.gameState || '';
      const label = r.pretty ? r.pretty.replace(/\.\.\.$/, '…') : (LABELS[st] || st);
      const queueKey = Object.keys(r).find((k) => /queue/i.test(k) && typeof r[k] === 'number');
      const dialogHint = r.dialog ? 'Battlelog is asking something: answer the box on screen.' : '';
      const premium = /premium/i.test(r.queueText || '') ? '  ·  Premium prioritized' : '';

      if (r.inQueue && !IN_GAME.includes(st)) {
        seenActive = true;
        const pos = r.queuePosition || (queueKey && r[queueKey]);
        show(pos ? `Position ${pos} in queue` : LABELS.State_InQueue, { detail: dialogHint || `Server is full: you'll join when a slot opens.${premium}` });
        setFooter(false);
        return;
      }

      if (st === 'State_Error') {
        show(LABELS.State_Error, { spin: false, error: true, detail: r.dialogText || label });
        setFooter(true);
        return;
      }
      // Battlelog can keep saying "in game" after the game is closed, so once the game was
      // running, also ask whether the process still exists.
      if (seenGame && !ENDED.includes(st)) {
        const g = await M.call('gamerunning', {}, 3000);
        if (g && g.running === false) notRunning++; else notRunning = 0;
        if (notRunning >= 3) { gameClosed(); return; }
      }
      if (IN_GAME.includes(st)) {
        seenActive = seenGame = true;
        show('In game', { spin: false, detail: 'Have fun! The menu waits here until you leave the game.' });
        setFooter(true);
        return;
      }
      if (st && !ENDED.includes(st)) {
        seenActive = true;
        const q = st === 'State_InQueue' && queueKey ? `Position ${r[queueKey]} in queue` : '';
        show(label || 'Joining…', { detail: dialogHint || q });
        setFooter(false);
        return;
      }
      // Nothing (or no longer anything) happening.
      if (seenGame) {
        gameClosed();
      } else if (seenActive) {
        finished = true;
        show(r.dialog ? 'Waiting for Battlelog' : 'Join stopped', { spin: !!r.dialog, detail: dialogHint || 'Press Esc to go back.' });
        if (r.dialog) finished = false;
      } else if (Date.now() - startedAt > 20000) {
        show('Still waiting for Battlelog…', { detail: dialogHint || 'Press Alt+M to see Battlelog if nothing happens.' });
      } else {
        show(params.campaign ? 'Launching campaign…' : 'Joining server…', { detail: dialogHint });
      }
    }

    function gameClosed() {
      if (finished) return;
      finished = true;
      show('Game closed', { spin: false });
      setFooter(true);
      setTimeout(() => { if (M.current() && M.current().node === pg.node) M.back(); }, 2500);
    }

    async function cancel() {
      if (!finished && !seenGame) {
        await M.call('cancel');
        M.toast(params.campaign ? 'Campaign launch cancelled' : 'Join cancelled');
      }
      M.back();
    }

    return {
      node: pg.node, quiet: true,
      setParams(p) { params = p || {}; },
      onShow() {
        seenActive = seenGame = finished = false;
        notRunning = 0;
        startedAt = Date.now();
        fill();
        show(params.campaign ? 'Launching campaign…' : 'Joining server…');
        setFooter(false);
        clearInterval(timer);
        timer = setInterval(poll, 800);
        poll();
      },
      onHide() { clearInterval(timer); },
      onKey(e) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          if (seenGame || finished || statusText.textContent === LABELS.State_Error) M.back();
          else cancel();
          return true;
        }
        return false;
      }
    };
  });
})();

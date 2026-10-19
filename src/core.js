// Shared building blocks: preferences, Battlelog bridge, hidden Battlelog pages, sounds,
// page layout (breadcrumb + title + tabs + footer) and the screen stack.
var BF3M = window.BF3M || (window.BF3M = {});

(() => {
  const M = BF3M;

  // ---------- DOM ----------
  M.el = function (tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  M.fmt = (n) => (n == null || isNaN(n) ? '0' : Math.round(n).toLocaleString('en-US'));
  M.fmt2 = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2));
  M.duration = (sec) => {
    sec = Math.max(0, Math.round(sec || 0));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
    return `${d}d${h}h${m}m`;
  };

  // ---------- Preferences ----------
  // Kept in the extension's own storage: Battlelog's local storage is separate for http:// and https://
  // and is wiped whenever the browser clears site data, so settings kept there seemed to reset.
  // Settings saved there by older versions are moved over once. Start-up waits for M.prefsReady.
  const PREFS_KEY = 'bf3m.prefs';
  M.prefs = {
    sounds: true, music: 50, intro: true, showOnStart: true, mirrorBg: true,
    filters: { players: 0, modes: [], maps: [], presets: [], ranked: 0, regions: [], showFull: true }
  };
  const oldPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)); } catch (e) { return null; } };
  M.prefsReady = chrome.storage.local.get(PREFS_KEY).then((r) => {
    let saved = r[PREFS_KEY];
    if (!saved && (saved = oldPrefs())) {
      chrome.storage.local.set({ [PREFS_KEY]: saved }).then(() => { try { localStorage.removeItem(PREFS_KEY); } catch (e) {} });
    }
    Object.assign(M.prefs, saved);
  }).catch(() => { Object.assign(M.prefs, oldPrefs()); });
  M.savePrefs = () => { try { chrome.storage.local.set({ [PREFS_KEY]: M.prefs }).catch(() => {}); } catch (e) {} };
  M.session = {
    get hidden() { try { return sessionStorage.getItem('bf3m.hidden') === '1'; } catch (e) { return false; } },
    set hidden(v) { try { v ? sessionStorage.setItem('bf3m.hidden', '1') : sessionStorage.removeItem('bf3m.hidden'); } catch (e) {} }
  };

  // ---------- Bridge to Battlelog's page scripts ----------
  const pending = new Map();
  let nextId = 1, bridgeReady;
  const bridgeLoaded = new Promise((res) => { bridgeReady = res; });
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (e.source !== window || !m || m.source !== 'bf3menu-bridge') return;
    if (m.ready) return bridgeReady();
    if (m.event) return M.onBridgeEvent(m.event, m.data || {});
    const cb = pending.get(m.id);
    if (cb) { pending.delete(m.id); cb(m.data); }
  });
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('bridge.js');
  (document.head || document.documentElement).appendChild(s);
  M.call = async function (cmd, extra, timeoutMs = 8000) {
    await bridgeLoaded;
    return new Promise((res) => {
      const id = nextId++;
      pending.set(id, res);
      window.postMessage(Object.assign({ source: 'bf3menu', id, cmd }, extra), location.origin);
      setTimeout(() => { if (pending.delete(id)) res({ error: 'timeout' }); }, timeoutMs);
    });
  };

  M.state = { loggedIn: false, persona: null, friendsOnline: 0, pendingInvites: 0, prefix: '//cdn.battlelog.com/bl-cdn/cdnprefix/develop-20260605' };
  M.refreshState = async function () {
    const r = await M.call('state');
    if (r && !r.error) Object.assign(M.state, r);
    M.updateSocial();
    return M.state;
  };
  // Sharp vector kit icons (Battlelog's are 13x13 pixels and blur when enlarged).
  const KIT_SVG = {
    assault: '<path fill="currentColor" d="M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z"/>',
    engineer: '<path fill="currentColor" d="M22.7 19.3l-9-9a6 6 0 0 0-7.9-7.6l3.6 3.6-2.8 2.8-3.6-3.6a6 6 0 0 0 7.6 7.9l9 9a1 1 0 0 0 1.4 0l1.7-1.7a1 1 0 0 0 0-1.4z"/>',
    support: '<g fill="currentColor"><path d="M3.5 21V10c0-3.5 1.75-6 1.75-6S7 6.5 7 10v11z"/><path d="M10.25 21V10c0-3.5 1.75-6 1.75-6s1.75 2.5 1.75 6v11z"/><path d="M17 21V10c0-3.5 1.75-6 1.75-6s1.75 2.5 1.75 6v11z"/></g>',
    recon: '<g fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="6.5"/><path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6"/></g><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'
  };
  M.kitIcon = (name, cls) => {
    const span = M.el('span', 'bf3m-kitsvg' + (cls ? ' ' + cls : ''));
    span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${KIT_SVG[name] || ''}</svg>`;
    return span;
  };
  // Pictures of the currently equipped [left, right] dog tags, kept up to date by the Dog Tag screen
  // so every copy of the player's tags (My Soldier, Dog Tag) shows the same thing.
  M.equippedTags = [null, null];
  M.applyEquippedTags = (svgs) => {
    [...svgs].slice(0, 2).forEach((svg, i) => {
      const url = M.equippedTags[i];
      const img = svg.querySelector('image');
      if (!url || !img) return;
      img.setAttribute('href', url);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
    });
  };
  M.img = (path) => location.protocol + M.state.prefix + '/public/' + path;
  M.itemImg = (slug) => M.img('profile/bf3/stats/items_147x88/' + String(slug || '').replace(/-/g, '') + '.png');

  // ---------- JSON helpers ----------
  M.json = async function (path, ajaxNav) {
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (ajaxNav) headers['X-AjaxNavigation'] = '1';
    const r = await fetch(path, { headers, credentials: 'include' });
    if (r.status === 429) throw new Error('Battlelog is busy (too many requests). Try again in a minute.');
    if (!r.ok) throw new Error(`Battlelog had a problem answering (error ${r.status}). Switch tabs or reopen to try again.`);
    try { return await r.json(); } catch (e) { throw new Error('Battlelog sent an unexpected answer. Switch tabs or reopen to try again.'); }
  };

  // ---------- Hidden Battlelog pages (for data Battlelog only renders as HTML) ----------
  const frames = new Map();
  M.loadFrame = function (key, path, ready, fresh) {
    if (!fresh && frames.has(key)) return frames.get(key).promise;
    const old = frames.get(key);
    if (old) old.iframe.remove();
    const iframe = M.el('iframe', 'bf3m-hiddenframe');
    iframe.id = 'bf3m-frame-' + key;
    iframe.src = path;
    document.body.append(iframe);
    const promise = new Promise((res, rej) => {
      const t0 = Date.now();
      const poll = () => {
        let doc = null;
        try { doc = iframe.contentDocument; } catch (e) {}
        if (doc && doc.readyState !== 'loading' && ready(doc)) return res(doc);
        if (Date.now() - t0 > 25000) return rej(new Error('Battlelog page did not load'));
        setTimeout(poll, 250);
      };
      iframe.addEventListener('load', poll, { once: true });
    });
    frames.set(key, { iframe, promise });
    promise.catch(() => frames.delete(key));
    return promise;
  };
  M.soldierPath = (page) => {
    const p = M.state.persona;
    return `/bf3/soldier/${encodeURIComponent(p.name)}/${page}/${p.id}/pc/`;
  };

  // ---------- Sounds (beeps are synthesized; the menu music is audio/menu-ambient.mp3) ----------
  let audio;
  const ctx = () => (audio = audio || new AudioContext());
  function beep(freq, dur, type, gain) {
    if (!M.prefs.sounds) return;
    try {
      ctx();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  M.sfx = {
    move: () => beep(2200, 0.035, 'square', 0.025),
    select: () => { beep(900, 0.08, 'triangle', 0.08); setTimeout(() => beep(1400, 0.1, 'triangle', 0.06), 60); },
    back: () => beep(500, 0.09, 'triangle', 0.07),
    tab: () => beep(1600, 0.05, 'triangle', 0.05)
  };

  // Menu music: decoded once and looped with Web Audio, so the seam has no gap (an <audio loop>
  // stutters on MP3s). Plays while the menu is shown, except on screens marked `quiet` (joining / in game).
  // Browsers only allow sound after the first key press or click on the page.
  M.MUSIC_STEPS = [0, 25, 50, 75, 100];
  const FADE = 0.8;
  const music = { track: null, loading: null, src: null, gain: null, startedAt: 0, offset: 0 };
  let unlocked = !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  const musicLevel = () => Math.pow((M.prefs.music || 0) / 100, 2);

  // Trims the decoder's silent edges and crossfades the tail into the head so the loop point is seamless.
  function seamless(buf) {
    const chans = [...Array(buf.numberOfChannels)].map((_, c) => buf.getChannelData(c));
    const loud = (i) => chans.some((d) => Math.abs(d[i]) > 1e-4);
    let start = 0, end = buf.length;
    while (start < end && !loud(start)) start++;
    while (end > start && !loud(end - 1)) end--;
    const xf = Math.min(Math.round(buf.sampleRate * 0.25), Math.floor((end - start) / 4));
    for (const d of chans) {
      for (let k = 0; k < xf; k++) {
        const t = k / xf;
        d[start + k] = d[start + k] * t + d[end - xf + k] * (1 - t);
      }
    }
    return { buf, start: start / buf.sampleRate, end: (end - xf) / buf.sampleRate };
  }
  function loadMusic() {
    if (!music.loading) {
      music.loading = fetch(chrome.runtime.getURL('audio/menu-ambient.mp3'))
        .then((r) => r.arrayBuffer())
        .then((b) => ctx().decodeAudioData(b))
        .then((buf) => (music.track = seamless(buf)));
      music.loading.catch(() => { music.loading = null; });
    }
    return music.loading;
  }
  function stopMusic() {
    if (!music.src) return;
    const { src, gain, track } = music, t = audio.currentTime;
    const len = track.end - track.start;
    music.offset = ((music.offset + t - music.startedAt) % len + len) % len;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + FADE);
    src.stop(t + FADE);
    music.src = music.gain = null;
  }
  const musicWanted = () => {
    const cur = M.current();
    return unlocked && M.prefs.music > 0 && M.isShown() && !M.introPlaying && !(cur && cur.quiet);
  };
  M.updateMusic = function () {
    if (!musicWanted()) return stopMusic();
    try { ctx().resume(); } catch (e) { return; }
    if (music.src) {
      const t = audio.currentTime;
      music.gain.gain.cancelScheduledValues(t);
      music.gain.gain.setValueAtTime(music.gain.gain.value, t);
      music.gain.gain.linearRampToValueAtTime(musicLevel(), t + 0.2);
      return;
    }
    loadMusic().then((track) => {
      if (music.src || !musicWanted()) return;
      const src = audio.createBufferSource(), gain = audio.createGain(), t = audio.currentTime;
      src.buffer = track.buf;
      src.loop = true;
      src.loopStart = track.start;
      src.loopEnd = track.end;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(musicLevel(), t + FADE * 2);
      src.connect(gain).connect(audio.destination);
      src.start(t, track.start + music.offset);
      Object.assign(music, { src, gain, startedAt: t });
    }, () => {});
  };
  // Also called by the intro when the browser let it play with sound (no key press needed then).
  const unlock = M.unlockAudio = () => {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('pointerdown', unlock, true);
    M.updateMusic();
  };
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('pointerdown', unlock, true);

  // ---------- Host, shadow root, root, toast ----------
  // The menu lives in a closed shadow root: changes inside it are invisible to Battlelog's scripts and
  // to other extensions that watch the page (e.g. player-count checkers that react to every DOM change),
  // and styles cannot leak in either direction.
  M.host = M.el('div');
  M.host.id = 'bf3m-host';
  M.host.classList.add('bf3m-host-hidden');
  M.shadow = M.host.attachShadow({ mode: 'closed' });
  const sheet = M.el('link');
  sheet.rel = 'stylesheet';
  sheet.href = chrome.runtime.getURL('menu.css');
  M.shadow.append(sheet);
  M.styled = new Promise((res) => { sheet.onload = res; sheet.onerror = res; });
  M.root = M.el('div');
  M.root.id = 'bf3m-root';
  M.shadow.append(M.root);
  // The focused element inside the menu (document.activeElement only sees the host).
  M.activeElement = () => M.shadow.activeElement;
  const bgSharp = M.el('div', 'bf3m-bg bf3m-bg-sharp');
  const bgSoft = M.el('div', 'bf3m-bg bf3m-bg-soft');
  // Background art comes from EA's server via background.js (cached there); fade it in once ready.
  M.root.classList.add('bf3m-noart');
  chrome.runtime.sendMessage({ type: 'art' }, (r) => {
    if (chrome.runtime.lastError || !r || !r.dataUrl) return;
    bgSharp.style.backgroundImage = bgSoft.style.backgroundImage = `url("${r.dataUrl}")`;
    M.root.classList.remove('bf3m-noart');
  });
  const toast = M.el('div', 'bf3m-toast');
  M.stage = M.el('div', 'bf3m-stage');
  M.root.append(bgSharp, bgSoft, M.stage, toast);
  M.applyBgPrefs = () => M.root.classList.toggle('bf3m-mirror', !!M.prefs.mirrorBg);

  let toastTimer;
  M.toast = function (text, ms = 2600) {
    toast.textContent = text;
    toast.classList.add('bf3m-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('bf3m-show'), ms);
  };

  // ---------- Social box (top right): opens Invites / Friends ----------
  const socials = new Set();
  M.updateSocial = () => socials.forEach((fn) => fn());
  function openSocial(id) {
    const cur = M.current();
    if (cur && cur.socialId === id) return;
    M.sfx.select();
    M.requireLogin().then((ok) => { if (ok) M.push(id); });
  }
  function socialBox() {
    const box = M.el('div', 'bf3m-social');
    const inv = M.el('div', 'bf3m-social-cell bf3m-click');
    const badge = M.el('span', 'bf3m-badge');
    inv.append(M.el('span', 'bf3m-dpad', '◀'), document.createTextNode(' Invites'), badge);
    inv.addEventListener('click', () => openSocial('invites'));
    const fr = M.el('div', 'bf3m-social-cell bf3m-social-right bf3m-click');
    const n = M.el('b');
    fr.append(document.createTextNode('Friends '), n, M.el('span', 'bf3m-dpad', '▶'));
    fr.addEventListener('click', () => openSocial('friends'));
    box.append(inv, fr);
    const upd = () => {
      n.textContent = M.state.friendsOnline || 0;
      const p = M.state.pendingInvites || 0;
      badge.textContent = p ? String(p) : '';
      badge.style.display = p ? '' : 'none';
    };
    socials.add(upd); upd();
    return box;
  }

  // Live events from Battlelog (sent by bridge.js).
  M.onBridgeEvent = (name, data) => {
    if (name === 'invite') {
      M.toast(`${data.kind === 'coop' ? 'Co-op' : 'Game'} invite from ${data.from} · open Invites`, 6000);
      M.sfx.select();
      M.refreshState();
      const cur = M.current();
      if (cur && cur.socialId === 'invites' && cur.onShow) cur.onShow();
    }
  };
  // Friends' status changes come from Battlelog's chat panel; re-read it now and then (no network).
  setInterval(() => { if (M.isShown && M.isShown()) M.refreshState(); }, 15000);

  // ---------- Page layout ----------
  // Returns { node, body, setTabs(labels, index), setFooter(hints) }
  M.page = function (crumb, title) {
    const node = M.el('div', 'bf3m-page');
    const head = M.el('div', 'bf3m-head');
    head.append(M.el('div', 'bf3m-crumb', crumb), M.el('div', 'bf3m-title', title));
    const tabs = M.el('div', 'bf3m-tabs');
    head.append(tabs);
    const body = M.el('div', 'bf3m-body');
    const foot = M.el('div', 'bf3m-foot');
    node.append(head, socialBox(), body, foot);
    return {
      node, body, head,
      setTitle(t) { head.querySelector('.bf3m-title').textContent = t; },
      setTabs(labels, index, onPick) {
        tabs.replaceChildren();
        if (!labels || !labels.length) return;
        // Many or long tab names (e.g. the six DLC packs) use a smaller one-line style.
        tabs.classList.toggle('bf3m-compact', labels.length > 4 || labels.join('').length > 34);
        tabs.append(M.el('span', 'bf3m-bumper', 'Q'));
        labels.forEach((l, i) => {
          const t = M.el('span', 'bf3m-tab' + (i === index ? ' bf3m-sel' : ''), l);
          t.addEventListener('click', () => onPick && onPick(i));
          tabs.append(t);
        });
        tabs.append(M.el('span', 'bf3m-bumper', 'E'));
      },
      setFooter(hints) { M.footer(foot, hints); }
    };
  };

  M.footer = function (foot, hints) {
    foot.replaceChildren();
    for (const [key, label, onClick, color] of hints) {
      const p = M.el('span', 'bf3m-hint' + (onClick ? ' bf3m-click' : ''));
      const k = M.el('span', 'bf3m-btnkey ' + (color || ''), key);
      p.append(k, document.createTextNode(label));
      if (onClick) p.addEventListener('click', onClick);
      foot.append(p);
    }
  };
  M.HINT_SELECT = ['↵', 'Select', null, 'bf3m-k-a'];

  // ---------- Generic vertical selection ----------
  M.selectable = function (items, opts) {
    // items: array of elements. opts: { onMove(i), onActivate(i), wrap }
    let sel = opts.start || 0;
    const paint = (scroll) => {
      items.forEach((n, i) => n.classList.toggle('bf3m-sel', i === sel));
      if (scroll && items[sel]) items[sel].scrollIntoView({ block: 'nearest' });
    };
    items.forEach((n, i) => {
      n.addEventListener('mousemove', () => { if (sel !== i) { sel = i; paint(); M.sfx.move(); opts.onMove && opts.onMove(i); } });
      n.addEventListener('click', () => { sel = i; paint(); opts.onActivate && opts.onActivate(i); });
    });
    paint();
    return {
      get index() { return sel; },
      set(i, silent) { sel = Math.max(0, Math.min(items.length - 1, i)); paint(true); if (!silent) { M.sfx.move(); opts.onMove && opts.onMove(sel); } },
      move(d) {
        if (!items.length) return;
        let n = sel + d;
        if (opts.wrap !== false) n = (n + items.length) % items.length;
        n = Math.max(0, Math.min(items.length - 1, n));
        if (n !== sel) { sel = n; paint(true); M.sfx.move(); opts.onMove && opts.onMove(sel); }
      },
      activate() { opts.onActivate && opts.onActivate(sel); }
    };
  };

  // ---------- Screen stack ----------
  // A screen is { id, node, onKey(e) -> bool, onShow(), onHide(), main?:bool }
  M.screens = {};
  M.register = (id, factory) => { M.screens[id] = { factory, instance: null }; };
  const stack = [];
  M.current = () => stack[stack.length - 1];
  function mount(scr) {
    M.stage.replaceChildren(scr.node);
    M.root.classList.toggle('bf3m-on-main', !!scr.main);
    scr.node.classList.remove('bf3m-enter');
    void scr.node.offsetWidth;
    scr.node.classList.add('bf3m-enter');
    scr.onShow && scr.onShow();
    M.updateMusic();
  }
  function instance(id, params) {
    const e = M.screens[id];
    if (!e.instance) e.instance = e.factory(params);
    if (e.instance.setParams) e.instance.setParams(params);
    return e.instance;
  }
  M.push = function (id, params) {
    const cur = M.current();
    if (cur && cur.onHide) cur.onHide();
    const scr = instance(id, params);
    stack.push(scr);
    mount(scr);
  };
  M.back = function () {
    if (stack.length <= 1) return false;
    const cur = stack.pop();
    cur.onHide && cur.onHide();
    M.sfx.back();
    mount(M.current());
    return true;
  };
  M.reset = function (id) {
    while (stack.length) { const s2 = stack.pop(); s2.onHide && s2.onHide(); }
    M.push(id);
  };

  // ---------- Leaving the menu ----------
  M.isShown = () => !M.root.classList.contains('bf3m-hidden');
  const returnBtn = M.el('button', null, '◄ Main menu');
  returnBtn.id = 'bf3m-return';
  returnBtn.title = 'Back to the BF3 menu (Alt+M)';
  returnBtn.style.display = 'none';
  returnBtn.addEventListener('click', () => M.show());
  // Added to the page once; showing/hiding only flips classes so the page tree doesn't change.
  M.attach = function () { document.body.append(M.host, returnBtn); };
  M.show = function () {
    M.session.hidden = false;
    returnBtn.style.display = 'none';
    M.host.classList.remove('bf3m-host-hidden');
    M.root.classList.remove('bf3m-hidden');
    document.documentElement.classList.add('bf3m-active');
    M.styled.then(() => requestAnimationFrame(() => M.root.classList.add('bf3m-in')));
    M.refreshState();
    const cur = M.current();
    if (cur && cur.onShow) cur.onShow();
    M.updateMusic();
  };
  M.hide = function () {
    M.root.classList.remove('bf3m-in');
    M.root.classList.add('bf3m-hidden');
    M.host.classList.add('bf3m-host-hidden');
    document.documentElement.classList.remove('bf3m-active');
    returnBtn.style.display = '';
    M.updateMusic();
  };
  M.goBattlelog = function (path) {
    M.session.hidden = true;
    location.href = path;
  };
  M.requireLogin = async function () {
    await M.refreshState();
    if (!M.state.battlelogReady) { M.toast('Battlelog did not load (it may be busy). Wait a moment, then press F5.', 5000); return false; }
    if (M.state.loggedIn && M.state.persona) return true;
    M.toast('Sign in to Battlelog first', 3000);
    setTimeout(() => M.hide(), 1500);
    return false;
  };
})();

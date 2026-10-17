// Runs in Battlelog's own page so the menu can use Battlelog's join / launch / loadout functions.
// Talks to the content scripts through window.postMessage.
(function () {
  function reply(id, data) {
    window.postMessage({ source: 'bf3menu-bridge', id: id, data: data }, location.origin);
  }

  function state() {
    var ctx = (window.S && S.globalContext) || {};
    var session = ctx.session || {};
    var persona = (ctx.staticContext && ctx.staticContext.activePersona) || null;
    return {
      battlelogReady: !!window.S && !!window.gamemanager,
      loggedIn: !!session.isLoggedIn,
      persona: persona ? { name: persona.personaName, id: String(persona.personaId) } : null,
      userId: session.userId ? String(session.userId) : null,
      prefix: ctx.staticPrefix || null,
      friendsOnline: friendList().filter(function (f) { return f.online; }).length,
      pendingInvites: invites.length + friendRequests().length
    };
  }

  // ---------- Friends, friend requests and invites ----------
  // Presence bits (S.globalContext.staticContext.userPresenceStates). Some exceed 32 bits, so use BigInt.
  var P = { ONLINE_WEB: 1, ONLINE_TABLET: 2, ONLINE_MOBILE: 4, ONLINE_GAME: 8, ONLINE_ORIGIN: 16,
            PLAYING_MP: 256, PLAYING_COOP: 512, PLAYING_ORIGIN: 1024, AWAY_WEB: 65536, AWAY_ORIGIN: 131072 };
  function has(bits, flag) { try { return (BigInt(bits || 0) & BigInt(flag)) !== BigInt(0); } catch (e) { return false; } }

  function friendInfo(f) {
    var p = f.presence || {};
    var bits = p.presenceStates || '0';
    var mp = p.playingMp || null;
    var out = {
      username: f.username || '?',
      userId: f.userId ? String(f.userId) : null,
      personaName: p.personaName || (mp && mp.personaName) || null,
      personaId: (mp && mp.personaId) ? String(mp.personaId) : (p.personaId ? String(p.personaId) : null),
      online: has(bits, P.ONLINE_WEB | P.ONLINE_TABLET | P.ONLINE_MOBILE | P.ONLINE_GAME | P.ONLINE_ORIGIN),
      inGame: has(bits, P.ONLINE_GAME),
      playingMp: has(bits, P.PLAYING_MP),
      playingCoop: has(bits, P.PLAYING_COOP),
      away: has(bits, P.AWAY_WEB | P.AWAY_ORIGIN),
      server: null
    };
    if (mp && mp.serverGuid) {
      out.server = {
        guid: String(mp.serverGuid), name: mp.serverName || '', map: mp.levelName || '', mode: mp.gameMode || '',
        game: mp.game || null, platform: mp.platform || null
      };
    }
    return out;
  }

  function friendList() {
    var list = [];
    try { list = comcenter.getFriendsListFromLs() || []; } catch (e) {}
    if (!Array.isArray(list)) list = Object.keys(list).map(function (k) { return list[k]; });
    return list.map(friendInfo);
  }

  function friendRequests() {
    var st = null;
    try { st = $S('comcenter-surface-friendrequests').getState(); } catch (e) {}
    var arr = (st && st.friendrequests) || [];
    return arr.map(function (r) {
      var u = r.fromUser || r.user || r;
      return { username: u.username || r.username || '?', userId: String(u.userId || r.userId || r.fromUserId || ''), createdAt: r.createdAt || null };
    }).filter(function (r) { return r.userId; });
  }

  // Game / co-op invites only arrive live (Battlelog shows them as a popup), so keep the ones seen
  // while this page is open.
  var invites = [];
  function addInvite(kind, ev) {
    var d = (ev && ev.data) || ev || {};
    var from = d.fromUser || {};
    var sv = d.server || null;
    var key = kind + ':' + (d.fromUserId || from.userId || '') + ':' + (d.createdAt || '');
    for (var i = 0; i < invites.length; i++) if (invites[i].key === key) return;
    invites.unshift({
      key: key, kind: kind, from: from.username || 'A friend', fromUserId: String(d.fromUserId || from.userId || ''),
      createdAt: d.createdAt || Math.floor(Date.now() / 1000),
      server: sv ? { guid: String(sv.guid || ''), name: sv.name || '', map: sv.map || '', mapMode: sv.mapMode || '', maxPlayers: sv.maxPlayers || 0 } : null
    });
    if (invites.length > 20) invites.length = 20;
    window.postMessage({ source: 'bf3menu-bridge', event: 'invite', data: { kind: kind, from: invites[0].from } }, location.origin);
  }
  function hookInvites() {
    try {
      if (window.Push && Push.bind) {
        Push.bind('NotificationEventGameInvite', function (ev) { addInvite('game', ev); });
        Push.bind('NotificationEventCoopInvite', function (ev) { addInvite('coop', ev); });
      }
      // Also catch invites delivered straight to Battlelog's handlers.
      if (window.notificationevent) {
        ['handleGameInvite', 'handleCoopInvite'].forEach(function (fn) {
          var orig = notificationevent[fn];
          if (typeof orig !== 'function') return;
          notificationevent[fn] = function (ev) { addInvite(fn === 'handleGameInvite' ? 'game' : 'coop', ev); return orig.apply(this, arguments); };
        });
      }
    } catch (e) {}
  }
  hookInvites();

  function social() {
    var friends = friendList();
    return {
      friends: friends,
      requests: friendRequests(),
      invites: invites.slice(),
      friendsOnline: friends.filter(function (f) { return f.online; }).length
    };
  }

  function friendsPlaying() {
    return friendList().filter(function (f) { return f.server && f.server.guid; }).map(function (f) {
      return { name: f.username, serverName: f.server.name, serverGuid: f.server.guid, personaId: f.personaId, map: f.server.map };
    });
  }

  // What Battlelog's blue launch bar is showing, plus whether one of its dialogs is open.
  function launchState() {
    var ls = (window.gamemanager && gamemanager.launcherState) || {};
    var out = {};
    Object.keys(ls).forEach(function (k) {
      var v = ls[k];
      if (v === null || (typeof v !== 'object' && typeof v !== 'function')) out[k] = v;
    });
    if (ls.server && typeof ls.server === 'object') out.serverName = ls.server.name || '';
    try { out.pretty = ls.gameState ? gamemanager.gameStatePretty(ls.gameState) : ''; } catch (e) { out.pretty = ''; }
    var dc = document.getElementById('dialog-container');
    var open = false;
    if (dc) for (var i = 0; i < dc.children.length; i++) { var c = dc.children[i]; if (c.offsetWidth > 0 && c.offsetHeight > 0) open = true; }
    out.dialog = open;
    out.dialogText = open ? String(dc.innerText || '').replace(/\s+/g, ' ').slice(0, 200) : '';
    return out;
  }

  // ---------- Assignments and activity (translated with Battlelog's own text table) ----------
  function tr(key) { var T = (window.S && S.translations) || {}; return key ? (T[key] || key) : ''; }
  function me() {
    var p = S.globalContext.staticContext.activePersona;
    return { name: p.personaName, id: String(p.personaId), userId: String(S.globalContext.session.userId) };
  }
  function getJSON(url, ajaxNav) {
    var h = { 'X-Requested-With': 'XMLHttpRequest' };
    if (ajaxNav) h['X-AjaxNavigation'] = '1';
    return fetch(url, { headers: h, credentials: 'include' }).then(function (r) {
      if (!r.ok) throw new Error('Battlelog error ' + r.status);
      return r.json();
    });
  }

  var PACK_ORDER = ['1024', '512', '2048', '4096', '8192', '16384'];
  function missions(m) {
    var who = me();
    var base = '/bf3/soldier/missionsPopulateStats/' + encodeURIComponent(who.name) + '/' + who.id + '/' + who.userId + '/1/';
    Promise.all([getJSON(base), getJSON('/bf3/weaponsPopulateStats/' + who.id + '/1/').catch(function () { return null; })]).then(function (res) {
      var trees = res[0].data.missionTrees || {};
      var weapons = {};
      ((res[1] && res[1].data && res[1].data.mainWeaponStats) || []).forEach(function (w) { weapons[w.guid] = { code: w.code, name: w.name, slug: w.slug, category: w.category }; });
      var done = {};
      Object.keys(trees).forEach(function (exp) {
        var ms = trees[exp].missions || {};
        Object.keys(ms).forEach(function (code) { done[code] = (ms[code].completion || 0) >= 100; });
      });
      var groups = PACK_ORDER.filter(function (e) { return trees[e]; }).map(function (exp) {
        var t = trees[exp], ms = t.missions || {};
        var list = Object.keys(ms).sort().map(function (code) {
          var x = ms[code];
          var deps = (x.dependencies || []).map(function (d) { return d && (d.code || d); })
            .concat((x.unlockDependencies || []).map(function (d) { return d && d.award && d.award.code; })).filter(Boolean);
          var u = (x.unlocks || [])[0] || {};
          var up = (x.upcomingUnlocks || [])[0] || {};
          var weapon = u.guid && weapons[u.guid];
          return {
            code: code, name: tr(x.stringID), desc: tr(x.descriptionID), completion: x.completion || 0,
            completed: (x.completion || 0) >= 100,
            locked: deps.some(function (d) { return done[d] === false; }),
            image: 'profile/bf3/assignments/' + exp + '/' + (x.imageName || 'a00') + '.jpg',
            criteria: (x.criterias || []).map(function (c) {
              return { text: tr(c.descriptionID), actual: c.actualValue || 0, needed: c.completionValue || 0, completion: c.completion || 0 };
            }),
            reward: {
              kind: up.weaponUnlock ? 'weapon' : up.dogTagUnlock ? 'dogtag' : up.weaponAddonUnlock ? 'attachment' : up.kitItemUnlock ? 'gadget' : 'other',
              weapon: weapon || null
            }
          };
        });
        return { exp: exp, count: t.count || list.length, completed: t.completedCount || list.filter(function (l) { return l.completed; }).length, missions: list };
      });
      reply(m.id, { groups: groups });
    }).catch(function (e) { reply(m.id, { error: String(e.message || e) }); });
  }

  function activity(m) {
    var who = me();
    getJSON('/bf3/soldier/' + encodeURIComponent(who.name) + '/activity/' + who.id + '/pc/', true).then(function (j) {
      var stream = (j.context && j.context.activitystream) || [];
      var events = stream.map(function (e) {
        var p = e[e.eventName] || {};
        var out = { type: e.eventName, time: e.timestamp, items: [], info: {} };
        (p.statItems || []).forEach(function (it) {
          out.items.push({ name: tr(it.nameSID), desc: tr(it.descriptionSID), image: it.imageName || '', kind: it.type });
        });
        Object.keys(p).forEach(function (k) { var v = p[k]; if (v !== null && typeof v !== 'object') out.info[k] = v; });
        return out;
      });
      reply(m.id, { events: events });
    }).catch(function (e) { reply(m.id, { error: String(e.message || e) }); });
  }

  // Ping servers the way Battlelog does (through the EA app). m.servers: [{ key, ip }] -> { key: ms }.
  function ping(m) {
    var req = {}, want = 0, results = {}, finished = false;
    (m.servers || []).forEach(function (s) { if (s.ip) { req[s.key] = s.ip; want++; } });
    if (!want) return reply(m.id, { results: {} });
    function done() {
      if (finished) return;
      finished = true;
      try { launcher.unregisterForEvent('pingResult', onResult); } catch (e) {}
      reply(m.id, { results: results });
    }
    function onResult(ev, batch) {
      if (!batch || typeof batch !== 'object') return;
      Object.keys(batch).forEach(function (k) { if (k in req) results[k] = batch[k]; });
      if (Object.keys(results).length >= want) done();
    }
    try {
      launcher.registerForEvent('pingResult', onResult);
      launcher.pingServers(req);
    } catch (e) { return reply(m.id, { error: String(e) }); }
    setTimeout(done, m.timeout || 6000);
  }

  // Change loadout inputs inside the hidden Battlelog loadout page, then press its "Apply".
  function applyLoadout(m) {
    var frame = document.getElementById(m.frameId);
    if (!frame) return reply(m.id, { error: 'loadout page not loaded' });
    var w = frame.contentWindow, doc = w.document;
    var changes = m.changes || [];
    for (var i = 0; i < changes.length; i++) {
      var c = changes[i], sel;
      if (c.type === 'item') sel = '.profile-stats-loadout-selected-item-key[data-kit="' + c.kit + '"][data-slot="' + c.slot + '"]';
      else if (c.type === 'acc') sel = '.profile-stats-loadout-selected-item-accessory-key[data-parent="' + c.parent + '"][data-slot="' + c.slot + '"]';
      else sel = '.profile-stats-loadout-selected-vehicle-key[data-kit="' + c.kit + '"][data-slot="' + c.slot + '"]';
      var inputs = doc.querySelectorAll(sel);
      if (!inputs.length) return reply(m.id, { error: 'slot not found' });
      for (var j = 0; j < inputs.length; j++) inputs[j].value = c.value;
    }
    var done = false;
    var orig = w.base.showReceipt;
    w.base.showReceipt = function (msg, icon) {
      w.base.showReceipt = orig;
      if (done) return;
      done = true;
      reply(m.id, { ok: icon === 'checkbox', message: String(msg || '') });
    };
    var btn = doc.querySelector('#profile-stats-loadout-action-use');
    if (btn) btn.removeAttribute('disabled');
    try {
      w.profile.loadoutUse({ preventDefault: function () {} });
    } catch (err) {
      w.base.showReceipt = orig;
      done = true;
      reply(m.id, { error: String(err) });
    }
    setTimeout(function () { if (!done) { done = true; w.base.showReceipt = orig; reply(m.id, { error: 'no answer from Battlelog' }); } }, 15000);
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (e.source !== window || !m || m.source !== 'bf3menu') return;
    try {
      switch (m.cmd) {
        case 'state': reply(m.id, state()); break;
        case 'join':
          gamemanager.joinServerByGuid(m.guid, platforms.PC, games.BF3, m.friendPersonaId || null, gameServerRoleTypes.SOLDIER);
          reply(m.id, { ok: true });
          break;
        case 'social': reply(m.id, social()); break;
        case 'missions': missions(m); break;
        case 'ping': ping(m); break;
        case 'togglefav':
          $.ajax({
            url: '/bf3/gameserverbookmark/toggleFavourite/', type: 'POST', dataType: 'json',
            data: { guid: m.guid, 'post-check-sum': S.globalContext.session.postChecksum }
          }).always(function (res) {
            var ok = res && res.type === 'success';
            reply(m.id, ok ? { ok: true, added: res.message !== 'GAMESERVERBOOKMARK_REMOVED' } : { error: 'Battlelog did not accept that' });
          });
          break;
        case 'activity': activity(m); break;
        case 'friendrequest':
          friend[m.accept ? 'accept' : 'decline'](m.userId, function (success) { reply(m.id, { ok: !!success }); });
          break;
        case 'dismissinvite':
          invites = invites.filter(function (i) { return i.key !== m.key; });
          reply(m.id, { ok: true });
          break;
        case 'campaign':
          gamemanager.launchCampaign(games.BF3);
          reply(m.id, { ok: true });
          break;
        case 'friends': reply(m.id, { friends: friendsPlaying() }); break;
        case 'launchstate': reply(m.id, launchState()); break;
        case 'gamerunning':
          // Asks the EA app / plugin whether the BF3 process is still running.
          launcher.isGameRunning(games.BF3, function (running) { reply(m.id, { running: !!running }); });
          break;
        case 'cancel':
          if (gamemanager.launcherState && gamemanager.launcherState.gameState === launcher.STATE.IN_QUEUE) gamemanager.leaveQueue();
          else gamemanager.cancelGameLaunch(games.BF3);
          reply(m.id, { ok: true });
          break;
        case 'loadout': applyLoadout(m); break;
        default: reply(m.id, { error: 'unknown command' });
      }
    } catch (err) {
      reply(m.id, { error: String(err) });
    }
  });

  window.postMessage({ source: 'bf3menu-bridge', ready: true }, location.origin);
})();

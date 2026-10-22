# Changelog

All notable changes to Console-Style Menu for Battlelog.

## Unreleased

- Joining screen: when the server is full it now shows your position in the server queue (and whether
  premium priority applies) instead of "Still waiting for Battlelog…". Esc leaves the queue.

## 1.1.0

- Menu settings are now saved in the extension's own storage, so they no longer reset when Battlelog
  opens in a new window, on http:// instead of https://, or after the browser clears site data.
- Ambient menu music that loops seamlessly while the menu is shown (starts after your first key press or
  click, goes quiet while joining and in game).
- Start-up intro video, once per tab, with Esc / Enter / Space or click to skip. If the
  browser blocks video with sound, a "Press any key" title screen comes first.
- Options › Play intro on start (On / Off) and Watch intro.
- Main menu: Campaign, Co-op and Multiplayer are big, the other entries smaller, as on the console.
- Options › Menu music: Off / 25% / 50% / 75% / 100% (Enter cycles, Left / Right adjust).
- Server Browser: column separators in the header, centred favourite star, a proper ranked chevron icon
  and a narrower ping column.

## 1.0.0 — first public release

A console-style front end for Battlelog (Battlefield 3), shown on top of Battlelog in your browser.

### Main menu
- Full-screen console-style main menu: Campaign, Co-op, Multiplayer, My Soldier, Options, Credits, Quit.
- Keyboard and mouse controls, menu sounds, Alt+M to switch between the menu and normal Battlelog.
- Background art loaded from EA's own server and cached in the extension (not bundled).

### Multiplayer
- Server Browser with Browse, Friends, History, Favorites and Search tabs.
- Console-style filters: players, mode, map, preset, ranked, region, full servers.
- Real player counts: servers that report fake numbers are corrected and sorted by real players.
- Ping in milliseconds with signal bars, measured through the EA app like Battlelog.
- Server Settings page: description, map, mode, players, ping, preset, region, all game settings,
  player list, map rotation, join, add/remove favorite.
- Joining screen that follows Battlelog's join progress (queue, connecting, loading, in game) and
  returns to the menu when the game closes. Campaign launch uses the same screen.

### My Soldier
- Multiplayer Stats with Stats, Ribbons and Medals tabs.
- Multiplayer Progression for kits, vehicles and rank, with rank insignia.
- Customize: edit kit, land and air vehicle loadouts, saved through Battlelog.
- My Dog Tag: browse all dog tags, see times taken and last victim, equip left and right tags.
- Assignments (per expansion pack, with requirements and rewards), Unlocks, and Game Activity.

### Social
- Friends list with online / in-game status; join a friend's game or open their profile.
- Invites: game and co-op invites received while the menu is open, and friend requests (accept / decline).

### Quality
- Layout adapts to any screen shape (16:9, 16:10, 4:3, 5:4, ultrawide).
- The menu is isolated from Battlelog and other extensions (closed Shadow DOM).
- Gentle on Battlelog: caching, on-screen-only lookups, per-minute limits, automatic pause when busy.
- No data collection, no analytics, no third-party servers. See PRIVACY.md.

# Console-Style Menu for Battlelog

A fan-made Chrome extension that turns **Battlelog** (Battlefield 3's website) into a menu that looks and
works like the Battlefield 3 **console** menus: full-screen, keyboard and mouse driven, with the console's
layout, tabs and button hints.

> **Not affiliated with EA or DICE.** Battlefield 3 and Battlelog are trademarks of Electronic Arts. This
> extension only changes how Battlelog looks in *your* browser. It does not touch the game, its files or
> its anti-cheat.

---

## What it does

When you open `battlelog.battlefield.com/bf3/`, the menu appears on top of Battlelog. Everything it shows
comes from your own Battlelog account and Battlelog's public server list.

| Screen | What you get |
|---|---|
| **Main menu** | Campaign, Co-op, Multiplayer, My Soldier, Options, Credits, Quit |
| **Server Browser** | Browse / Friends / History / Favorites / Search tabs, console-style filters, real player counts (servers that fake their count are exposed), ping in ms with signal bars, ranked servers |
| **Server Settings** | Server description, map, mode, players, ping, preset, region and every game setting (friendly fire, kick idle, team balance…), plus the player list and map rotation. Join or add to favorites |
| **Joining** | A console-style loading screen that follows Battlelog's join progress (queue position, connecting, loading, in game) and returns to the menu when you quit the game |
| **My Soldier** | Stats, ribbons, medals, progression (kits, vehicles, rank), Customize (edit loadouts for kits, land and air vehicles), My Dog Tag (equip left/right tags), Assignments, Unlocks, Game Activity |
| **Friends / Invites** | Friends online and in game (join their server), game and co-op invites, friend requests (accept / decline) |
| **Options** | Menu sounds, menu music volume, play intro on start, watch intro, show menu on start, mirror the main-menu art, reset server filters |

### Controls

| Key | Action |
|---|---|
| Arrow keys / mouse | Move |
| **Enter** | Select (on the server list: open Server Settings) |
| **Space** | Join the selected server |
| **Esc** / Backspace | Back |
| **Q / E** | Previous / next tab (the console's LB / RB) |
| **F** | Server filters (list) · add/remove favorite (Server Settings) |
| **R** | Refresh the server list |
| **Alt+M** | Show / hide the menu and use normal Battlelog |

---

## Privacy and safety

**Short version: the extension does not collect, send or sell anything. It has no server of its own, no
analytics and no tracking. It never sees your password.**

### What it is allowed to do (permissions)

| Permission | Why |
|---|---|
| Runs on `battlelog.battlefield.com/bf3/*` | To draw the menu on Battlelog. It runs on **no other website**. |
| Storage | To save your menu settings in the extension's own storage, so they are kept between visits. |
| Access to `data1.origin.com` | To download the menu's background picture from **EA's own image server** (see below). Nothing else is requested there. |

It does **not** ask for your browsing history, your tabs, your other websites, downloads, clipboard or
anything else.

### What it stores on your computer

Only these, and only in your browser:

| What | Where | Contents |
|---|---|---|
| `bf3m.prefs` | The extension's own storage (stays until you remove the extension) | Your menu settings: sounds on/off, music volume, intro on/off, show on start, mirror art, server filters |
| `bf3m.hidden` | Battlelog's session storage (this tab only, cleared when it closes) | Whether you hid the menu with Alt+M |
| `bf3m.introSeen` | Battlelog's session storage (this tab only, cleared when it closes) | Whether the intro already played, so it plays once per tab |
| Background picture | The extension's own cache | EA's Battlefield 3 artwork, re-downloaded only if the cache is cleared or after 30 days |

Your soldier name, stats, friends, loadouts and so on are **only kept in memory** while the page is open,
and are never written to disk by the extension or sent anywhere.

### Who it talks to

| Address | What for |
|---|---|
| `battlelog.battlefield.com` | Everything the menu shows and does, using **your existing Battlelog sign-in** (the same requests Battlelog's own pages make). Details below. |
| `cdn.battlelog.com`, `d34ymitoc1pg7m.cloudfront.net` | Battlelog's own image servers: map, weapon, vehicle, ribbon, medal and rank pictures |
| `data1.origin.com` | EA's image server: the menu background (once, then cached) |
| The EA app | Server **ping**, measured the same way Battlelog measures it |

No other servers are contacted.

#### Read requests (Battlelog)

- Server list, favorites and history: `/bf3/servers/getAutoBrowseServers/`, `/bf3/servers/favourites/`, `/bf3/servers/history/`
- Server details and real player counts: `/bf3/servers/show/pc/…`, `/bf3/servers/getPlayersOnServer/pc/…`
- Your stats: `/bf3/overviewPopulateStats/…`, `/bf3/vehiclesPopulateStats/…`, `/bf3/weaponsPopulateStats/…`
- Assignments and activity: `/bf3/soldier/missionsPopulateStats/…`, your soldier's Activity page
- Ribbons/medals, unlocks, dog tags and loadouts: your soldier's Battlelog pages for these, loaded
  invisibly in the background because Battlelog only shows that information as web pages
- Friends and invites: read from Battlelog's chat panel that is already on the page (no extra requests)

#### Things it changes — **only when you choose to**

Each of these is the same action as clicking the matching button on Battlelog:

| You… | It uses |
|---|---|
| Join a server, a friend's game or the campaign | Battlelog's own join / launch |
| Cancel a join | Battlelog's own cancel / leave queue |
| Equip a weapon, attachment, gadget or vehicle upgrade | Battlelog's loadout **Apply** (`/bf3/soldier/loadout/use/`) |
| Equip a dog tag | Battlelog's **Save Dog Tags** (`/bf3/user/savedogtag/`) |
| Add / remove a favorite server | Battlelog's favorite button (`/bf3/gameserverbookmark/toggleFavourite/`) |
| Accept / decline a friend request | Battlelog's own accept / decline |

Nothing is ever changed automatically.

### Being a good guest on Battlelog

Battlelog limits how many requests a browser may send. The extension keeps its traffic low on purpose:
lists are cached for a short time, real player counts and pings are checked only for the servers on screen,
lookups are capped per minute, and everything pauses for two minutes if Battlelog says it is busy.

### Built to stay out of the way

- The menu lives in a sealed-off part of the page (a *closed Shadow DOM*), so it can't interfere with
  Battlelog's own scripts or with other Battlelog extensions, and they can't read the menu.
- It never inserts text from servers or other players as code: server names and descriptions are always
  shown as plain text.
- It does not modify Battlefield 3, its files, its settings or PunkBuster. It is not a cheat or a hack.

### Check it yourself

The code is plain, readable JavaScript (nothing minified or hidden). In Chrome you can also open
**DevTools → Network** on Battlelog to see every request.

### Removing it

- Uninstall it from `chrome://extensions`: this also deletes the cached background picture.
- To remove the saved menu settings as well, clear the site data for `battlelog.battlefield.com`
  (Chrome → Settings → Privacy → Site data).

---

## Install

**From the Chrome Web Store:** click *Add to Chrome*.

**From these files (for testing):**

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Open or refresh Battlelog.

You need to be signed in to Battlelog for My Soldier, loadouts, friends and joining. The server browser
works without signing in.

---

## Known limitations

- Some screens read text from Battlelog's pages, so they work best with Battlelog in **English**.
- **Co-op** still opens Battlelog's own Co-op page.
- Game and co-op invites only appear if they arrive while Battlelog is open (Battlelog does not save them).
- Pictures come from Battlelog's and EA's servers; if those change or are down, some pictures may be missing.

## For developers

- `manifest.json`: the extension definition (Manifest V3)
- `background.js`: Quit and the background-art cache
- `bridge.js`: runs inside Battlelog's page to call Battlelog's own functions (join, loadout, ping…)
- `src/`: the screens (`main.js`, `mp.js`, `serverinfo.js`, `soldier.js`, `customize.js`, `dogtags.js`,
  `records.js`, `social.js`, `joining.js`) and data tables (`data.js`, `ranks.js`, `vehicles.js`, `weapons.js`)
- `menu.css`: the menu's styles; `page.css`: the few styles applied to Battlelog's page
- After editing the files, click the reload ↻ icon on the extension in `chrome://extensions`, then refresh Battlelog.

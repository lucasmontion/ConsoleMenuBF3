# Chrome Web Store listing — Console-Style Menu for Battlelog 1.0.0

Copy these into the Developer Dashboard.

## Store listing tab

**Name:** Console-Style Menu for Battlelog

**Summary (max 132 characters):**
A console-style menu for Battlelog (Battlefield 3): server browser, stats, loadouts, dog tags and more. Fan-made, no data collected.

**Category:** Fun (or Social & Communication)

**Language:** English

**Description:**

Turn Battlelog into a Battlefield 3 console-style menu.

Console-Style Menu for Battlelog shows Battlelog (battlelog.battlefield.com) as a full-screen menu inspired by the Battlefield 3 console menus, with keyboard and mouse controls.

• Server Browser with Browse, Friends, History, Favorites and Search, console-style filters, real player counts (servers that fake their numbers are corrected) and ping with signal bars
• Server Settings: description, map, mode, players, ping, preset, region and every game setting, with player list and map rotation
• Joining screen that follows your join progress and returns to the menu when you quit the game
• My Soldier: stats, ribbons, medals, progression, assignments, unlocks and game activity
• Customize your kit and vehicle loadouts and equip dog tags, saved through Battlelog
• Friends and invites: see who is playing, join their game, accept friend requests
• Works on any screen shape (16:9, 16:10, 4:3, ultrawide)
• Press Alt+M at any time to switch back to normal Battlelog

Privacy: no data collection, no analytics, no third-party servers. The extension only reads Battlelog with your own sign-in and only changes things when you click. Full details in the privacy policy.

Fan-made project. Not affiliated with, endorsed by or sponsored by Electronic Arts or DICE. Battlefield, Battlefield 3 and Battlelog are trademarks of Electronic Arts.

**Graphics:**
- Store icon (128×128): `Menu/icons/icon128.png`
- Screenshots (1280×800): `store/screenshot-1-main-menu.png`, `store/screenshot-2-server-browser.png`
- Small promo tile (440×280): `store/promo-small-440x280.png`

## Privacy tab

**Single purpose description:**
Displays the Battlelog website (Battlefield 3) as a console-style menu, so players can browse servers, view their soldier and manage loadouts from that menu.

**Permission justifications:**

- **Host permission `data1.origin.com`:** Used only to download the menu's background picture (Battlefield 3 artwork) from EA's own image server, so the artwork is not bundled in the extension. The picture is cached locally and refreshed every 30 days.
- **Content script on `battlelog.battlefield.com/bf3/*`:** The extension's single purpose is to display Battlelog as a menu, so it must run on Battlelog's BF3 pages. It runs on no other site.

**Are you using remote code?** No. All JavaScript is included in the package. (The extension downloads only an image and Battlelog data, never code.)

**Data usage — what user data do you collect?**
"Collect" means data that leaves the user's device to the developer or third parties. The extension sends nothing to the developer or any third party. Recommended, to be transparent about what it *handles* on the device:

- [x] **Website content** (it reads Battlelog pages and data to display them)
- [x] **Personally identifiable information** (the user's Battlelog soldier name is shown in the menu)
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information (it never sees passwords; Battlelog's own sign-in is used)
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity

**Certifications (check all three):**
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the public address of `PRIVACY.md`
(e.g. `https://github.com/<you>/<repo>/blob/main/PRIVACY.md`)

## Distribution tab

- Visibility: Public (or Unlisted to share by link first)
- Regions: All regions
- Pricing: Free

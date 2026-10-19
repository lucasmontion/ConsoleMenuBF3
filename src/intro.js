// Start-up intro: plays video/intro.mp4 full screen over the menu, once per browser session.
// Browsers block video with sound until the page has been used, so when playing with sound is refused
// a console-style "Press any key" title screen comes first. Esc / Enter / Space or a click skips.
(() => {
  const M = BF3M, el = M.el;
  const SEEN_KEY = 'bf3m.introSeen';
  const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } };
  const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {} };

  M.shouldPlayIntro = () => M.prefs.intro !== false && !seen();

  M.playIntro = function () {
    if (M.introPlaying) return;
    M.introPlaying = true;
    M.updateMusic();
    const box = el('div', 'bf3m-intro');
    const video = el('video');
    video.src = chrome.runtime.getURL('video/intro.mp4');
    video.playsInline = true;
    video.preload = 'auto';
    const title = el('div', 'bf3m-intro-title');
    const logo = el('div', 'bf3m-logo', 'Battlefield');
    logo.append(el('span', 'bf3m-three', '3'));
    title.append(logo, el('div', 'bf3m-intro-press', 'Press any key'));
    const foot = el('div', 'bf3m-foot');
    M.footer(foot, [['Esc', 'Skip', (e) => { e.stopPropagation(); finish(); }, 'bf3m-k-b']]);
    box.append(video, title, foot);
    M.root.append(box);
    let state = 'loading'; // loading -> (title ->) playing -> done

    function start(byUser) {
      video.muted = false;
      video.play().then(() => {
        if (state === 'done') return video.pause();
        state = 'playing';
        box.classList.remove('bf3m-intro-ask');
        box.classList.add('bf3m-intro-playing');
        M.unlockAudio();
      }, (err) => {
        if (state === 'done') return;
        if (!byUser && err && err.name === 'NotAllowedError') { state = 'title'; box.classList.add('bf3m-intro-ask'); }
        else finish();
      });
    }
    function finish() {
      if (state === 'done') return;
      state = 'done';
      markSeen();
      window.removeEventListener('keydown', onKey, true);
      video.pause();
      box.classList.add('bf3m-intro-out');
      M.introPlaying = false;
      M.updateMusic();
      setTimeout(() => { box.remove(); video.removeAttribute('src'); video.load(); }, 600);
    }
    // main.js's key handler ignores keys while M.introPlaying, so the menu underneath never sees these.
    function onKey(e) {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) return finish(); // let Alt+M through
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.key === 'Escape') finish();
      else if (state === 'title') start(true);
      else if (state === 'playing' && (e.key === 'Enter' || e.key === ' ')) finish();
    }
    window.addEventListener('keydown', onKey, true);
    box.addEventListener('click', () => (state === 'title' ? start(true) : finish()));
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    start(false);
  };
})();

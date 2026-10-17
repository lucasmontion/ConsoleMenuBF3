// QUIT: close the tab the menu is running in (in a Chrome app window, that closes the window).
// ART: the menu background, loaded from EA's own server (not shipped in the extension) and kept in
//      the extension's cache so it is downloaded once, then again only if the cache is cleared or old.

const ART_URL = 'https://data1.origin.com/asset/content/dam/originx/web/app/games/battlefield/battlefield-3/' +
  'battlefield-3-standard-edition_library_3840x2160_en_WW.jpg/a129dca3-35a4-49ac-be4c-7b813cd82383/original.jpg';
const ART_CACHE = 'bf3m-art-v1';
const ART_MAX_AGE = 30 * 24 * 3600 * 1000; // re-download after 30 days

async function blobToDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(bin)}`;
}

async function getArt() {
  const cache = await caches.open(ART_CACHE);
  const cached = await cache.match(ART_URL);
  const fetchedAt = cached ? Number(cached.headers.get('x-bf3m-fetched-at')) || 0 : 0;
  if (cached && Date.now() - fetchedAt < ART_MAX_AGE) return blobToDataUrl(await cached.blob());
  try {
    const r = await fetch(ART_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    if (!/^image\//.test(blob.type)) throw new Error('not an image');
    await cache.put(ART_URL, new Response(blob, { headers: { 'Content-Type': blob.type, 'x-bf3m-fetched-at': String(Date.now()) } }));
    return blobToDataUrl(blob);
  } catch (e) {
    // EA's server unreachable: keep using the old copy if there is one.
    if (cached) return blobToDataUrl(await cached.blob());
    throw e;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'quit' && sender.tab) chrome.tabs.remove(sender.tab.id);
  if (msg.type === 'art') {
    getArt().then((dataUrl) => sendResponse({ dataUrl }), (e) => sendResponse({ error: String(e.message || e) }));
    return true; // answer asynchronously
  }
});

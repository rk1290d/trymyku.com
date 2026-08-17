/* Myku Auto analytics: privacy-light, cookie-free pageview logging.
   Records an anonymous hit (path, referrer host, ?src tag, a random first-party
   visitor id) to Supabase. Insert-only: this key can write but never read the
   data back. No personal data, no cross-site cookies. Fails silently. */
(function () {
  try {
    // A mechanic's own private previews are not page views.
    if ((location.pathname || '').indexOf('/preview/') === 0) return;
    var ENDPOINT = 'https://fioiaoxaozqfwdqukoho.supabase.co/rest/v1/page_views';
    var KEY = 'sb_publishable_Wp39xMC488ds7jL9MY4HfA_GksslO4S';
    var VK = 'myku_vid';

    var vid;
    try {
      vid = localStorage.getItem(VK);
      if (!vid) {
        vid = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : (Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem(VK, vid);
      }
    } catch (e) { vid = null; }

    var src = null, ref = null;
    try { src = new URLSearchParams(location.search).get('src'); } catch (e) {}
    try { if (document.referrer) ref = new URL(document.referrer).hostname; } catch (e) {}
    if (ref && ref.indexOf('trymyku.com') !== -1) ref = null; // ignore internal hops

    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        path: (location.pathname || '/').slice(0, 200),
        referrer: ref,
        src: src ? src.slice(0, 60) : null,
        visitor_id: vid
      }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();

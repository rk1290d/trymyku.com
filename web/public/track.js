/* Myku Auto analytics: privacy-light, cookie-free pageview logging.
   Records an anonymous hit (path, referrer host, ?src tag, a random first-party
   visitor id) to Supabase. Insert-only: this key can write but never read the
   data back. No personal data, no cross-site cookies. Fails silently.

   DO NOT ADD SANITISING HERE. The key below is published in this file, which is
   the whole point of it, so anyone can POST any row they like straight to
   PostgREST without ever loading this script. A cleaning step in here would
   therefore never touch a hostile row - it would only ever throw away an honest
   visitor's data, which is a guard that fires when there is nothing to guard.
   The place the values are actually made safe is /stats.js, which renders
   every one of them with textContent instead of building markup, backed by
   the Content-Security-Policy in stats.html. The page_views no-markup CHECK
   constraints are live too, so a hostile row is refused at the table; the
   render end is what holds anything that still gets in.

   If a value ever needs to be trusted, trust it there, not here. */
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

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
   the Content-Security-Policy in stats.html. That is the ONLY lock standing
   today, and it is the one that holds whatever reaches the table.

   A second lock is written but NOT YET APPLIED: the page_views CHECK
   constraints in the app repo's migration 20240101000120 refuse to store
   markup at all. Checked against the live database on 2026-09-01 - page_views
   still carries only its four length CHECKs (path, referrer, src, visitor_id),
   so until that migration is applied a row CAN hold markup and the render end
   is what stops it running. Delete this paragraph once it is applied.

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

/* Myku Analytics dashboard, 2026-09-01.
   Split out of stats.html so the page can forbid inline script entirely.

   READ THIS BEFORE EDITING ANY RENDER BELOW.
   Every value this file renders arrives from the database, and two of the
   tables behind get_site_stats accept writes from ANY anonymous visitor by
   design: page_views (the tracker in /track.js posts with the publishable key,
   which is public) and mechanic_waitlist (the sign-up form on the marketing
   pages). Checked live on 2026-09-01: NEITHER table has a write-side rule that
   refuses markup. page_views carries four length CHECKs and nothing else;
   mechanic_waitlist carries length checks plus an email-format and a work-type
   check. So a path, a referrer or a ?src tag is attacker-controlled text that
   lands in this dashboard, and this dashboard is opened by the owner,
   authenticated, on the trymyku.com origin.

   The app repo's migration 20240101000120 adds markup-refusing CHECKs to
   page_views, and it is not applied yet. Even after it is, mechanic_waitlist
   will still have none, so this render end stays the authoritative defence
   rather than a belt over braces. Do not weaken it on the strength of a
   constraint upstream.

   Therefore: NOTHING from the payload is ever concatenated into markup. Rows
   are built with createElement and their text is set with textContent, which
   renders a string as characters and can never execute it. Before this file
   existed, two innerHTML string concatenations here would run a planted
   <img onerror=...> in the owner's browser.

   The Content-Security-Policy in stats.html is the second line of that
   defence, and it is why this file is external rather than an inline <script>:
   with script-src 'self' there is no inline execution at all, so a future edit
   that reintroduces concatenation still cannot run a payload. If you ever move
   this code back inline, the CSP must be relaxed to 'unsafe-inline' and that
   second line of defence is gone. Do not. */
(function () {
  var FN = 'https://fioiaoxaozqfwdqukoho.supabase.co/functions/v1/stats';
  var gate = document.getElementById('gate'), dash = document.getElementById('dash');
  var pass = document.getElementById('pass'), go = document.getElementById('go'), err = document.getElementById('err');
  var SK = 'myku_stats_pass';

  function n(x) { return (x == null ? 0 : x).toLocaleString(); }
  function set(id, v) { document.getElementById(id).textContent = v; }

  // ---- DOM builders. The only way text from the database enters this page. ----
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function rowOf(cells) {
    var tr = document.createElement('tr');
    for (var i = 0; i < cells.length; i++) tr.appendChild(cells[i]);
    return tr;
  }
  function emptyRow(span, text) {
    var td = el('td', 'empty', text);
    td.colSpan = span;
    return rowOf([td]);
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function render(d) {
    set('k_vt', n(d.visits_today)); set('k_ut', n(d.uniques_today));
    set('k_v7', n(d.visits_7d)); set('k_u7', n(d.uniques_7d));
    set('k_v30', n(d.visits_30d));
    set('k_mt', n(d.mech_signups_total)); set('k_m7', n(d.mech_signups_7d));
    set('k_ct', n(d.cust_signups_total));
    document.getElementById('asof').textContent = 'Updated ' + new Date(d.generated_at).toLocaleString();

    // chart
    var daily = d.daily || [], max = 1;
    daily.forEach(function (x) { if (x.visits > max) max = x.visits; });
    var ch = document.getElementById('chart'); clear(ch);
    if (!daily.length) {
      ch.appendChild(el('div', 'empty', 'No visits recorded yet. Share your links and check back.'));
    }
    daily.forEach(function (x) {
      var h = Math.max(4, Math.round(Number(x.visits) / max * 130));
      if (!isFinite(h)) h = 4;
      var lbl = new Date(x.day + 'T00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      var b = el('div', 'bar');
      b.appendChild(el('div', 'n', x.visits));
      var col = el('div', 'col'); col.style.height = h + 'px';
      b.appendChild(col);
      b.appendChild(el('div', 'd', lbl));
      ch.appendChild(b);
    });

    // conversion: merge visits-by-source with signups-by-source
    var sig = {}; (d.mech_by_source || []).forEach(function (m) { sig[m.source] = m.signups; });
    var conv = document.getElementById('t_conv'); clear(conv);
    var bs = d.by_source || [];
    if (!bs.length) { conv.appendChild(emptyRow(4, 'No traffic yet.')); }
    bs.forEach(function (s) {
      var key = (s.source === '(direct/none)') ? 'site' : s.source;
      var sg = sig[key] || 0;
      var pct = s.visits ? ((sg / s.visits * 100).toFixed(1) + '%') : '-';
      var pill = el('td', 'r');
      pill.appendChild(el('span', 'pill', pct));
      conv.appendChild(rowOf([
        el('td', 'src', s.source),
        el('td', 'r', n(s.visits)),
        el('td', 'r', n(sg)),
        pill
      ]));
    });

    fill('t_ref', d.by_referrer, 'referrer', 'visits');
    fill('t_path', d.by_path, 'path', 'visits');
    fill('t_msrc', d.mech_by_source, 'source', 'signups');
  }

  function fill(id, arr, k, vk) {
    var t = document.getElementById(id); clear(t); arr = arr || [];
    if (!arr.length) { t.appendChild(emptyRow(2, 'None yet.')); return; }
    arr.forEach(function (x) {
      t.appendChild(rowOf([el('td', 'src', x[k]), el('td', 'r', n(x[vk]))]));
    });
  }

  function load(p) {
    err.textContent = ''; go.textContent = 'Loading…'; go.disabled = true;
    fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: p }) })
      .then(function (r) { if (r.status === 401) { throw new Error('Wrong passphrase.'); } if (!r.ok) { throw new Error('Error ' + r.status); } return r.json(); })
      .then(function (d) { if (d.error) { throw new Error(d.error); } sessionStorage.setItem(SK, p); gate.classList.add('hidden'); dash.classList.remove('hidden'); render(d); })
      .catch(function (e) { err.textContent = e.message || 'Something went wrong.'; })
      .finally(function () { go.textContent = 'View dashboard'; go.disabled = false; });
  }

  go.addEventListener('click', function () { if (pass.value) load(pass.value); });
  pass.addEventListener('keydown', function (e) { if (e.key === 'Enter' && pass.value) load(pass.value); });
  document.getElementById('refresh').addEventListener('click', function () { var p = sessionStorage.getItem(SK); if (p) load(p); });
  var saved = sessionStorage.getItem(SK); if (saved) { load(saved); }
})();

// Social links for the storefront. Lives in lib/ so BOTH the loaders
// (lib/pageData.ts) and the renderer (components/Storefront.tsx) can use it
// without a circular import: the loaders sanitise page.socials before it
// reaches any component, and the renderer builds the links from the same
// allowlist.

/* ------------------------------------------------------------------
   SOCIAL LINKS

   A STRICT per-platform host allowlist. The stored URL's host is never
   trusted: a value filed under "instagram" that points anywhere but
   Instagram is dropped, not linked, because the label the visitor reads is
   Myku's word for where the link goes. Bare handles are rebuilt onto the
   canonical host. "website" is the one free host, and it may not borrow a
   social host or point back into storage. Anything that fails is dropped;
   nothing is ever "fixed up" into a link the mechanic did not enter.
   ------------------------------------------------------------------ */
type SocialKey = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'x' | 'website';
const SOCIAL_ORDER: SocialKey[] = ['instagram', 'tiktok', 'facebook', 'youtube', 'x', 'website'];
const SOCIAL_HOSTS: Record<Exclude<SocialKey, 'website'>, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  x: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
};
const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  x: 'X',
  website: 'Website',
};
const ANY_SOCIAL_HOST = new Set(Object.values(SOCIAL_HOSTS).flat());
// Handles are path segments. Every platform here allows only these
// characters, so anything else is not a handle and is dropped rather than
// escaped into a URL that was never typed.
const HANDLE_RE = /^[A-Za-z0-9._-]{1,64}$/;

// Exported so the loaders can SANITISE page.socials before it reaches any
// component: only entries that survive this allowlist are kept on the object.
// Otherwise a rejected value (say a TikTok key pointing at an arbitrary host)
// is dropped from the rendered links but still shipped to the browser inside
// the RSC payload as raw props. It should not exist past the loader at all.
export function sanitizeSocials(
  socials: Record<string, string> | null | undefined
): Record<string, string> | null {
  const kept = socialLinks(socials);
  if (kept.length === 0) return null;
  const out: Record<string, string> = {};
  for (const l of kept) out[l.key] = l.url;
  return out;
}

export function socialLinks(
  socials: Record<string, string> | null | undefined
): { key: SocialKey; url: string; label: string }[] {
  const out: { key: SocialKey; url: string; label: string }[] = [];
  if (!socials || typeof socials !== 'object') return out;
  for (const key of SOCIAL_ORDER) {
    const raw = socials[key];
    if (typeof raw !== 'string') continue;
    const v = raw.trim();
    if (!v) continue;

    let url: string | null = null;
    if (/^https?:\/\//i.test(v)) {
      let u: URL;
      try {
        u = new URL(v);
      } catch {
        continue;
      }
      if (u.protocol !== 'https:' || u.username || u.password) continue;
      const host = u.hostname.toLowerCase();
      if (key === 'website') {
        if (!host || ANY_SOCIAL_HOST.has(host) || host.endsWith('.supabase.co')) continue;
      } else if (!SOCIAL_HOSTS[key].includes(host)) {
        continue;
      }
      url = u.href;
    } else if (key === 'website') {
      let u: URL;
      try {
        u = new URL(`https://${v}`);
      } catch {
        continue;
      }
      if (u.protocol !== 'https:' || u.username || u.password) continue;
      const host = u.hostname.toLowerCase();
      if (!host || !host.includes('.') || ANY_SOCIAL_HOST.has(host) || host.endsWith('.supabase.co'))
        continue;
      url = u.href;
    } else {
      const handle = v.replace(/^[@/]+/, '');
      if (!HANDLE_RE.test(handle)) continue;
      const at = key === 'tiktok' || key === 'youtube' ? '@' : '';
      url = `https://${SOCIAL_HOSTS[key][0]}/${at}${handle}`;
    }
    if (url) out.push({ key, url, label: SOCIAL_LABEL[key] });
  }
  return out;
}

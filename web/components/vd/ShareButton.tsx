'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

// SHARE: so she can forward his page to whoever decides (a spouse, a parent).
// The phone's own share sheet where there is one; otherwise the link is copied;
// and where the browser refuses both (some in-app browsers), the address itself
// is shown selected so it can be copied by hand. Rendered hidden until this
// script runs: without it the button could not do anything.
export default function ShareButton({ label, aria, url, title }: { label: string; aria: string; url: string; title: string }) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (panel) inputRef.current?.select();
  }, [panel]);

  async function onShare() {
    const href = url || window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: href });
        return;
      } catch (e) {
        // she closed the sheet: nothing to do
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setPanel(true);
    }
  }

  return (
    <span className="share-wrap" hidden={!ready}>
      <button className="share" type="button" aria-label={aria} onClick={onShare}>
        <Icon name={copied ? 'link' : 'export'} />
        <span>{copied ? 'Link copied' : label}</span>
      </button>
      {panel ? (
        <span className="share-panel">
          <label htmlFor="vd-share-url">Copy this link</label>
          <input
            id="vd-share-url"
            ref={inputRef}
            readOnly
            value={url}
            onBlur={() => setPanel(false)}
            onFocus={(e) => e.currentTarget.select()}
          />
        </span>
      ) : null}
    </span>
  );
}

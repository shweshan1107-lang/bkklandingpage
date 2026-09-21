import React, { useEffect, useState } from 'react';
import './SimpleLanding.css';

function getGameUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function getBackgroundUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (/[\\\x00-\x1f\x7f]/.test(text)) return '';
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  return getGameUrl(text);
}

function BackgroundImage({ desktop, mobile }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <picture className={`bkk-entry-background${loaded ? ' is-loaded' : ''}`} aria-hidden="true">
      <source media="(max-width: 760px)" srcSet={mobile || desktop} />
      <img src={desktop || mobile} alt="" decoding="async" fetchPriority="high"
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
    </picture>
  );
}

function OrnamentalCorner({ position }) {
  return (
    <svg className={`bkk-entry-corner bkk-entry-corner-${position}`} viewBox="0 0 110 110" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 99V33C8 19 19 8 33 8h66M16 85V36c0-11 9-20 20-20h49" />
        <path d="M24 77c0-28 17-30 29-40 9-8 10-20 22-20 9 0 13 11 7 16-5 5-13 0-9-5" />
        <path d="M77 24c-28 0-30 17-40 29-8 9-20 10-20 22 0 9 11 13 16 7 5-5 0-13-5-9" />
        <path d="M27 27c5-10 17-8 20-1 4 10-5 18-14 17-7-1-9-8-4-11 4-2 7 2 4 4" />
        <path d="M49 45c4 5 10 7 16 4-3-6-9-7-16-4ZM45 49c5 4 7 10 4 16-6-3-7-9-4-16Z" fill="currentColor" fillOpacity=".18" />
        <path d="M59 25c-1-7-6-11-12-12 0 7 5 12 12 12ZM25 59c-7-1-11-6-12-12 7 0 12 5 12 12Z" fill="currentColor" fillOpacity=".22" />
      </g>
      <path d="m18 18 4 4-4 4-4-4 4-4ZM93 7l3-3 3 3-3 3-3-3ZM7 93l3 3-3 3-3-3 3-3Z" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    setStatus('loading');

    async function loadSettings() {
      try {
        const response = await fetch('/api/public/site', {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Site unavailable');
        const payload = await response.json();
        const nextSettings = payload?.data?.settings;
        if (payload.ok === false || !nextSettings || !getGameUrl(nextSettings.gameUrl)) {
          throw new Error('Link unavailable');
        }
        if (!disposed) {
          setSettings(nextSettings);
          setStatus('ready');
        }
      } catch {
        if (!disposed) setStatus('error');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    loadSettings();
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const brand = typeof settings?.brand === 'string' && settings.brand.trim()
    ? settings.brand.trim()
    : 'BKK';
  const welcome = typeof settings?.landingWelcome === 'string' && settings.landingWelcome.trim()
    ? settings.landingWelcome.trim()
    : 'BKK မြန်မာ မှ ကြိုဆိုပါသည်။';
  const backgroundDesktop = getBackgroundUrl(settings?.backgroundDesktop);
  const backgroundMobile = getBackgroundUrl(settings?.backgroundMobile);

  return (
    <main className="bkk-entry-page" lang="my">
      {(backgroundDesktop || backgroundMobile) && (
        <BackgroundImage key={`${backgroundDesktop}|${backgroundMobile}`} desktop={backgroundDesktop} mobile={backgroundMobile} />
      )}
      <div className="bkk-entry-lights" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
      <div className="bkk-entry-panel" aria-labelledby="bkk-entry-heading">
        {['tl', 'tr', 'bl', 'br'].map((position) => <OrnamentalCorner key={position} position={position} />)}
        <div className="bkk-entry-emblem" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <path d="m7 14 7 6 6-11 6 11 7-6-4 16H11L7 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M12 34h16M13 26h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="11" r="2" fill="currentColor" />
            <circle cx="20" cy="6" r="2" fill="currentColor" />
            <circle cx="33" cy="11" r="2" fill="currentColor" />
          </svg>
        </div>
        <p className="bkk-entry-welcome">{welcome}</p>
        <h1 className="bkk-entry-brand" id="bkk-entry-heading">{brand}</h1>
        <div className="bkk-entry-divider" aria-hidden="true"><span /></div>
        {status === 'ready' ? (
          <a className="bkk-entry-button" href={getGameUrl(settings.gameUrl)}>
            <span>ဝင်ရန်နှိပ်ပါ</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ) : (
          <button
            className="bkk-entry-button"
            type="button"
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
            onClick={() => setAttempt((value) => value + 1)}
          >
            <span>{status === 'error' ? 'ပြန်စမ်းရန်' : 'ဝင်ရန်နှိပ်ပါ'}</span>
            {status === 'loading' && <span className="bkk-entry-spinner" aria-hidden="true" />}
          </button>
        )}
        <p className="bkk-entry-status" role="status" aria-live="polite">
          {status === 'error' ? 'ချိတ်ဆက်မှု မရသေးပါ။ ပြန်စမ်းကြည့်ပါ။' : ''}
        </p>
      </div>
    </main>
  );
}

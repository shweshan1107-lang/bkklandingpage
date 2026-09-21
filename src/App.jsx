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
      <div className="bkk-entry-shade" aria-hidden="true" />
      <section className="bkk-entry-hero" aria-labelledby="bkk-entry-heading">
        <p className="bkk-entry-welcome">{welcome}</p>
        <div className="bkk-entry-brand-stage">
          <h1 className={`bkk-entry-brand${brand.length > 8 ? ' bkk-entry-brand-long' : ''}`} id="bkk-entry-heading">{brand}</h1>
        </div>
        {status === 'ready' ? (
          <a className="bkk-entry-button" href={getGameUrl(settings.gameUrl)}>
            <span>ဝင်ရန်နှိပ်ပါ</span>
            <span className="bkk-entry-button-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg></span>
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
      </section>
    </main>
  );
}

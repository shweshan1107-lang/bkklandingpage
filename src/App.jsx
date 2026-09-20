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

  return (
    <main className="bkk-entry-page" lang="my">
      <div className="bkk-entry-panel">
        <h1 className="bkk-entry-brand">{brand}</h1>
        {status === 'ready' ? (
          <a className="bkk-entry-button" href={getGameUrl(settings.gameUrl)}>
            <span>ဝင်ရန် နှိပ်ပါ</span>
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
            <span>{status === 'error' ? 'ပြန်စမ်းရန်' : 'ဝင်ရန် နှိပ်ပါ'}</span>
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

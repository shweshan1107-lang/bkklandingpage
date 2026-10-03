import React, { useEffect, useState } from 'react';
import LandingImage from './LandingImage.jsx';
import './SimpleLanding.css';

const assets = '/landing-assets/';
const defaultWelcome = 'BKK ထိုင်းရောက်ရွှေမြန်မာများကြိုဆိုပါသည်။';
const defaultHint = 'ဝင်ရန်နှိပ်ပြီးပါက 5 စက္ကန့်မျှစောင့်ဆိုင်းပေးပါ';

function getGameUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function getImageUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (/[\\\x00-\x1f\x7f]/.test(text)) return '';
  return text.startsWith('/') && !text.startsWith('//') ? text : getGameUrl(text);
}
function BackgroundImage({ desktop, mobile }) {
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);
  const selected = isMobile ? mobile || desktop : desktop || mobile;
  return <picture className={`bkk-entry-background${loaded ? ' is-loaded' : ''}`} aria-hidden="true">
    <img src={selected} alt="" decoding="async" fetchPriority="high"
      onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
  </picture>;
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
    (async () => {
      try {
        const response = await fetch('/api/public/site', {
          signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Site unavailable');
        const payload = await response.json();
        const next = payload?.data?.settings;
        if (payload.ok === false || !next) throw new Error('Settings unavailable');
        if (!disposed) {
          setSettings(next);
          setStatus(getGameUrl(next.gameUrl) ? 'ready' : 'error');
        }
      } catch { if (!disposed) setStatus('error'); }
      finally { window.clearTimeout(timeout); }
    })();
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const brand = settings?.brand?.trim() || 'BKK';
  const welcome = settings?.landingWelcome?.trim() || defaultWelcome;
  const hint = settings?.landingHint ?? defaultHint;
  const buttonText = settings?.landingButtonText?.trim() || 'ဝင်ရန်နှိပ်ပါ';
  const desktop = getImageUrl(settings?.backgroundDesktop ?? `${assets}bkk-bg.png`);
  const mobile = getImageUrl(settings?.backgroundMobile ?? `${assets}bkk-bg.png`);
  const logo = getImageUrl(settings?.landingLogo ?? `${assets}bkk-logo.png`);
  const icon = getImageUrl(settings?.landingClickIcon ?? `${assets}bkk-click.png`);

  return <main className="bkk-entry-page" lang="my">
    {(desktop || mobile) && <BackgroundImage key={`${desktop}|${mobile}`} desktop={desktop} mobile={mobile} />}
    <section className="bkk-entry-hero" aria-labelledby="bkk-entry-heading">
      <p className="bkk-entry-welcome"><span>{welcome}</span></p>
      <h1 className="bkk-entry-logo" id="bkk-entry-heading">
        <LandingImage src={logo} alt={brand} className="bkk-entry-artwork" fallback={<span className="bkk-entry-brand">{brand}</span>} />
      </h1>
      <div className="bkk-entry-action">
        {status === 'ready' ? <a className="bkk-entry-button" href={getGameUrl(settings.gameUrl)}><span>{buttonText}</span></a> :
          <button className="bkk-entry-button" type="button" disabled={status === 'loading'} aria-busy={status === 'loading'}
            onClick={() => setAttempt(value => value + 1)}><span>{status === 'error' ? 'ပြန်စမ်းရန်' : buttonText}</span></button>}
        <div className="bkk-entry-hand" aria-hidden="true"><LandingImage src={icon} className="bkk-entry-artwork" /></div>
      </div>
      <p className="bkk-entry-hint"><span>{hint}</span></p>
      <p className="bkk-entry-status" role="status" aria-live="polite">{status === 'error' ? 'ချိတ်ဆက်မှု မရသေးပါ။ ပြန်စမ်းကြည့်ပါ။' : ''}</p>
    </section>
  </main>;
}

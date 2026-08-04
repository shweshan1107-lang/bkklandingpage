import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Gift,
  LoaderCircle,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { api } from './api.js';
import { fallbackData } from './fallbackData.js';

function TiltCard({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const move = (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      element.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
      element.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
      element.style.setProperty('--mx', `${x * 100}%`);
      element.style.setProperty('--my', `${y * 100}%`);
    };
    const reset = () => {
      element.style.setProperty('--rx', '0deg');
      element.style.setProperty('--ry', '0deg');
      element.style.setProperty('--mx', '50%');
      element.style.setProperty('--my', '50%');
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
    };
  }, []);
  return <article ref={ref} className="tilt-card">{children}</article>;
}

export default function App() {
  const [site, setSite] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeEvent, setActiveEvent] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const eventTouchStartX = useRef(null);

  useEffect(() => {
    api.publicSite()
      .then((response) => setSite(response.data))
      .catch((error) => console.error('Public API:', error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (activeEvent >= site.events.length) setActiveEvent(0);
  }, [activeEvent, site.events.length]);

  const settings = site.settings || fallbackData.settings;
  const promotions = site.promotions || [];
  const events = site.events || [];
  const currentEvent = useMemo(() => events[activeEvent], [events, activeEvent]);
  const previous = () => events.length && setActiveEvent((value) => (value - 1 + events.length) % events.length);
  const next = () => events.length && setActiveEvent((value) => (value + 1) % events.length);

  const handleEventTouchStart = (event) => {
    eventTouchStartX.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleEventTouchEnd = (event) => {
    const startX = eventTouchStartX.current;
    const endX = event.changedTouches?.[0]?.clientX;
    eventTouchStartX.current = null;

    if (startX == null || endX == null) return;

    const distance = endX - startX;
    if (Math.abs(distance) < 45) return;

    if (distance < 0) next();
    else previous();
  };

  return <div className="site-shell">
    <div className="ambient a1"/><div className="ambient a2"/>
    <div className="particles">{Array.from({length:14}).map((_,i)=><span key={i} style={{'--i':i}} />)}</div>

    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <a className="brand" href="#home"><span className="orbit"/><span className="brand-mark">{settings.brandLong || settings.brand}</span><span className="brand-copy"><b>OFFICIAL</b><small>Premium Play</small></span></a>
      <nav><a href="#promotions">PROMOTIONS</a><a href="#events">EVENTS</a><a href="#contact">CONTACT</a></nav>
      <a className="mini-login" href={settings.gameUrl} target="_blank" rel="noreferrer">Log in <ArrowRight size={18}/></a>
    </header>

    <nav className="mobile-nav" aria-label="Mobile navigation">
      <a href="#promotions"><Gift size={16}/> Promotions</a>
      <a href="#events"><CalendarDays size={16}/> Events</a>
      <a href="#contact"><Send size={16}/> Contact</a>
    </nav>

    <main>
      <section className="hero section-pad" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={16}/> {settings.heroKicker}</div>
          <h1><span>{settings.heroTitleTop}</span><br/>{settings.heroTitleBottom}</h1>
          <p>{settings.heroDescription}</p>
          <div className="actions hero-actions">
            <a className="gold-btn primary-play" href={settings.gameUrl} target="_blank" rel="noreferrer"><Gamepad2 size={25}/> PLAY NOW</a>
            <a className="glass-btn telegram-btn" href={settings.telegramUrl} target="_blank" rel="noreferrer"><Send size={22}/> TELEGRAM</a>
          </div>
          <div className="stats">{(settings.stats || []).map((item, index)=><div key={`${item.value}-${index}`}><b>{item.value}</b><span>{item.label}</span></div>)}</div>
        </div>

        <div className="hero-stage">
          <div className="ring r1"/><div className="ring r2"/>
          <div className="chip c1">B</div><div className="chip c2">K</div><div className="chip c3">K</div>
          <div className="hero-card"><div className="sweep"/><div className="card-top"><span>PREMIUM MEMBER</span><Crown size={24}/></div><div className="hero-logo">{settings.brandLong || settings.brand}</div><div className="line"/><div className="card-bottom"><span>WELCOME BONUS</span><b>VIP ACCESS</b></div></div>
        </div>
      </section>

      <section className="marquee"><div><span>✦ DAILY BONUS</span><span>✦ PREMIUM EVENTS</span><span>✦ FAST LOGIN</span><span>✦ MEMBER REWARDS</span><span>✦ DAILY BONUS</span><span>✦ PREMIUM EVENTS</span><span>✦ FAST LOGIN</span><span>✦ MEMBER REWARDS</span></div></section>

      <section className="content section-pad" id="promotions">
        <div className="heading"><div><div className="eyebrow"><Gift size={16}/> EXCLUSIVE OFFERS</div><h2>လက်ရှိ Promotion များ</h2></div><p>Admin မှ ပုံ၊ စာနဲ့ Link ပြောင်းလိုက်တာနဲ့ ဒီနေရာမှာ ချက်ချင်းပေါ်လာမယ်။</p></div>
        {loading ? <div className="loading"><LoaderCircle className="spin"/> Loading promotions...</div> : null}
        {!loading && promotions.length === 0 ? <div className="empty-public">လက်ရှိ Promotion မရှိသေးပါ။</div> : null}
        <div className="promo-grid">{promotions.map((promotion)=><TiltCard key={promotion.id}><div className="shine"/><img src={promotion.image} alt={promotion.title}/><div className="badge">{promotion.badge}</div><div className="promo-copy"><span>{promotion.eyebrow}</span><h3>{promotion.title}</h3><p>{promotion.short}</p><button onClick={()=>setModal(promotion)}>{promotion.buttonText || 'အသေးစိတ်ကြည့်ရန်'} <ArrowRight size={17}/></button></div></TiltCard>)}</div>
      </section>

      <section className="content section-pad" id="events">
        <div className="heading"><div><div className="eyebrow"><CalendarDays size={16}/> LIVE & UPCOMING</div><h2>BKK Events</h2></div><p>Event ပုံနဲ့စာတွေကို Admin Dashboard မှ ထည့်၊ ပြင်၊ ဖျက်နိုင်ပါတယ်။</p></div>
        {events.length ? <><div className="event-showcase" onTouchStart={handleEventTouchStart} onTouchEnd={handleEventTouchEnd}><button className="arrow" onClick={previous} aria-label="Previous event"><ChevronLeft/></button><div className="event-stack">{events.map((event,index)=>{const distance=(index-activeEvent+events.length)%events.length; const position=distance===0?'active':distance===1?'right':'left'; return <article key={event.id} className={`event-card ${position}`}><img src={event.image} alt={event.title}/><div className="event-copy"><span>{event.date}</span><h3>{event.title}</h3><p>{event.description}</p>{event.link ? <a href={event.link} target="_blank" rel="noreferrer">Event သို့သွားရန် <ArrowRight size={16}/></a> : null}</div></article>})}</div><button className="arrow" onClick={next} aria-label="Next event"><ChevronRight/></button></div><div className="dots" aria-label={currentEvent?.title || 'Events'}>{events.map((event,index)=><button key={event.id} className={index===activeEvent?'active':''} onClick={()=>setActiveEvent(index)}/>)}</div></> : <div className="empty-public">လက်ရှိ Event မရှိသေးပါ။</div>}
      </section>

      <section className="cta section-pad" id="contact"><div className="cta-panel"><div><div className="eyebrow"><Sparkles size={16}/> READY TO PLAY</div><h2>အခုချက်ချင်း BKK ကိုဝင်မယ်</h2><p>Game ဝင်ရန် သို့မဟုတ် Telegram မှ ဝန်ဆောင်မှုအဖွဲ့ကို တိုက်ရိုက်မေးနိုင်ပါတယ်။</p></div><div className="actions"><a className="gold-btn" href={settings.gameUrl} target="_blank" rel="noreferrer"><Gamepad2 size={20}/> Game ဝင်မယ်</a><a className="glass-btn" href={settings.contactUrl || settings.telegramUrl} target="_blank" rel="noreferrer"><Send size={20}/> ဆက်သွယ်မယ်</a></div></div></section>
    </main>

    <footer><div className="footer-brand"><span className="brand-mark">{settings.brand}</span><div><b>{settings.brand} Official</b><p>Luxury promotion landing page</p></div></div><div className="footer-links"><a href={settings.telegramUrl} target="_blank" rel="noreferrer">Telegram</a><a href={settings.contactUrl} target="_blank" rel="noreferrer">Contact</a><a href={settings.gameUrl} target="_blank" rel="noreferrer">Game</a><a href="/admin">Admin</a></div><p className="age">{settings.footerText}</p></footer>

    <div className="mobile-dock"><a href={settings.gameUrl} target="_blank" rel="noreferrer"><Gamepad2 size={20}/> PLAY</a><a href={settings.telegramUrl} target="_blank" rel="noreferrer"><Send size={20}/> TELEGRAM</a></div>

    {modal && <div className="modal-bg" onClick={()=>setModal(null)}><div className="modal" onClick={(event)=>event.stopPropagation()}><button className="close" onClick={()=>setModal(null)}><X/></button><img src={modal.image} alt={modal.title}/><div className="modal-copy"><span>{modal.eyebrow}</span><h3>{modal.title}</h3><p>{modal.details}</p><div className="actions"><a className="gold-btn" href={modal.link || settings.gameUrl} target="_blank" rel="noreferrer"><Gamepad2 size={19}/> {modal.buttonText || 'ယခုကစားမည်'}</a><a className="glass-btn" href={settings.contactUrl || settings.telegramUrl} target="_blank" rel="noreferrer"><Send size={19}/> မေးမြန်းမည်</a></div></div></div></div>}
  </div>;
}

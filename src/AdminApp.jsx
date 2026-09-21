import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Eye,
  EyeOff,
  ExternalLink,
  Gift,
  ImagePlus,
  LayoutDashboard,
  Link as LinkIcon,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { api, clearToken, getToken, saveToken } from './api.js';

const emptyPromotion = {
  eyebrow: 'NEW PROMOTION', title: '', short: '', details: '', image: '', badge: 'NEW', buttonText: 'ယခုကစားမည်', link: '', active: true, order: 1
};
const emptyEvent = {
  title: '', date: '', description: '', image: '', link: '', active: true, order: 1
};

function Field({ label, children, full = false }) {
  return <label className={`admin-field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
}

function UploadField({ value, onChange, onBusy }) {
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      onBusy(true);
      const result = await api.upload(file);
      onChange(result.url);
    } catch (error) {
      alert(error.message);
    } finally {
      onBusy(false);
      event.target.value = '';
    }
  };

  return <div className="upload-box">
    <div className="upload-preview">{value ? <img src={value} alt="Preview"/> : <ImagePlus/>}</div>
    <div className="upload-controls">
      <input value={value} onChange={(event)=>onChange(event.target.value)} placeholder="/uploads/... သို့မဟုတ် https://..."/>
      <label className="upload-button"><UploadCloud size={18}/> ပုံ Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={upload}/></label>
    </div>
  </div>;
}

function BackgroundUploadField({ id, title, hint, value, onChange, onBusy, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => { setPreviewFailed(false); }, [value]);

  const upload = async (event) => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file || busy || disabled) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPG, PNG, WebP or GIF image.');
      input.value = '';
      return;
    }
    if (!file.size || file.size > 8 * 1024 * 1024) {
      setError('Choose a non-empty image smaller than 8 MB.');
      input.value = '';
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const result = await api.upload(file);
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed. Please try again.');
    } finally {
      input.value = '';
      setBusy(false);
      onBusy(false);
    }
  };

  return <article className="admin-background-card" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <h3 id={`${id}-title`}>{title}</h3>
    <p>{hint}</p>
    <div className="admin-background-preview">
      {value && !previewFailed
        ? <img src={value} alt={`${title} preview`} onError={() => setPreviewFailed(true)} />
        : <div><ImagePlus size={32}/><span>{previewFailed ? 'Image preview unavailable' : 'No background selected'}</span></div>}
    </div>
    <div className="admin-background-actions">
      <label className={`upload-button ${busy || disabled ? 'is-disabled' : ''}`}>
        {busy ? <LoaderCircle size={18} className="spin"/> : <UploadCloud size={18}/>}
        {busy ? 'Uploading...' : value ? 'Replace image' : 'Upload image'}
        <input aria-label={`${title} upload`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy || disabled} onChange={upload}/>
      </label>
      {value ? <button type="button" className="admin-secondary" disabled={busy || disabled} onClick={() => { onChange(''); setError(''); }}><Trash2 size={16}/> Remove</button> : null}
    </div>
    {error ? <p className="admin-background-error" role="alert">{error}</p> : null}
  </article>;
}

export default function AdminApp() {
  const [token, setToken] = useState(getToken());
  const [credentials, setCredentials] = useState({ username: 'admin', password: '' });
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState('');
  const [promotionForm, setPromotionForm] = useState(null);
  const [eventForm, setEventForm] = useState(null);
  const onUploadBusy = (busy) => setUploading((count) => Math.max(0, count + (busy ? 1 : -1)));
  const updateSetting = (key, value) => setData((current) => ({
    ...current, settings: { ...current.settings, [key]: value }
  }));

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.adminSite();
      setData(response.data);
    } catch (error) {
      if (error.status === 401) {
        clearToken();
        setToken('');
      } else setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  const login = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.login(credentials);
      saveToken(response.token);
      setToken(response.token);
      setMessage('Login အောင်မြင်ပါပြီ');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearToken();
    setToken('');
    setData(null);
  };

  const orderedPromotions = useMemo(() => [...(data?.promotions || [])].sort((a,b)=>Number(a.order)-Number(b.order)), [data]);
  const orderedEvents = useMemo(() => [...(data?.events || [])].sort((a,b)=>Number(a.order)-Number(b.order)), [data]);

  const saveSettings = async () => {
    if (saving || uploading) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.saveSettings(data.settings);
      setData(response.data);
      setMessage('Website settings saved.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const savePromotion = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (promotionForm.id) await api.updatePromotion(promotionForm.id, promotionForm);
      else await api.createPromotion(promotionForm);
      setPromotionForm(null);
      setMessage('Promotion သိမ်းပြီးပါပြီ');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (eventForm.id) await api.updateEvent(eventForm.id, eventForm);
      else await api.createEvent(eventForm);
      setEventForm(null);
      setMessage('Event သိမ်းပြီးပါပြီ');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const removePromotion = async (id) => {
    if (!confirm('ဒီ Promotion ကိုဖျက်မှာ သေချာပါသလား?')) return;
    try { await api.deletePromotion(id); await load(); }
    catch (error) { setMessage(error.message); }
  };

  const removeEvent = async (id) => {
    if (!confirm('ဒီ Event ကိုဖျက်မှာ သေချာပါသလား?')) return;
    try { await api.deleteEvent(id); await load(); }
    catch (error) { setMessage(error.message); }
  };

  const togglePromotion = async (item) => {
    try { await api.updatePromotion(item.id, { ...item, active: !item.active }); await load(); }
    catch (error) { setMessage(error.message); }
  };

  const toggleEvent = async (item) => {
    try { await api.updateEvent(item.id, { ...item, active: !item.active }); await load(); }
    catch (error) { setMessage(error.message); }
  };

  if (!token) return <div className="admin-login-page">
    <form className="admin-login-card" onSubmit={login}>
      <div className="admin-logo">BKK</div>
      <span>ADMIN CONTROL</span>
      <h1>Landing Page Login</h1>
      <p>Promotion၊ Event၊ ပုံနဲ့ Link များကို ဒီနေရာမှပြောင်းနိုင်ပါတယ်။</p>
      <Field label="Username"><input value={credentials.username} onChange={(event)=>setCredentials({...credentials, username:event.target.value})}/></Field>
      <Field label="Password"><input type="password" value={credentials.password} onChange={(event)=>setCredentials({...credentials, password:event.target.value})}/></Field>
      {message ? <div className="admin-message error">{message}</div> : null}
      <button className="admin-primary" disabled={saving}>{saving ? <LoaderCircle className="spin"/> : null} Login</button>
      <a href="/">← Customer Website သို့ပြန်ရန်</a>
    </form>
  </div>;

  if (loading || !data) return <div className="admin-loading"><LoaderCircle className="spin"/> Admin Dashboard Loading...</div>;

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><div>BKK</div><span><b>CONTROL</b><small>Landing Admin</small></span></div>
      <nav>
        <button className={tab==='promotions'?'active':''} onClick={()=>setTab('promotions')}><Gift/> Promotions</button>
        <button className={tab==='events'?'active':''} onClick={()=>setTab('events')}><CalendarDays/> Events</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/> Website Settings</button>
      </nav>
      <div className="admin-sidebar-bottom"><a href="/" target="_blank"><ExternalLink/> View Website</a><button onClick={logout}><LogOut/> Logout</button></div>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar"><div><span>BKK LANDING PAGE</span><h1>{tab==='promotions'?'Promotion Management':tab==='events'?'Event Management':'Website Settings'}</h1></div><div className="admin-status"><i/><span>Backend Connected</span></div></header>
      {message ? <div className="admin-message"><span>{message}</span><button onClick={()=>setMessage('')}><X/></button></div> : null}

      {tab==='promotions' ? <section className="admin-section">
        <div className="admin-section-head"><div><h2>Promotion Cards</h2><p>ပုံ၊ စာ၊ အစီအစဉ်နဲ့ Show/Hide ကိုပြောင်းနိုင်ပါတယ်။</p></div><button className="admin-primary" onClick={()=>setPromotionForm({...emptyPromotion, order:orderedPromotions.length+1})}><Plus/> Promotion အသစ်</button></div>
        <div className="admin-item-grid">{orderedPromotions.map((item)=><article className={`admin-item ${!item.active?'disabled':''}`} key={item.id}><img src={item.image} alt=""/><div className="admin-item-copy"><span>{item.badge || 'PROMO'} · Order {item.order}</span><h3>{item.title}</h3><p>{item.short}</p></div><div className="admin-item-actions"><button title="Show/Hide" onClick={()=>togglePromotion(item)}>{item.active?<Eye/>:<EyeOff/>}</button><button title="Edit" onClick={()=>setPromotionForm({...item})}><Pencil/></button><button className="danger" title="Delete" onClick={()=>removePromotion(item.id)}><Trash2/></button></div></article>)}</div>
      </section> : null}

      {tab==='events' ? <section className="admin-section">
        <div className="admin-section-head"><div><h2>Event Slider</h2><p>Event Card များကို Add/Edit/Delete လုပ်နိုင်ပါတယ်။</p></div><button className="admin-primary" onClick={()=>setEventForm({...emptyEvent, order:orderedEvents.length+1})}><Plus/> Event အသစ်</button></div>
        <div className="admin-item-grid">{orderedEvents.map((item)=><article className={`admin-item ${!item.active?'disabled':''}`} key={item.id}><img src={item.image} alt=""/><div className="admin-item-copy"><span>{item.date || 'EVENT'} · Order {item.order}</span><h3>{item.title}</h3><p>{item.description}</p></div><div className="admin-item-actions"><button title="Show/Hide" onClick={()=>toggleEvent(item)}>{item.active?<Eye/>:<EyeOff/>}</button><button title="Edit" onClick={()=>setEventForm({...item})}><Pencil/></button><button className="danger" title="Delete" onClick={()=>removeEvent(item.id)}><Trash2/></button></div></article>)}</div>
      </section> : null}

      {tab==='settings' ? <section className="admin-section settings-section">
        <div className="admin-section-head"><div><h2>Landing Page Settings</h2><p>Update the welcome card, links and background images.</p></div><button className="admin-primary" disabled={saving || Boolean(uploading)} aria-busy={saving} onClick={saveSettings}>{saving ? <LoaderCircle className="spin"/> : <Save/>} {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Settings'}</button></div>
        <fieldset className="admin-settings-fields" disabled={saving}>
          <div className="settings-card"><div className="admin-form-grid">
            <Field label="Welcome Text" full><textarea rows="2" maxLength={180} value={data.settings.landingWelcome ?? 'BKK မြန်မာ မှ ကြိုဆိုပါသည်။'} onChange={(event)=>updateSetting('landingWelcome', event.target.value)}/></Field>
            <Field label="Card Brand"><input maxLength={40} value={data.settings.brand || ''} onChange={(event)=>updateSetting('brand', event.target.value)}/></Field>
            <Field label="LINE ID"><input maxLength={80} value={data.settings.lineId || ''} placeholder="@bkk1111" onChange={(event)=>updateSetting('lineId', event.target.value)}/></Field>
            <Field label="Game Link" full><div className="input-icon"><LinkIcon/><input value={data.settings.gameUrl || ''} onChange={(event)=>updateSetting('gameUrl', event.target.value)}/></div></Field>
          </div></div>
          <div className="admin-background-heading"><h2>Background Images</h2><p>Choose separate images for desktop and phone. JPG, PNG, WebP or GIF, up to 8 MB each.</p></div>
          <div className="admin-background-grid">
            <BackgroundUploadField id="background-desktop" title="PC Background" hint="Landscape image · recommended 1920 × 1080" value={data.settings.backgroundDesktop || ''} onChange={(value)=>updateSetting('backgroundDesktop', value)} onBusy={onUploadBusy} disabled={saving}/>
            <BackgroundUploadField id="background-mobile" title="Phone Background" hint="Portrait image · recommended 1080 × 1920" value={data.settings.backgroundMobile || ''} onChange={(value)=>updateSetting('backgroundMobile', value)} onBusy={onUploadBusy} disabled={saving}/>
          </div>
          <p className="admin-background-note">Click Save Settings to apply changes. If only one image is set, it is used on both devices. With no images, the red background is shown.</p>
          <details className="settings-card admin-legacy-settings"><summary>Other Website Settings</summary><div className="admin-form-grid">
            <Field label="Card Logo Text"><input value={data.settings.brandLong || ''} onChange={(event)=>updateSetting('brandLong', event.target.value)}/></Field>
            <Field label="Hero Small Title"><input value={data.settings.heroKicker || ''} onChange={(event)=>updateSetting('heroKicker', event.target.value)}/></Field>
            <Field label="Hero Gold Title"><input value={data.settings.heroTitleTop || ''} onChange={(event)=>updateSetting('heroTitleTop', event.target.value)}/></Field>
            <Field label="Hero Main Title"><input value={data.settings.heroTitleBottom || ''} onChange={(event)=>updateSetting('heroTitleBottom', event.target.value)}/></Field>
            <Field label="Hero Description" full><textarea rows="4" value={data.settings.heroDescription || ''} onChange={(event)=>updateSetting('heroDescription', event.target.value)}/></Field>
            <Field label="Telegram Channel Link" full><input value={data.settings.telegramUrl || ''} onChange={(event)=>updateSetting('telegramUrl', event.target.value)}/></Field>
            <Field label="Contact/Admin Link" full><input value={data.settings.contactUrl || ''} onChange={(event)=>updateSetting('contactUrl', event.target.value)}/></Field>
            <Field label="Footer Text" full><input value={data.settings.footerText || ''} onChange={(event)=>updateSetting('footerText', event.target.value)}/></Field>
          </div></details>
        </fieldset>
      </section> : null}
    </main>

    {promotionForm ? <div className="admin-modal-bg"><form className="admin-modal" onSubmit={savePromotion}><div className="admin-modal-head"><div><span>PROMOTION EDITOR</span><h2>{promotionForm.id?'Promotion ပြင်မယ်':'Promotion အသစ်ထည့်မယ်'}</h2></div><button type="button" onClick={()=>setPromotionForm(null)}><X/></button></div><div className="admin-form-grid"><Field label="Image" full><UploadField value={promotionForm.image} onChange={(value)=>setPromotionForm({...promotionForm,image:value})} onBusy={onUploadBusy}/></Field><Field label="Small English Title"><input value={promotionForm.eyebrow} onChange={(event)=>setPromotionForm({...promotionForm,eyebrow:event.target.value})}/></Field><Field label="Badge"><input value={promotionForm.badge} onChange={(event)=>setPromotionForm({...promotionForm,badge:event.target.value})}/></Field><Field label="Promotion Title" full><input required value={promotionForm.title} onChange={(event)=>setPromotionForm({...promotionForm,title:event.target.value})}/></Field><Field label="Short Description" full><textarea rows="2" value={promotionForm.short} onChange={(event)=>setPromotionForm({...promotionForm,short:event.target.value})}/></Field><Field label="Full Details" full><textarea rows="5" value={promotionForm.details} onChange={(event)=>setPromotionForm({...promotionForm,details:event.target.value})}/></Field><Field label="Button Text"><input value={promotionForm.buttonText} onChange={(event)=>setPromotionForm({...promotionForm,buttonText:event.target.value})}/></Field><Field label="Display Order"><input type="number" value={promotionForm.order} onChange={(event)=>setPromotionForm({...promotionForm,order:Number(event.target.value)})}/></Field><Field label="Promotion/Game Link" full><input value={promotionForm.link} onChange={(event)=>setPromotionForm({...promotionForm,link:event.target.value})}/></Field><label className="switch-field full"><input type="checkbox" checked={promotionForm.active} onChange={(event)=>setPromotionForm({...promotionForm,active:event.target.checked})}/><span/> Customer ကိုပြမယ်</label></div><div className="admin-modal-actions"><button type="button" className="admin-secondary" onClick={()=>setPromotionForm(null)}>Cancel</button><button className="admin-primary" disabled={saving||uploading}><Save/> Save Promotion</button></div></form></div> : null}

    {eventForm ? <div className="admin-modal-bg"><form className="admin-modal" onSubmit={saveEvent}><div className="admin-modal-head"><div><span>EVENT EDITOR</span><h2>{eventForm.id?'Event ပြင်မယ်':'Event အသစ်ထည့်မယ်'}</h2></div><button type="button" onClick={()=>setEventForm(null)}><X/></button></div><div className="admin-form-grid"><Field label="Image" full><UploadField value={eventForm.image} onChange={(value)=>setEventForm({...eventForm,image:value})} onBusy={onUploadBusy}/></Field><Field label="Event Title"><input required value={eventForm.title} onChange={(event)=>setEventForm({...eventForm,title:event.target.value})}/></Field><Field label="Date / Status"><input value={eventForm.date} onChange={(event)=>setEventForm({...eventForm,date:event.target.value})}/></Field><Field label="Description" full><textarea rows="5" value={eventForm.description} onChange={(event)=>setEventForm({...eventForm,description:event.target.value})}/></Field><Field label="Event Link" full><input value={eventForm.link} onChange={(event)=>setEventForm({...eventForm,link:event.target.value})}/></Field><Field label="Display Order"><input type="number" value={eventForm.order} onChange={(event)=>setEventForm({...eventForm,order:Number(event.target.value)})}/></Field><label className="switch-field"><input type="checkbox" checked={eventForm.active} onChange={(event)=>setEventForm({...eventForm,active:event.target.checked})}/><span/> Customer ကိုပြမယ်</label></div><div className="admin-modal-actions"><button type="button" className="admin-secondary" onClick={()=>setEventForm(null)}>Cancel</button><button className="admin-primary" disabled={saving||uploading}><Save/> Save Event</button></div></form></div> : null}
  </div>;
}

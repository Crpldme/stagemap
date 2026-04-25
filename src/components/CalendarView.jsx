// src/components/CalendarView.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

const C = {
  bg:"#140c00", bg2:"#1e1100", card:"#271500", cardHov:"#301a00",
  border:"#3d2200", borderHov:"#6b3d00",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030", amber:"#ffb940",
  brown:"#7a4010", brownLt:"#a05820",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", red:"#ff5040", blue:"#40a8ff", purple:"#c060ff", tag:"#2a1600",
};

const EVENT_TYPE_KEYS = [
  { k:'availability', c:C.green },
  { k:'event',        c:C.orange },
  { k:'booking',      c:C.amber },
  { k:'personal',     c:C.muted },
];

const RECURRENCE_KEYS = ['none','weekly','biweekly','monthly'];

function getEventColor(type) { return EVENT_TYPE_KEYS.find(e => e.k === type)?.c || C.orange; }
function getPublicTitle(event, bookingLabel) {
  if (event.visibility === 'public') return event.title;
  return bookingLabel;
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function Inp({ value, onChange, placeholder, style: s = {}, ml, rows = 3 }) {
  const base = { background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%', ...s };
  return ml
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, resize: 'vertical' }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />;
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.k} value={o.k}>{o.l}</option>)}
    </select>
  );
}

function Btn({ children, onClick, v = 'primary', sz = 'md', disabled, full, style: s = {} }) {
  const base = { fontFamily: "'Outfit',sans-serif", fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', borderRadius: 8, transition: 'all .15s', opacity: disabled ? .5 : 1, width: full ? '100%' : 'auto', ...s };
  const sizes = { sm: { padding: '5px 12px', fontSize: 12 }, md: { padding: '9px 18px', fontSize: 13 }, lg: { padding: '13px 28px', fontSize: 15 } }[sz];
  const vars = {
    primary:   { background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color: '#fff', boxShadow: '0 4px 16px '+C.orange+'44' },
    secondary: { background: C.tag, color: C.muted, border: '1px solid '+C.border },
    ghost:     { background: 'none', color: C.muted, border: '1px solid '+C.border },
    danger:    { background: C.red+'22', color: C.red, border: '1px solid '+C.red+'44' },
    success:   { background: C.green+'22', color: C.green, border: '1px solid '+C.green+'44' },
  }[v];
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes, ...vars }}>{children}</button>;
}

/* ── Profile Search Picker (venue or artist) ── */
function ProfilePicker({ value, onChange, profiles, defaultAvatar, placeholder }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = profiles.filter(v =>
    (v.name + (v.region || '')).toLowerCase().includes((query || '').toLowerCase())
  ).slice(0, 8);

  const select = (v) => {
    const loc = v.name + (v.region ? ', ' + v.region : '');
    setQuery(loc);
    onChange(loc);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.bg2, border: '1px solid '+C.border, borderRadius: 8, zIndex: 100, boxShadow: '0 8px 24px #00000080', overflow: 'hidden' }}>
          {filtered.map(v => (
            <div key={v.id} onMouseDown={() => select(v)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize: 16 }}>{v.avatar || defaultAvatar}</span>
              <div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{v.name}</div>
                {v.region && <div style={{ fontSize: 10, color: C.muted }}>{v.region}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Event Form Modal ── */
function EventFormModal({ date, event, myId, myProfile, allProfiles = [], onSave, onDelete, onClose }) {
  const t = useT();
  const isEdit = !!event;

  const ET = EVENT_TYPE_KEYS.map(e => ({ ...e, l: t('cal.' + e.k) }));
  const REC = RECURRENCE_KEYS.map(k => ({ k, l: t('cal.recurrence_' + k) }));

  const getDateStr = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return toDateStr(d);
  };

  const getTimeStr = (isoStr, fallback) => {
    if (!isoStr) return fallback;
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const [form, setForm] = useState({
    title:        event?.title || (!isEdit && myProfile?.name) || '',
    description:  event?.description || '',
    event_type:   event?.event_type || 'availability',
    date_start:   event?.date_start ? getDateStr(event.date_start) : (date ? toDateStr(date) : ''),
    date_end:     event?.date_end   ? getDateStr(event.date_end)   : (date ? toDateStr(date) : ''),
    time_start:   event?.time_start || (event?.date_start ? getTimeStr(event.date_start, '09:00') : '09:00'),
    time_end:     event?.time_end   || (event?.date_end   ? getTimeStr(event.date_end,   '17:00') : '17:00'),
    location:     event?.location || '',
    visibility:   event?.visibility || 'private',
    recurrence:   event?.recurrence || 'none',
    notify_email: event?.notify_email !== false,
    is_availability: event?.is_availability || false,
  });
  const [loading, setLoading] = useState(false);
  const [publicConfirmed, setPublicConfirmed] = useState(event?.visibility === 'public');
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'visibility' && v !== 'public') setPublicConfirmed(false);
  };

  useEffect(() => {
    set('is_availability', form.event_type === 'availability');
  }, [form.event_type]);

  const save = async () => {
    if (!form.title) { toast.error(t('evf.title_req')); return; }
    if (!form.date_start) { toast.error(t('evf.date_req')); return; }
    setLoading(true);
    try {
      const entry = {
        user_id:        myId,
        title:          form.title,
        description:    form.description,
        event_type:     form.event_type,
        date_start:     form.date_start + 'T' + (form.time_start || '00:00'),
        date_end:       (form.date_end || form.date_start) + 'T' + (form.time_end || '23:59'),
        time_start:     form.time_start,
        time_end:       form.time_end,
        location:       form.location,
        visibility:     form.visibility,
        recurrence:     form.recurrence,
        notify_email:   form.notify_email,
        is_availability: form.is_availability,
        color:          getEventColor(form.event_type),
      };
      if (isEdit) {
        const { error } = await supabase.from('calendar_entries').update(entry).eq('id', event.id);
        if (error) throw error;
        toast.success(t('event_updated'));
      } else {
        const { error } = await supabase.from('calendar_entries').insert(entry);
        if (error) throw error;
        toast.success(t('event_added'));
      }
      onSave(entry);
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const del = async () => {
    if (!window.confirm(t('confirm_delete'))) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('calendar_entries').delete().eq('id', event.id);
      if (error) throw error;
      toast.success(t('event_deleted'));
      onDelete();
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const visOpts = [
    { k: 'private', l: t('evf.vis_private') },
    { k: 'shared',  l: t('evf.vis_shared') },
    { k: 'public',  l: t('evf.vis_public') },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '15px 22px', borderBottom: '1px solid '+C.border, background: C.card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: C.cream }}>
            {isEdit ? t('evf.edit') : t('evf.new')}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{t('evf.type')}</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {ET.map(et => (
                <button key={et.k} onClick={() => set('event_type', et.k)}
                  style={{ background: form.event_type === et.k ? et.c+'22' : C.tag, border: '1px solid '+(form.event_type === et.k ? et.c : C.border), borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, color: form.event_type === et.k ? et.c : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: form.event_type === et.k ? 600 : 400 }}>
                  {et.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.title')} *</div>
            <Inp value={form.title} onChange={v => set('title', v)} placeholder={form.event_type === 'availability' ? t('evf.ph_avail') : t('evf.ph_event')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.date_start')}</div>
              <input type='date' value={form.date_start} onChange={e => set('date_start', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.date_end')}</div>
              <input type='date' value={form.date_end} onChange={e => set('date_end', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.time_start')}</div>
              <input type='time' value={form.time_start} onChange={e => set('time_start', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.time_end')}</div>
              <input type='time' value={form.time_end} onChange={e => set('time_end', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {myProfile?.type === 'venue' ? (
              <>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.location_artist')}</div>
                <ProfilePicker value={form.location} onChange={v => set('location', v)} profiles={allProfiles.filter(p => p.type === 'artist')} defaultAvatar='🎵' placeholder={t('evf.ph_artist')} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.location')}</div>
                <ProfilePicker value={form.location} onChange={v => set('location', v)} profiles={allProfiles.filter(p => p.type === 'venue')} defaultAvatar='🏛️' placeholder={t('evf.ph_location')} />
              </>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.desc')}</div>
            <Inp value={form.description} onChange={v => set('description', v)} placeholder={t('evf.ph_desc')} ml rows={2} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.recurrence')}</div>
            <Sel value={form.recurrence} onChange={v => set('recurrence', v)} options={REC} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('evf.visibility')}</div>
              <Sel value={form.visibility} onChange={v => set('visibility', v)} options={visOpts} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                <input type='checkbox' checked={form.notify_email} onChange={e => set('notify_email', e.target.checked)} style={{ accentColor: C.orange, width: 14, height: 14 }} />
                <span style={{ fontSize: 12, color: C.text }}>{t('evf.notify')}</span>
              </label>
            </div>
          </div>
          {form.visibility === 'public' && (
            <div style={{ background: C.green+'11', border: '1px solid '+C.green+'44', borderRadius: 8, padding: '10px 12px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type='checkbox' checked={publicConfirmed} onChange={e => setPublicConfirmed(e.target.checked)} style={{ accentColor: C.green, width: 15, height: 15, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.green, lineHeight: 1.4 }}>{t('evf.confirm_public')}</span>
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            {isEdit && <Btn v='danger' sz='sm' onClick={del} disabled={loading}>{t('evf.delete')}</Btn>}
            <div style={{ flex: 1 }} />
            <Btn v='ghost' onClick={onClose}>{t('btn.cancel')}</Btn>
            <Btn onClick={save} disabled={loading || (form.visibility === 'public' && !publicConfirmed)}>
              {loading ? t('evf.saving') : isEdit ? t('evf.save') : t('evf.btn_add')}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Day Detail Panel ── */
function DayPanel({ date, events, onEdit, onClose, onNew, onRefresh }) {
  const t = useT();
  const ET = EVENT_TYPE_KEYS.map(e => ({ ...e, l: t('cal.' + e.k) }));

  const dayEvents = events.filter(e => {
    const start = new Date(e.date_start);
    const end   = new Date(e.date_end || e.date_start);
    return date >= new Date(start.toDateString()) && date <= new Date(end.toDateString());
  });

  const confirmBooking = async (e) => {
    try {
      await supabase.from('calendar_entries').update({ event_type: 'event' }).eq('id', e.id);
      toast.success(t('event_confirmed'));
      if (onRefresh) onRefresh();
    } catch(err) { toast.error(err.message); }
  };

  return (
    <div style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 12, padding: 16, minWidth: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 700, color: C.cream }}>
          {date.toLocaleDateString(t('cal.locale'), { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}>✕</button>
      </div>
      {dayEvents.length === 0 && <div style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>{t('cal.day_no_ev')}</div>}
      {dayEvents.map(e => {
        const ec = getEventColor(e.event_type);
        const isPublic = e.visibility === 'public';
        return (
          <div key={e.id} onClick={() => onEdit(e)}
            style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '4px solid '+ec, borderRadius: 8, padding: '8px 10px', marginBottom: 7, cursor: 'pointer' }}
            onMouseEnter={ev => ev.currentTarget.style.background = C.cardHov}
            onMouseLeave={ev => ev.currentTarget.style.background = C.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: C.text, flex: 1 }}>{e.title}</div>
              {isPublic && <span style={{ background: C.green+'22', color: C.green, border: '1px solid '+C.green+'55', borderRadius: 20, padding: '1px 7px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('cal.public_lbl')}</span>}
            </div>
            {isPublic && (
              <div style={{ background: C.green+'11', border: '1px solid '+C.green+'33', borderRadius: 5, padding: '4px 7px', fontSize: 10, color: C.green, marginBottom: 6 }}>
                {t('cal.public_warn_short')}
              </div>
            )}
            {isPublic && e.event_type !== 'availability' && (
              <div style={{ background: C.tag, border: '1px dashed '+C.orange+'55', borderRadius: 5, padding: '7px 8px', fontSize: 10, color: C.dim, marginBottom: 6, textAlign: 'center' }}>
                {t('cal.poster_soon')}
              </div>
            )}
            {!isPublic && (e.event_type === 'booking' || e.event_type === 'event') && (
              <div style={{ background: C.amber+'11', border: '1px solid '+C.amber+'33', borderRadius: 5, padding: '4px 7px', fontSize: 10, color: C.amber, marginBottom: 6 }}>
                {t('cal.booking_private')}
              </div>
            )}
            {e.time_start && <div style={{ fontSize: 11, color: C.muted }}>🕐 {e.time_start} – {e.time_end}</div>}
            {e.location && <div style={{ fontSize: 11, color: C.dim }}>📍 {e.location}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ background: ec+'22', color: ec, borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>
                {ET.find(et => et.k === e.event_type)?.l || e.event_type}
              </span>
              {!isPublic && <span style={{ fontSize: 10, color: e.visibility === 'shared' ? C.blue : C.dim }}>
                {e.visibility === 'shared' ? t('cal.shared_lbl') : t('cal.private_lbl')}
              </span>}
            </div>
            {e.event_type === 'booking' && (
              <div style={{ marginTop: 8 }} onClick={ev => ev.stopPropagation()}>
                <Btn sz='sm' v='success' onClick={() => confirmBooking(e)}>{t('cal.confirm_ev')}</Btn>
              </div>
            )}
          </div>
        );
      })}
      <Btn onClick={onNew} full sz='sm' style={{ marginTop: 4 }}>{t('cal.add_here')}</Btn>
    </div>
  );
}

/* ── Profile Search ── */
function ProfileSearch({ profiles, myId, onSelect, onClose }) {
  const t = useT();
  const [q, setQ] = useState('');
  const filtered = profiles.filter(p =>
    p.id !== myId &&
    (p.name + p.genre + p.region).toLowerCase().includes(q.toLowerCase())
  ).slice(0, 20);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 420, width: '100%', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid '+C.border, background: C.card, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: C.cream, marginBottom: 10 }}>{t('cal.compare_title')}</div>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder={t('cal.compare_ph')}
            style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
        </div>
        <div style={{ padding: 12, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('cal.no_profile')}</div>}
          {filtered.map(p => (
            <div key={p.id} onClick={() => onSelect(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize: 24 }}>{p.avatar || '🎵'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.genre} · {p.region}</div>
              </div>
              <span style={{ fontSize: 10, color: C.green }}>{t('cal.see_agenda')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shared Calendar View ── */
function SharedCalendarView({ myId, otherProfile, onClose, onInvite }) {
  const t = useT();
  const today = new Date();
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth());
  const [myEntries, setMyEntries]     = useState([]);
  const [otherEntries, setOtherEntries] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const from = new Date(year, month - 1, 1).toISOString();
      const to   = new Date(year, month + 2, 0).toISOString();
      const [{ data: mine }, { data: theirs }] = await Promise.all([
        supabase.from('calendar_entries').select('*').eq('user_id', myId).gte('date_start', from).lte('date_start', to),
        supabase.from('calendar_entries').select('*').eq('user_id', otherProfile.id).in('visibility', ['public', 'shared']).gte('date_start', from).lte('date_start', to),
      ]);
      setMyEntries(mine || []);
      setOtherEntries(theirs || []);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const months = t('cal.months');
  const days   = t('cal.days');
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const getEntriesForDay = (entries, day, typeFilter) => {
    const d = new Date(year, month, day);
    return entries.filter(e => {
      if (typeFilter && !typeFilter.includes(e.event_type)) return false;
      const s = new Date(e.date_start);
      const en = new Date(e.date_end || e.date_start);
      return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
             d <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
    });
  };
  const getAvail = (entries, day) => getEntriesForDay(entries, day, ['availability']);
  const getBusy  = (entries, day) => getEntriesForDay(entries, day, ['booking', 'event', 'personal']);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000095', zIndex: 2500, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 900, width: '100%', margin: '0 auto', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid '+C.border, background: C.card, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{otherProfile.avatar || '🎵'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: C.cream }}>{t('cmp.title', { name: otherProfile.name })}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t('cmp.hint')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: '10px 22px', borderBottom: '1px solid '+C.border, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { color: C.purple, label: t('cmp.both_free') },
            { color: C.amber,  label: t('cmp.them_busy', { name: otherProfile.name }) },
            { color: C.muted,  label: t('cmp.me_busy') },
            { color: C.red,    label: t('cmp.both_busy') },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />{l.label}
            </span>
          ))}
        </div>

        <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>‹</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: C.cream, flex: 1, textAlign: 'center' }}>{months[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>›</button>
        </div>

        <div style={{ padding: '0 22px 22px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>{t('cal.loading')}</div>}
          {!loading && otherEntries.length === 0 && (
            <div style={{ background: C.blue+'11', border: '1px solid '+C.blue+'44', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.muted }}>
              ℹ️ {t('cmp.no_avail', { name: otherProfile.name })}
            </div>
          )}
          {!loading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {[...Array(firstDay)].map((_, i) => <div key={'e'+i} style={{ minHeight: 70, background: C.bg+'80', borderRadius: 6 }} />)}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const d   = new Date(year, month, day);
                  const isToday   = isSameDay(d, today);
                  const myAvailCount   = getAvail(myEntries, day).length;
                  const myBusyCount    = getBusy(myEntries, day).length;
                  const othAvailCount  = getAvail(otherEntries, day).length;
                  const othBusyEntries = getBusy(otherEntries, day);
                  const othBusyCount   = othBusyEntries.length;
                  const iMeFree    = myAvailCount > 0  ? myAvailCount  > myBusyCount  : myBusyCount  === 0;
                  const isThemFree = othAvailCount > 0 ? othAvailCount > othBusyCount : othBusyCount === 0;
                  const bothFree      = iMeFree && isThemFree;
                  const onlyMeBusy    = !iMeFree && isThemFree;
                  const onlyThemBusy  = iMeFree && !isThemFree;
                  const bothBusy      = !iMeFree && !isThemFree;
                  const mySlotsLeft   = myAvailCount  > 0 ? Math.max(0, myAvailCount  - myBusyCount)  : null;
                  const othSlotsLeft  = othAvailCount > 0 ? Math.max(0, othAvailCount - othBusyCount) : null;

                  let bg  = C.purple+'18';
                  let brd = C.purple+'55';
                  let clickable = true;
                  if (bothBusy)       { bg = C.red+'11';   brd = C.red+'44';   clickable = false; }
                  else if (onlyMeBusy)    { bg = C.muted+'11'; brd = C.muted+'44'; clickable = false; }
                  else if (onlyThemBusy)  { bg = C.amber+'11'; brd = C.amber+'66'; clickable = false; }
                  if (isToday && bothFree) brd = C.glow;

                  const sharedSlots = Math.min(mySlotsLeft ?? 99, othSlotsLeft ?? 99);

                  return (
                    <div key={day}
                      onClick={() => bothFree && setSelectedSlot({ day, date: d })}
                      style={{ minHeight: 70, background: bg, border: '1px solid '+brd, borderRadius: 8, padding: '5px 4px', cursor: clickable ? 'pointer' : 'default', transition: 'all .15s' }}
                      onMouseEnter={e => { if (clickable) e.currentTarget.style.transform = 'scale(1.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? C.glow : C.text, marginBottom: 3 }}>{day}</div>
                      {bothFree     && <div style={{ fontSize: 9, color: C.purple, fontWeight: 700 }}>✨ {mySlotsLeft !== null || othSlotsLeft !== null ? t('cmp.slots', { n: sharedSlots }) : t('cmp.dispo')}</div>}
                      {onlyThemBusy && <div style={{ fontSize: 9, color: C.amber, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {othBusyEntries[0] ? getPublicTitle(othBusyEntries[0], t('cal.booking_incoming')) : otherProfile.name.split(' ')[0]}
                        {othBusyCount > 1 && ` +${othBusyCount - 1}`}
                      </div>}
                      {onlyMeBusy   && <div style={{ fontSize: 9, color: C.muted }}>{t('cmp.you_busy')}</div>}
                      {bothBusy     && <div style={{ fontSize: 9, color: C.red }}>{t('cmp.x_busy')}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {selectedSlot && (
          <div style={{ margin: '0 22px 22px', background: C.purple+'11', border: '1px solid '+C.purple+'44', borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 700, color: C.cream, marginBottom: 8 }}>
              ✨ {selectedSlot.date.toLocaleDateString(t('cal.locale'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              {t('cmp.free_slot', { name: otherProfile.name })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => { onInvite(otherProfile, selectedSlot.date); onClose(); }}>{t('cmp.send_invite')}</Btn>
              <Btn v='ghost' onClick={() => setSelectedSlot(null)}>{t('cmp.cancel')}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Share Event Modal ── */
function ShareEventModal({ event, profileUrl, profileName, profileGenre, profileRegion, onClose }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const dateStr = new Date(event.date_start).toLocaleDateString(t('cal.locale'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = event.time_start ? `${event.time_start}${event.time_end ? ' – ' + event.time_end : ''}` : null;
  const slug = s => s?.replace(/[\s/,&]+/g, '') || '';
  const hashtags = ['#StageMap', profileGenre ? '#' + slug(profileGenre) : '#LiveMusic', profileRegion ? '#' + slug(profileRegion) : null, '#Concert', '#Live'].filter(Boolean).join(' ');

  const post = [
    `🎭 ${event.title}`,
    '',
    `📅 ${dateStr}`,
    timeStr ? `⏰ ${timeStr}` : null,
    event.location ? `📍 ${event.location}` : null,
    profileName ? `🎵 ${profileName}${profileRegion ? ' · ' + profileRegion : ''}` : null,
    profileGenre ? `🎼 ${profileGenre}` : null,
    '',
    event.description ? event.description : null,
    '',
    `Réservez sur StageMap 👉 ${profileUrl}`,
    '',
    hashtags,
  ].filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  const enc = encodeURIComponent(post);
  const urlEnc = encodeURIComponent(profileUrl);
  const platforms = [
    { label: '𝕏 Twitter',  url: `https://twitter.com/intent/tweet?text=${enc}`,                                                           color: '#1da1f2' },
    { label: '💬 WhatsApp', url: `https://wa.me/?text=${enc}`,                                                                             color: '#25d366' },
    { label: '📘 Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${urlEnc}`,                                                 color: '#1877f2' },
    { label: '💼 LinkedIn', url: `https://www.linkedin.com/shareArticle?mini=true&url=${urlEnc}&title=${encodeURIComponent(event.title)}`,  color: '#0a66c2' },
  ];

  const copy = () => {
    navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success(t('post_copied'));
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000095', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, maxWidth:500, width:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 40px 100px #00000090' }}>
        <div style={{ padding:'15px 22px', borderBottom:'1px solid '+C.border, background:C.card, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:C.cream }}>{t('share.title')}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.dim, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{t('share.desc')}</div>

          <textarea readOnly value={post} rows={11}
            style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'12px 14px', color:C.text, fontFamily:'monospace', fontSize:12, lineHeight:1.7, resize:'none', width:'100%', outline:'none' }} />

          <button onClick={copy}
            style={{ width:'100%', padding:'11px 0', background:copied?C.green+'22':'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color:copied?C.green:'#fff', border:'1px solid '+(copied?C.green+'55':'transparent'), borderRadius:9, fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer', transition:'all .2s' }}>
            {copied ? t('share.copied') : t('share.copy')}
          </button>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {platforms.map(p => (
              <a key={p.label} href={p.url} target='_blank' rel='noreferrer'
                style={{ flex:1, minWidth:110, display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 0', background:p.color+'18', border:'1px solid '+p.color+'44', borderRadius:8, color:p.color, fontSize:12, fontWeight:600, textDecoration:'none', fontFamily:"'Outfit',sans-serif", transition:'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = p.color+'30'}
                onMouseLeave={e => e.currentTarget.style.background = p.color+'18'}>
                {p.label}
              </a>
            ))}
          </div>

          <div style={{ fontSize:10, color:C.dim, textAlign:'center' }}>
            {t('share.ig_note')}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN CalendarView
══════════════════════════════════ */
export function CalendarView({ myId, profiles = [], onInvite, myProfile }) {
  const t = useT();
  const today = new Date();
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth());
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formDate, setFormDate]       = useState(null);
  const [editEvent, setEditEvent]     = useState(null);
  const [view, setView]               = useState('month');
  const [filterType, setFilterType]   = useState('all');
  const [showSearch, setShowSearch]   = useState(false);
  const [compareProfile, setCompareProfile] = useState(null);
  const [shareEvent, setShareEvent]   = useState(null);

  const ET = EVENT_TYPE_KEYS.map(e => ({ ...e, l: t('cal.' + e.k) }));
  const REC = RECURRENCE_KEYS.map(k => ({ k, l: t('cal.recurrence_' + k) }));
  const months = t('cal.months');
  const days   = t('cal.days');

  const loadEntries = async () => {
    setLoading(true);
    try {
      const from = new Date(year, month - 1, 1).toISOString();
      const to   = new Date(year, month + 2, 0).toISOString();
      const { data, error } = await supabase
        .from('calendar_entries').select('*')
        .eq('user_id', myId)
        .gte('date_start', from)
        .lte('date_start', to)
        .order('date_start', { ascending: true });
      if (error) throw error;
      setEntries(data || []);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [year, month, myId]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const getEventsForDay = (day) => {
    const d = new Date(year, month, day);
    return entries.filter(e => {
      const start = new Date(e.date_start);
      const end   = new Date(e.date_end || e.date_start);
      const dStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dEnd   = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return d >= dStart && d <= dEnd;
    }).filter(e => filterType === 'all' || e.event_type === filterType);
  };

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.event_type === filterType);

  const filterButtons = [{ k: 'all', l: t('cal.all'), c: null }, ...ET];
  const viewButtons = [{ k: 'month', l: t('cal.month_view') }, { k: 'list', l: t('cal.list_view') }];

  return (
    <div className='fade-in'>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>‹</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: C.cream, minWidth: 180, textAlign: 'center' }}>{months[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 11, fontFamily: "'Outfit',sans-serif" }}>{t('cal.today')}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterButtons.map(fb => (
            <button key={fb.k} onClick={() => setFilterType(fb.k)}
              style={{ background: filterType === fb.k ? (fb.c || C.orange)+'22' : C.tag, border: '1px solid '+(filterType === fb.k ? (fb.c || C.orange) : C.border), borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: filterType === fb.k ? (fb.c || C.orange) : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: filterType === fb.k ? 600 : 400 }}>
              {fb.l}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          {viewButtons.map(vb => (
            <button key={vb.k} onClick={() => setView(vb.k)}
              style={{ background: view === vb.k ? C.orange+'22' : C.tag, border: '1px solid '+(view === vb.k ? C.orange : C.border), borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: view === vb.k ? C.orange : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: view === vb.k ? 600 : 400 }}>
              {vb.l}
            </button>
          ))}
          <Btn v='secondary' sz='sm' onClick={() => setShowSearch(true)}>{t('cal.compare')}</Btn>
          <Btn sz='sm' onClick={() => { setFormDate(today); setEditEvent(null); }}>{t('cal.new')}</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 280px' : '1fr', gap: 16 }}>
        {view === 'month' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {[...Array(firstDay)].map((_, i) => <div key={'e'+i} style={{ minHeight: 80, background: C.bg+'80', borderRadius: 6 }} />)}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const d   = new Date(year, month, day);
                const isToday    = isSameDay(d, today);
                const isSelected = selectedDate && isSameDay(d, selectedDate);
                const dayEvents  = getEventsForDay(day);
                return (
                  <div key={day} onClick={() => setSelectedDate(isSelected ? null : d)}
                    style={{ minHeight: 80, background: isSelected ? C.orange+'15' : C.card, border: '1px solid '+(isSelected ? C.orange : isToday ? C.glow+'66' : C.border), borderRadius: 8, padding: '6px 5px', cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.cardHov; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = C.card; }}>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? C.glow : C.text, marginBottom: 3, width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto', background: isToday ? C.glow+'22' : 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayEvents.slice(0, 3).map(e => {
                        const ec = getEventColor(e.event_type);
                        const isPublic = e.visibility === 'public';
                        return (
                          <div key={e.id}
                            style={{ background: ec+(isPublic?'44':'22'), border: isPublic?'1px solid '+ec:'none', borderLeft: (isPublic?'3px':'2px')+' solid '+ec, borderRadius: 3, padding: '1px 4px', fontSize: 10, color: ec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            onClick={ev => { ev.stopPropagation(); setEditEvent(e); setFormDate(null); }}>
                            {isPublic && '🌐 '}{e.time_start && e.time_start.slice(0, 5) + ' '}{e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && <div style={{ fontSize: 9, color: C.dim }}>{t('cal.others', { n: dayEvents.length - 3 })}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div>
            {loading && <div style={{ color: C.dim, fontSize: 13, padding: '20px 0' }}>{t('cal.loading')}</div>}
            {!loading && filtered.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>{t('cal.no_events')}</div>}
            {filtered.map(e => {
              const ec = getEventColor(e.event_type);
              const isPublic = e.visibility === 'public';
              return (
                <div key={e.id} onClick={() => { setEditEvent(e); setFormDate(null); }}
                  style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '3px solid '+ec, borderRadius: 9, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = C.cardHov}
                  onMouseLeave={ev => ev.currentTarget.style.background = C.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{e.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isPublic && <span style={{ background: C.green+'22', color: C.green, border: '1px solid '+C.green+'55', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{t('cal.public_lbl')}</span>}
                      <span style={{ fontSize: 10, color: C.dim }}>{new Date(e.date_start).toLocaleDateString(t('cal.locale'), { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  {isPublic && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: C.green+'11', border: '1px solid '+C.green+'33', borderRadius: 5, padding: '4px 8px', marginBottom: 7 }}>
                      <span style={{ fontSize: 10, color: C.green }}>{t('cal.visible_to_all')}</span>
                      <button onClick={ev => { ev.stopPropagation(); setShareEvent(e); }}
                        style={{ background:C.orange+'22', border:'1px solid '+C.orange+'44', borderRadius:5, color:C.orange, fontSize:10, fontWeight:600, padding:'2px 8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", flexShrink:0 }}>
                        {t('share.btn')}
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.muted }}>
                    {e.time_start && <span>🕐 {e.time_start} – {e.time_end}</span>}
                    {e.location && <span>📍 {e.location}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                    <span style={{ background: ec+'22', color: ec, borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{ET.find(et => et.k === e.event_type)?.l || e.event_type}</span>
                    {e.recurrence !== 'none' && <span style={{ fontSize: 10, color: C.blue }}>🔄 {REC.find(r => r.k === e.recurrence)?.l}</span>}
                    {!isPublic && <span style={{ fontSize: 10, color: e.visibility === 'shared' ? C.blue : C.dim }}>{e.visibility === 'shared' ? t('cal.shared_lbl') : t('cal.private_lbl')}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedDate && view === 'month' && (
          <DayPanel date={selectedDate} events={entries}
            onEdit={e => { setEditEvent(e); setFormDate(null); setSelectedDate(null); }}
            onClose={() => setSelectedDate(null)}
            onNew={() => { setFormDate(selectedDate); setEditEvent(null); setSelectedDate(null); }}
            onRefresh={loadEntries}
          />
        )}
      </div>

      <div style={{ marginTop: 16, background: C.card, border: '1px solid '+C.border, borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{t('cal.share_profile')}</div>
          <div style={{ fontSize: 11, color: C.dim }}>{window.location.origin}/profile/{myId}</div>
        </div>
        <Btn v='ghost' sz='sm' onClick={() => { navigator.clipboard.writeText(window.location.origin + '/profile/' + myId); toast.success(t('link_copied')); }}>{t('btn.copy')}</Btn>
      </div>

      {showSearch && (
        <ProfileSearch
          profiles={profiles}
          myId={myId}
          onSelect={p => { setCompareProfile(p); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {compareProfile && (
        <SharedCalendarView
          myId={myId}
          otherProfile={compareProfile}
          onClose={() => setCompareProfile(null)}
          onInvite={(profile, date) => { setCompareProfile(null); if(onInvite) onInvite(profile, date); }}
        />
      )}

      {(formDate || editEvent) && (
        <EventFormModal
          date={formDate}
          event={editEvent}
          myId={myId}
          myProfile={myProfile}
          allProfiles={profiles}
          onSave={(entry) => {
            setFormDate(null); setEditEvent(null); loadEntries();
            if (entry?.visibility === 'public') setShareEvent(entry);
          }}
          onDelete={() => { setFormDate(null); setEditEvent(null); loadEntries(); }}
          onClose={() => { setFormDate(null); setEditEvent(null); }}
        />
      )}

      {shareEvent && (
        <ShareEventModal
          event={shareEvent}
          profileUrl={`${window.location.origin}/profile/${myId}`}
          profileName={myProfile?.name}
          profileGenre={myProfile?.genre}
          profileRegion={myProfile?.region}
          onClose={() => setShareEvent(null)}
        />
      )}
    </div>
  );
}

// src/components/CalendarView.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const C = {
  bg:"#140c00", bg2:"#1e1100", card:"#271500", cardHov:"#301a00",
  border:"#3d2200", borderHov:"#6b3d00",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030", amber:"#ffb940",
  brown:"#7a4010", brownLt:"#a05820",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", red:"#ff5040", blue:"#40a8ff", purple:"#c060ff", tag:"#2a1600",
};

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

const EVENT_TYPES = [
  { k:'availability', l:'🟢 Disponibilité', c:C.green },
  { k:'event',        l:'🎵 Événement',     c:C.orange },
  { k:'booking',      l:'📋 Booking',       c:C.blue },
  { k:'personal',     l:'🔒 Personnel',     c:C.muted },
];

const RECURRENCE = [
  { k:'none',     l:'Aucune' },
  { k:'weekly',   l:'Chaque semaine' },
  { k:'biweekly', l:'Toutes les 2 semaines' },
  { k:'monthly',  l:'Chaque mois' },
];

function getEventColor(type) { return EVENT_TYPES.find(e => e.k === type)?.c || C.orange; }
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

/* ── Event Form Modal ── */
function EventFormModal({ date, event, myId, onSave, onDelete, onClose }) {
  const isEdit = !!event;

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
    title:        event?.title || '',
    description:  event?.description || '',
    event_type:   event?.event_type || 'availability',
    date_start:   event?.date_start ? getDateStr(event.date_start) : (date ? toDateStr(date) : ''),
    date_end:     event?.date_end   ? getDateStr(event.date_end)   : (date ? toDateStr(date) : ''),
    time_start:   event?.time_start || (event?.date_start ? getTimeStr(event.date_start, '09:00') : '09:00'),
    time_end:     event?.time_end   || (event?.date_end   ? getTimeStr(event.date_end,   '17:00') : '17:00'),
    location:     event?.location || '',
    visibility:   event?.visibility || 'public',
    recurrence:   event?.recurrence || 'none',
    notify_email: event?.notify_email !== false,
    is_availability: event?.is_availability || false,
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    set('is_availability', form.event_type === 'availability');
  }, [form.event_type]);

  const save = async () => {
    if (!form.title) { toast.error('Titre requis'); return; }
    if (!form.date_start) { toast.error('Date de début requise'); return; }
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
        toast.success('Événement mis à jour ✓');
      } else {
        const { error } = await supabase.from('calendar_entries').insert(entry);
        if (error) throw error;
        toast.success('Événement ajouté ✓');
      }
      onSave();
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const del = async () => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('calendar_entries').delete().eq('id', event.id);
      if (error) throw error;
      toast.success('Événement supprimé');
      onDelete();
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '15px 22px', borderBottom: '1px solid '+C.border, background: C.card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: C.cream }}>
            {isEdit ? "Modifier l'événement" : 'Nouvel événement'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Type</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {EVENT_TYPES.map(t => (
                <button key={t.k} onClick={() => set('event_type', t.k)}
                  style={{ background: form.event_type === t.k ? t.c+'22' : C.tag, border: '1px solid '+(form.event_type === t.k ? t.c : C.border), borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, color: form.event_type === t.k ? t.c : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: form.event_type === t.k ? 600 : 400 }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Titre *</div>
            <Inp value={form.title} onChange={v => set('title', v)} placeholder={form.event_type === 'availability' ? 'Ex: Disponible pour concerts' : 'Ex: Concert au Café Scène'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Date début</div>
              <input type='date' value={form.date_start} onChange={e => set('date_start', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Date fin</div>
              <input type='date' value={form.date_end} onChange={e => set('date_end', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Heure début</div>
              <input type='time' value={form.time_start} onChange={e => set('time_start', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Heure fin</div>
              <input type='time' value={form.time_end} onChange={e => set('time_end', e.target.value)} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Lieu (optionnel)</div>
            <Inp value={form.location} onChange={v => set('location', v)} placeholder='Ex: Le Café Scène, Montréal' />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Description (optionnel)</div>
            <Inp value={form.description} onChange={v => set('description', v)} placeholder='Détails supplémentaires...' ml rows={2} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Récurrence</div>
            <Sel value={form.recurrence} onChange={v => set('recurrence', v)} options={RECURRENCE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Visibilité</div>
              <Sel value={form.visibility} onChange={v => set('visibility', v)} options={[{ k: 'public', l: '🌐 Public' }, { k: 'shared', l: '🔗 Partagé' }, { k: 'private', l: '🔒 Privé' }]} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                <input type='checkbox' checked={form.notify_email} onChange={e => set('notify_email', e.target.checked)} style={{ accentColor: C.orange, width: 14, height: 14 }} />
                <span style={{ fontSize: 12, color: C.text }}>📧 Notifier par courriel</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            {isEdit && <Btn v='danger' sz='sm' onClick={del} disabled={loading}>🗑 Supprimer</Btn>}
            <div style={{ flex: 1 }} />
            <Btn v='ghost' onClick={onClose}>Annuler</Btn>
            <Btn onClick={save} disabled={loading}>{loading ? '⏳' : isEdit ? '💾 Sauvegarder' : '✦ Ajouter'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Day Detail Panel ── */
function DayPanel({ date, events, onEdit, onClose, onNew }) {
  const dayEvents = events.filter(e => {
    const start = new Date(e.date_start);
    const end   = new Date(e.date_end || e.date_start);
    return date >= new Date(start.toDateString()) && date <= new Date(end.toDateString());
  });
  return (
    <div style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 12, padding: 16, minWidth: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 700, color: C.cream }}>
          {date.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}>✕</button>
      </div>
      {dayEvents.length === 0 && <div style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>Aucun événement ce jour</div>}
      {dayEvents.map(e => (
        <div key={e.id} onClick={() => onEdit(e)}
          style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '3px solid '+getEventColor(e.event_type), borderRadius: 8, padding: '8px 10px', marginBottom: 7, cursor: 'pointer' }}
          onMouseEnter={ev => ev.currentTarget.style.background = C.cardHov}
          onMouseLeave={ev => ev.currentTarget.style.background = C.card}>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 2 }}>{e.title}</div>
          {e.time_start && <div style={{ fontSize: 11, color: C.muted }}>🕐 {e.time_start} – {e.time_end}</div>}
          {e.location && <div style={{ fontSize: 11, color: C.dim }}>📍 {e.location}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span style={{ background: getEventColor(e.event_type)+'22', color: getEventColor(e.event_type), borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>
              {EVENT_TYPES.find(t => t.k === e.event_type)?.l || e.event_type}
            </span>
            <span style={{ fontSize: 10, color: e.visibility === 'public' ? C.green : e.visibility === 'shared' ? C.blue : C.dim }}>
              {e.visibility === 'public' ? '🌐' : e.visibility === 'shared' ? '🔗' : '🔒'}
            </span>
          </div>
        </div>
      ))}
      <Btn onClick={onNew} full sz='sm' style={{ marginTop: 4 }}>+ Ajouter ici</Btn>
    </div>
  );
}

/* ── Profile Search ── */
function ProfileSearch({ profiles, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = profiles.filter(p =>
    (p.name + p.genre + p.region).toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 420, width: '100%', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid '+C.border, background: C.card, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: C.cream, marginBottom: 10 }}>Comparer avec...</div>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder='Chercher un artiste, lieu...'
            style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
        </div>
        <div style={{ padding: 12, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun profil trouvé</div>}
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
              <span style={{ fontSize: 10, color: C.green }}>Voir agenda →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shared Calendar View ── */
function SharedCalendarView({ myId, otherProfile, onClose, onInvite }) {
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
        supabase.from('calendar_entries').select('*').eq('user_id', otherProfile.id).eq('visibility', 'public').gte('date_start', from).lte('date_start', to),
      ]);
      setMyEntries(mine || []);
      setOtherEntries(theirs || []);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const getAvail = (entries, day) => {
    const d = new Date(year, month, day);
    return entries.filter(e => {
      if (e.event_type !== 'availability') return false;
      const s = new Date(e.date_start);
      const en = new Date(e.date_end || e.date_start);
      return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
             d <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000095', zIndex: 2500, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg2, border: '1px solid '+C.border, borderRadius: 16, maxWidth: 900, width: '100%', margin: '0 auto', boxShadow: '0 40px 100px #00000090' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid '+C.border, background: C.card, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{otherProfile.avatar || '🎵'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: C.cream }}>Disponibilités avec {otherProfile.name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Cliquez sur une plage ✨ commune pour envoyer une invitation</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: '10px 22px', borderBottom: '1px solid '+C.border, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { color: C.green,  label: 'Vous disponible' },
            { color: C.blue,   label: otherProfile.name + ' disponible' },
            { color: C.purple, label: '✨ Commun — cliquer pour inviter' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />{l.label}
            </span>
          ))}
        </div>

        <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>‹</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: C.cream, flex: 1, textAlign: 'center' }}>{MONTHS_FR[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>›</button>
        </div>

        <div style={{ padding: '0 22px 22px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>Chargement…</div>}
          {!loading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {DAYS_FR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {[...Array(firstDay)].map((_, i) => <div key={'e'+i} style={{ minHeight: 70, background: C.bg+'80', borderRadius: 6 }} />)}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const d   = new Date(year, month, day);
                  const isToday   = isSameDay(d, today);
                  const myAvail   = getAvail(myEntries, day);
                  const othAvail  = getAvail(otherEntries, day);
                  const both      = myAvail.length > 0 && othAvail.length > 0;
                  const onlyMe    = myAvail.length > 0 && othAvail.length === 0;
                  const onlyOther = myAvail.length === 0 && othAvail.length > 0;

                  let bg = C.card;
                  let brd = isToday ? C.glow+'66' : C.border;
                  if (both)      { bg = C.purple+'22'; brd = C.purple; }
                  else if (onlyMe)    { bg = C.green+'11';  brd = C.green+'66'; }
                  else if (onlyOther) { bg = C.blue+'11';   brd = C.blue+'66'; }

                  return (
                    <div key={day}
                      onClick={() => both && setSelectedSlot({ day, date: d })}
                      style={{ minHeight: 70, background: bg, border: '1px solid '+brd, borderRadius: 8, padding: '5px 4px', cursor: both ? 'pointer' : 'default', transition: 'all .15s' }}
                      onMouseEnter={e => { if (both) e.currentTarget.style.transform = 'scale(1.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? C.glow : C.text, marginBottom: 3 }}>{day}</div>
                      {both      && <div style={{ fontSize: 9, color: C.purple, fontWeight: 700 }}>✨ Commun</div>}
                      {onlyMe    && <div style={{ fontSize: 9, color: C.green }}>🟢 Vous</div>}
                      {onlyOther && <div style={{ fontSize: 9, color: C.blue }}>🔵 {otherProfile.name.split(' ')[0]}</div>}
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
              ✨ {selectedSlot.date.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Vous êtes tous les deux disponibles. Envoyez une invitation à {otherProfile.name} !
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => { onInvite(otherProfile, selectedSlot.date); onClose(); }}>🗺️ Envoyer une invitation</Btn>
              <Btn v='ghost' onClick={() => setSelectedSlot(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN CalendarView
══════════════════════════════════ */
export function CalendarView({ myId, profiles = [] }) {
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

  return (
    <div className='fade-in'>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>‹</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: C.cream, minWidth: 180, textAlign: 'center' }}>{MONTHS_FR[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '5px 10px', fontSize: 14 }}>›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 7, color: C.muted, cursor: 'pointer', padding: '4px 9px', fontSize: 11, fontFamily: "'Outfit',sans-serif" }}>Aujourd'hui</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ k: 'all', l: 'Tous' }, ...EVENT_TYPES].map(t => (
            <button key={t.k} onClick={() => setFilterType(t.k)}
              style={{ background: filterType === t.k ? (t.c || C.orange)+'22' : C.tag, border: '1px solid '+(filterType === t.k ? (t.c || C.orange) : C.border), borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: filterType === t.k ? (t.c || C.orange) : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: filterType === t.k ? 600 : 400 }}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          {[{ k: 'month', l: '📅 Mois' }, { k: 'list', l: '📋 Liste' }].map(v => (
            <button key={v.k} onClick={() => setView(v.k)}
              style={{ background: view === v.k ? C.orange+'22' : C.tag, border: '1px solid '+(view === v.k ? C.orange : C.border), borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: view === v.k ? C.orange : C.muted, fontFamily: "'Outfit',sans-serif", fontWeight: view === v.k ? 600 : 400 }}>
              {v.l}
            </button>
          ))}
          <Btn v='secondary' sz='sm' onClick={() => setShowSearch(true)}>👥 Comparer</Btn>
          <Btn sz='sm' onClick={() => { setFormDate(today); setEditEvent(null); }}>+ Nouveau</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 280px' : '1fr', gap: 16 }}>
        {view === 'month' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS_FR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>)}
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
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id}
                          style={{ background: getEventColor(e.event_type)+'33', borderLeft: '2px solid '+getEventColor(e.event_type), borderRadius: 3, padding: '1px 4px', fontSize: 10, color: getEventColor(e.event_type), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          onClick={ev => { ev.stopPropagation(); setEditEvent(e); setFormDate(null); }}>
                          {e.time_start && e.time_start.slice(0, 5) + ' '}{e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{ fontSize: 9, color: C.dim }}>+{dayEvents.length - 3} autres</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div>
            {loading && <div style={{ color: C.dim, fontSize: 13, padding: '20px 0' }}>Chargement…</div>}
            {!loading && filtered.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Aucun événement ce mois</div>}
            {filtered.map(e => (
              <div key={e.id} onClick={() => { setEditEvent(e); setFormDate(null); }}
                style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '3px solid '+getEventColor(e.event_type), borderRadius: 9, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = C.cardHov}
                onMouseLeave={ev => ev.currentTarget.style.background = C.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{e.title}</div>
                  <span style={{ fontSize: 10, color: C.dim }}>{new Date(e.date_start).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.muted }}>
                  {e.time_start && <span>🕐 {e.time_start} – {e.time_end}</span>}
                  {e.location && <span>📍 {e.location}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <span style={{ background: getEventColor(e.event_type)+'22', color: getEventColor(e.event_type), borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{EVENT_TYPES.find(t => t.k === e.event_type)?.l || e.event_type}</span>
                  {e.recurrence !== 'none' && <span style={{ fontSize: 10, color: C.blue }}>🔄 {RECURRENCE.find(r => r.k === e.recurrence)?.l}</span>}
                  <span style={{ fontSize: 10, color: e.visibility === 'public' ? C.green : e.visibility === 'shared' ? C.blue : C.dim }}>{e.visibility === 'public' ? '🌐 Public' : e.visibility === 'shared' ? '🔗 Partagé' : '🔒 Privé'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDate && view === 'month' && (
          <DayPanel date={selectedDate} events={entries}
            onEdit={e => { setEditEvent(e); setFormDate(null); setSelectedDate(null); }}
            onClose={() => setSelectedDate(null)}
            onNew={() => { setFormDate(selectedDate); setEditEvent(null); setSelectedDate(null); }}
          />
        )}
      </div>

      <div style={{ marginTop: 16, background: C.card, border: '1px solid '+C.border, borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>🔗 Partager mon calendrier public</div>
          <div style={{ fontSize: 11, color: C.dim }}>stagemap.io/cal/{myId?.slice(0, 8)}</div>
        </div>
        <Btn v='ghost' sz='sm' onClick={() => { navigator.clipboard.writeText('stagemap.io/cal/' + myId?.slice(0, 8)); toast.success('Lien copié !'); }}>Copier</Btn>
      </div>

      {showSearch && (
        <ProfileSearch
          profiles={profiles}
          onSelect={p => { setCompareProfile(p); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {compareProfile && (
        <SharedCalendarView
          myId={myId}
          otherProfile={compareProfile}
          onClose={() => setCompareProfile(null)}
          onInvite={(profile, date) => { setCompareProfile(null); }}
        />
      )}

      {(formDate || editEvent) && (
        <EventFormModal
          date={formDate}
          event={editEvent}
          myId={myId}
          onSave={() => { setFormDate(null); setEditEvent(null); loadEntries(); }}
          onDelete={() => { setFormDate(null); setEditEvent(null); loadEntries(); }}
          onClose={() => { setFormDate(null); setEditEvent(null); }}
        />
      )}
    </div>
  );
}

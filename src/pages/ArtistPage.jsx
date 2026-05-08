// src/pages/ArtistPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../lib/store';
import {
  supabase,
  getArtistProfile, getRepertoryItems,
  getFanSubscription, subscribeToArtist, unsubscribeFromArtist,
  addRepertoryItem, deleteRepertoryItem,
  getChatMessages, sendChatMessage, subscribeToChatRoom, getRoomId,
  getMyCalendar, createInvitation, sendMessage,
} from '../lib/supabase';

const C = {
  bg:"#140c00", bg2:"#1e1100", card:"#271500", cardHov:"#301a00",
  border:"#3d2200", borderHov:"#6b3d00",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030", amber:"#ffb940",
  brown:"#7a4010",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", red:"#ff5040", blue:"#40a8ff", purple:"#c060ff", tag:"#2a1600",
};

const TIER_CONFIG = {
  all_stars: {
    label: '⭐ All Stars',
    color: C.purple,
    glow: C.purple + '40',
    badge: '⭐ All Stars — Professionnel',
    monthlyPrice: 29,
    annualPrice: 290,
    desc: 'Artiste professionnel · Accès complet au booking, agenda partagé et chat direct',
    features: ['Profil complet avec médias', 'Agenda partagé (dates de tournée)', 'Réservation directe avec contrat', 'Chat direct & messagerie', 'Répertoire complet'],
  },
  local_legends: {
    label: '🎵 Local Legends',
    color: C.orange,
    glow: C.orange + '40',
    badge: '🎵 Local Legends — Semi-pro',
    monthlyPrice: 15,
    annualPrice: 150,
    desc: 'Artiste semi-professionnel · Profil complet, agenda et chat inclus',
    features: ['Profil complet avec médias', 'Agenda partagé', 'Chat direct', 'Répertoire complet'],
  },
  amateur: {
    label: '🎶 Amateur',
    color: C.muted,
    glow: C.muted + '20',
    badge: '🎶 Amateur — Gratuit',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Artiste amateur · Accès gratuit au répertoire uniquement',
    features: ['Répertoire public'],
  },
};

const typeColors = { artist: C.orange, venue: C.brown, fan: C.amber };

function Btn({ children, onClick, v = 'primary', sz = 'md', disabled, full, style: s = {} }) {
  const base = { fontFamily:"'Outfit',sans-serif", fontWeight:600, cursor:disabled?'not-allowed':'pointer', border:'none', borderRadius:8, transition:'all .15s', opacity:disabled?.5:1, width:full?'100%':'auto', ...s };
  const sizes = { sm:{padding:'5px 12px',fontSize:12}, md:{padding:'9px 18px',fontSize:13}, lg:{padding:'13px 28px',fontSize:15} }[sz];
  const vars = {
    primary:   { background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color:'#fff', boxShadow:'0 4px 16px '+C.orange+'44' },
    secondary: { background:C.tag, color:C.muted, border:'1px solid '+C.border },
    ghost:     { background:'none', color:C.muted, border:'1px solid '+C.border },
    danger:    { background:C.red+'22', color:C.red, border:'1px solid '+C.red+'44' },
    purple:    { background:'linear-gradient(135deg,'+C.purple+',#8030cc)', color:'#fff', boxShadow:'0 4px 16px '+C.purple+'44' },
    amber:     { background:C.amber+'22', color:C.amber, border:'1px solid '+C.amber+'44' },
  }[v];
  return <button onClick={onClick} disabled={disabled} style={{...base,...sizes,...vars}}>{children}</button>;
}

function Spinner() {
  return <div style={{width:20,height:20,border:'2px solid '+C.border,borderTop:'2px solid '+C.orange,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>;
}

/* ── Tier subscription modal ── */
function SubscribeModal({ artist, tier, myProfile, onClose, onSuccess }) {
  const cfg = TIER_CONFIG[tier];
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const price = plan === 'annual' ? cfg.annualPrice : cfg.monthlyPrice;
  const savings = cfg.monthlyPrice * 12 - cfg.annualPrice;

  const handleSubscribe = async () => {
    if (!myProfile) { toast.error('Connectez-vous pour vous abonner'); return; }
    setLoading(true);
    try {
      await subscribeToArtist(myProfile.id, artist.id, plan);
      toast.success('Abonnement activé ! Bienvenue 🎉');
      onSuccess();
    } catch(e) { toast.error(e.message || 'Erreur de paiement'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000090', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg2, border:'1px solid '+cfg.color+'66', borderRadius:20, maxWidth:460, width:'100%', padding:32, boxShadow:'0 40px 100px #00000099, 0 0 60px '+cfg.glow }}>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>{artist.avatar || '🎵'}</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:C.cream }}>{artist.name}</div>
          <div style={{ display:'inline-block', marginTop:8, background:cfg.color+'22', border:'1px solid '+cfg.color+'55', color:cfg.color, borderRadius:20, padding:'3px 14px', fontSize:11, fontWeight:700 }}>{cfg.badge}</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:10, lineHeight:1.6 }}>{cfg.desc}</div>
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:22 }}>
          {[['monthly','Mensuel','/ mois'],['annual','Annuel','/ an']].map(([k,l,sfx]) => {
            const p = k === 'annual' ? cfg.annualPrice : cfg.monthlyPrice;
            return (
              <div key={k} onClick={() => setPlan(k)}
                style={{ flex:1, padding:14, background:plan===k?cfg.color+'22':C.tag, border:'1px solid '+(plan===k?cfg.color:C.border), borderRadius:12, cursor:'pointer', textAlign:'center', transition:'all .15s' }}>
                <div style={{ fontSize:11, color:plan===k?cfg.color:C.muted, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:700, color:plan===k?cfg.color:C.text }}>{p === 0 ? 'Gratuit' : p+'$'}</div>
                {p > 0 && <div style={{ fontSize:10, color:C.dim }}>{sfx}</div>}
                {k === 'annual' && savings > 0 && <div style={{ fontSize:9, color:C.green, marginTop:3 }}>Économisez {savings}$</div>}
              </div>
            );
          })}
        </div>

        <div style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:10, padding:14, marginBottom:20 }}>
          <div style={{ fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Inclus</div>
          {cfg.features.map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:12, color:C.muted }}>
              <span style={{ color:C.green }}>✓</span>{f}
            </div>
          ))}
        </div>

        {price > 0 ? (
          <div style={{ background:C.amber+'11', border:'1px solid '+C.amber+'33', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:11, color:C.muted, lineHeight:1.6 }}>
            💳 Paiement sécurisé via Stripe · Annulez à tout moment
          </div>
        ) : null}

        <div style={{ display:'flex', gap:10 }}>
          <Btn v='ghost' onClick={onClose} style={{ flex:1 }}>Annuler</Btn>
          <button onClick={handleSubscribe} disabled={loading}
            style={{ flex:2, background:'linear-gradient(135deg,'+cfg.color+','+(tier==='all_stars'?'#8030cc':C.orangeLt)+')', border:'none', borderRadius:8, color:'#fff', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14, padding:'11px 0', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1, boxShadow:'0 4px 20px '+cfg.glow, transition:'all .15s' }}>
            {loading ? '⏳ Activation...' : price === 0 ? 'Accès gratuit →' : 'S\'abonner pour '+price+'$ →'}
          </button>
        </div>

        <p style={{ marginTop:12, fontSize:10, color:C.dim, textAlign:'center' }}>
          En vous abonnant vous acceptez les conditions d'utilisation de StageMap
        </p>
      </div>
    </div>
  );
}

/* ── Repertory Tab ── */
function RepertoryTab({ artist, myProfile, isOwner }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:'', composer:'', duration:'', genre:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRepertoryItems(artist.id).then(data => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, [artist.id]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    setSaving(true);
    try {
      const item = await addRepertoryItem({ ...form, artist_id: artist.id, is_public: true });
      setItems(prev => [item, ...prev]);
      setForm({ title:'', composer:'', duration:'', genre:'', notes:'' });
      setShowAdd(false);
      toast.success('Œuvre ajoutée');
    } catch(e) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteRepertoryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Supprimé');
    } catch(e) { toast.error(e.message); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:C.cream, fontWeight:700 }}>Répertoire</div>
          <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>{items.length} œuvre{items.length !== 1 ? 's' : ''}</div>
        </div>
        {isOwner && <Btn sz='sm' onClick={() => setShowAdd(s => !s)}>{showAdd ? '✕ Annuler' : '+ Ajouter'}</Btn>}
      </div>

      {showAdd && (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:10, color:C.dim, letterSpacing:1.5, textTransform:'uppercase' }}>Nouvelle œuvre</div>
          {[
            { k:'title', ph:'Titre de l\'œuvre *' },
            { k:'composer', ph:'Compositeur / Auteur' },
            { k:'duration', ph:'Durée (ex: 3:45)' },
            { k:'genre', ph:'Genre musical' },
          ].map(f => (
            <input key={f.k} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
              style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', width:'100%' }}/>
          ))}
          <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder='Notes (facultatif)' rows={2}
            style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', resize:'vertical', width:'100%' }}/>
          <Btn onClick={handleAdd} disabled={saving} full>{saving ? '⏳ Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted, fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🎼</div>
          {isOwner ? 'Votre répertoire est vide — ajoutez vos premières œuvres.' : 'Répertoire non publié.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(item => (
            <div key={item.id} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12, transition:'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHov}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize:22, flexShrink:0 }}>🎵</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700, color:C.cream }}>{item.title}</div>
                <div style={{ display:'flex', gap:12, marginTop:3, flexWrap:'wrap' }}>
                  {item.composer && <span style={{ fontSize:11, color:C.muted }}>✍️ {item.composer}</span>}
                  {item.duration && <span style={{ fontSize:11, color:C.dim }}>⏱ {item.duration}</span>}
                  {item.genre && <span style={{ fontSize:10, background:C.orange+'18', color:C.orange, border:'1px solid '+C.orange+'33', borderRadius:20, padding:'1px 7px' }}>{item.genre}</span>}
                </div>
                {item.notes && <div style={{ fontSize:11, color:C.dim, marginTop:5, lineHeight:1.5 }}>{item.notes}</div>}
              </div>
              {isOwner && (
                <button onClick={() => handleDelete(item.id)} style={{ background:'none', border:'none', color:C.dim, cursor:'pointer', fontSize:14, padding:'2px 6px', borderRadius:5, flexShrink:0 }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.dim}>🗑</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Agenda Tab (gated: all_stars + local_legends) ── */
function AgendaTab({ artist, myProfile, hasAccess }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }
    getMyCalendar(artist.id).then(data => {
      setEvents(data.filter(e => e.visibility !== 'private'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [artist.id, hasAccess]);

  if (!hasAccess) return <GateScreen tier={artist.artist_tier} featureName="l'agenda partagé" />;
  if (loading) return <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:C.cream, fontWeight:700 }}>Agenda</div>

      {events.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted, fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
          Aucun événement à venir.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {events.map(ev => {
            const d = new Date(ev.date_start);
            const dateStr = d.toLocaleDateString('fr', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
            return (
              <div key={ev.id} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ textAlign:'center', background:C.purple+'18', border:'1px solid '+C.purple+'44', borderRadius:10, padding:'8px 12px', minWidth:52, flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:C.purple }}>{d.getDate()}</div>
                  <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:1 }}>{d.toLocaleDateString('fr',{month:'short'})}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700, color:C.cream }}>{ev.title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{dateStr}</div>
                  {ev.location && <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>📍 {ev.location}</div>}
                  {ev.description && <div style={{ fontSize:11, color:C.dim, marginTop:4, lineHeight:1.5 }}>{ev.description}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Booking Tab (gated: all_stars only) ── */
function BookingTab({ artist, myProfile, hasAccess }) {
  const [form, setForm] = useState({ tour_title:'', date:'', city:'', role:'', fee:'', note:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (!hasAccess) return <GateScreen tier={artist.artist_tier} featureName='la réservation directe' onlyAllStars />;

  const handleSend = async () => {
    if (!myProfile) { toast.error('Connectez-vous pour envoyer une demande'); return; }
    if (!form.tour_title || !form.date) { toast.error('Titre et date requis'); return; }
    setLoading(true);
    try {
      await createInvitation({
        organizer_id: myProfile.id,
        invitee_id: artist.id,
        tour_title: form.tour_title,
        date: form.date,
        city: form.city,
        role: form.role,
        fee: form.fee ? Number(form.fee) : null,
        note: form.note,
        status: 'pending',
      });
      toast.success('Demande de réservation envoyée !');
      setForm({ tour_title:'', date:'', city:'', role:'', fee:'', note:'' });
    } catch(e) { toast.error(e.message || 'Erreur'); }
    setLoading(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:C.cream, fontWeight:700 }}>Réservation directe</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>Envoyez une demande de booking avec contrat légal intégré</div>
      </div>

      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:14 }}>
        {[
          { k:'tour_title', ph:'Titre de l\'événement / tournée *', label:'Événement' },
          { k:'date', ph:'', label:'Date', type:'date' },
          { k:'city', ph:'Ville', label:'Lieu' },
          { k:'role', ph:'Ex: Artiste principal, DJ Set...', label:'Rôle' },
          { k:'fee', ph:'Cachet proposé ($)', label:'Cachet', type:'number' },
        ].map(f => (
          <div key={f.k}>
            <div style={{ fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>{f.label}</div>
            <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.ph}
              style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', width:'100%' }}/>
          </div>
        ))}
        <div>
          <div style={{ fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>Message</div>
          <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder='Message accompagnant la demande...' rows={3}
            style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', resize:'vertical', width:'100%' }}/>
        </div>

        <div style={{ background:C.amber+'11', border:'1px solid '+C.amber+'33', borderRadius:8, padding:'8px 12px', fontSize:11, color:C.muted, lineHeight:1.6 }}>
          📋 Un contrat légal standardisé sera joint automatiquement. L'artiste devra l'accepter pour confirmer.
        </div>

        <button onClick={handleSend} disabled={loading}
          style={{ background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border:'none', borderRadius:10, color:'#fff', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14, padding:'12px 0', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1, boxShadow:'0 4px 20px '+C.orange+'44' }}>
          {loading ? '⏳ Envoi...' : '📩 Envoyer la demande de booking'}
        </button>
      </div>
    </div>
  );
}

/* ── Chat Tab (gated: all_stars + local_legends) ── */
function ChatTab({ artist, myProfile, hasAccess }) {
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef();
  const roomId = myProfile ? getRoomId(myProfile.id, artist.id) : null;

  useEffect(() => {
    if (!hasAccess || !roomId) { setLoading(false); return; }
    getChatMessages(roomId).then(data => { setMsgs(data); setLoading(false); });
    const sub = subscribeToChatRoom(roomId, payload => { setMsgs(m => [...m, payload.new]); });
    return () => supabase.removeChannel(sub);
  }, [roomId, hasAccess]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  if (!hasAccess) return <GateScreen tier={artist.artist_tier} featureName='le chat direct' />;

  const send = async () => {
    if (!inp.trim() || !myProfile) return;
    const txt = inp; setInp('');
    await sendChatMessage(roomId, myProfile.id, txt);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:480 }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:C.cream, fontWeight:700, marginBottom:14 }}>Chat direct</div>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:4 }}>
        {loading && <div style={{ textAlign:'center', paddingTop:30 }}><Spinner /></div>}
        {!loading && msgs.length === 0 && <div style={{ textAlign:'center', padding:'30px 20px', color:C.muted, fontSize:13 }}>Démarrez la conversation avec {artist.name}</div>}
        {msgs.map((m, i) => {
          const isMe = myProfile && m.sender_id === myProfile.id;
          return (
            <div key={m.id || i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'72%', background:isMe?'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')':C.card, border:isMe?'none':'1px solid '+C.border, borderRadius:isMe?'12px 12px 2px 12px':'12px 12px 12px 2px', padding:'8px 13px', color:isMe?'#fff':C.text, fontSize:13, lineHeight:1.4 }}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {myProfile && (
        <div style={{ display:'flex', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid '+C.border }}>
          <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder='Votre message...'
            style={{ flex:1, background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none' }}/>
          <button onClick={send} style={{ background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, padding:'8px 16px', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>→</button>
        </div>
      )}
    </div>
  );
}

/* ── Gate screen for locked features ── */
function GateScreen({ tier, featureName, onlyAllStars }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.amateur;
  const requiredTier = onlyAllStars ? TIER_CONFIG.all_stars : (tier === 'amateur' ? null : cfg);
  return (
    <div style={{ textAlign:'center', padding:'50px 20px' }}>
      <div style={{ fontSize:44, marginBottom:14 }}>🔒</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:C.cream, fontWeight:700, marginBottom:10 }}>
        Accès abonnés
      </div>
      <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, maxWidth:320, margin:'0 auto 20px' }}>
        {onlyAllStars
          ? 'La réservation directe est réservée aux abonnés All Stars. Abonnez-vous pour accéder au booking avec contrat légal.'
          : `Abonnez-vous à ${featureName} de cet artiste pour accéder à ${featureName}.`}
      </div>
      <div style={{ display:'inline-block', background:cfg.color+'22', border:'1px solid '+cfg.color+'55', color:cfg.color, borderRadius:20, padding:'4px 16px', fontSize:12, fontWeight:600 }}>
        {onlyAllStars ? TIER_CONFIG.all_stars.badge : cfg.badge}
      </div>
    </div>
  );
}

/* ── Contact modal ── */
function ContactModal({ target, myProfile, onClose }) {
  const [subject, setSubject] = useState(`Message pour ${target.name}`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) { toast.error('Message requis'); return; }
    setSending(true);
    try {
      await sendMessage(myProfile.id, target.id, subject, body);
      setSent(true);
      toast.success('Message envoyé !');
      setTimeout(onClose, 1500);
    } catch(e) { toast.error(e.message || 'Erreur'); setSending(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000090', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:18, maxWidth:440, width:'100%', padding:28, boxShadow:'0 40px 100px #00000099' }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:C.cream, fontWeight:700, marginBottom:3 }}>Contacter {target.name}</div>
        <div style={{ fontSize:12, color:C.dim, marginBottom:20 }}>Ce message apparaîtra dans sa boîte de réception StageMap</div>

        {!myProfile ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✉️</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:18, lineHeight:1.6 }}>Créez un compte pour envoyer un message à {target.name}</div>
            <a href='/dashboard' style={{ display:'inline-block', background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color:'#fff', borderRadius:10, padding:'11px 22px', fontSize:13, fontWeight:700, textDecoration:'none', fontFamily:"'Outfit',sans-serif" }}>Rejoindre StageMap →</a>
          </div>
        ) : sent ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:C.green, fontSize:15 }}>✓ Message envoyé !</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>Sujet</div>
              <input value={subject} onChange={e=>setSubject(e.target.value)}
                style={{ width:'100%', background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none' }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>Message</div>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} placeholder={`Bonjour ${target.name}, ...`}
                style={{ width:'100%', background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', resize:'vertical' }}/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ flex:1, background:C.tag, border:'1px solid '+C.border, color:C.muted, borderRadius:8, padding:'10px 0', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13 }}>Annuler</button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex:2, background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border:'none', color:'#fff', borderRadius:8, padding:'10px 0', cursor:sending?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13, opacity:sending?.7:1 }}>
                {sending ? '⏳ Envoi...' : '✉️ Envoyer le message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ArtistPage ── */
export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: myProfile } = useStore();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('repertoire');
  const [subscription, setSubscription] = useState(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const isOwner = myProfile && artist && myProfile.id === artist.id;
  const tier = artist?.artist_tier || 'amateur';
  const cfg = TIER_CONFIG[tier];

  const hasSubscription = isOwner || (subscription && subscription.status === 'active');
  const canAccessAgenda = hasSubscription && (tier === 'all_stars' || tier === 'local_legends');
  const canAccessBooking = hasSubscription && tier === 'all_stars';
  const canAccessChat = hasSubscription && (tier === 'all_stars' || tier === 'local_legends');

  useEffect(() => {
    getArtistProfile(id)
      .then(data => { setArtist(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!myProfile || !artist || isOwner) return;
    getFanSubscription(myProfile.id, artist.id)
      .then(setSubscription)
      .catch(() => {});
  }, [myProfile, artist, isOwner]);

  const handleUnsubscribe = async () => {
    if (!myProfile || !subscription) return;
    setSubLoading(true);
    try {
      await unsubscribeFromArtist(myProfile.id, artist.id);
      setSubscription(null);
      toast.success('Abonnement annulé');
    } catch(e) { toast.error(e.message); }
    setSubLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner />
    </div>
  );

  if (notFound || !artist) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:C.muted }}>
      <div style={{ fontSize:48 }}>🎭</div>
      <div style={{ fontSize:16, color:C.text }}>Artiste introuvable</div>
      <button onClick={() => navigate('/')} style={{ background:'none', border:'1px solid '+C.border, color:C.muted, borderRadius:8, padding:'6px 16px', cursor:'pointer', fontSize:12, fontFamily:"'Outfit',sans-serif" }}>← Retour</button>
    </div>
  );

  const TABS = [
    { k:'repertoire', l:'Répertoire', icon:'🎼' },
    ...(tier !== 'amateur' ? [
      { k:'agenda', l:'Agenda', icon:'📅' },
      { k:'chat', l:'Chat', icon:'💬' },
    ] : []),
    ...(tier === 'all_stars' ? [{ k:'booking', l:'Réservation', icon:'📩' }] : []),
  ];

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'Outfit',sans-serif", color:C.text }}>

      {/* ── Hero ── */}
      <div style={{ position:'relative', background:'linear-gradient(180deg,'+C.bg2+' 0%,'+C.bg+' 100%)', borderBottom:'1px solid '+C.border, paddingBottom:0 }}>
        {/* Top glow for paid tiers */}
        {tier !== 'amateur' && (
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,'+cfg.color+',transparent)' }}/>
        )}

        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 20px 0' }}>
          {/* Back button */}
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:13, marginBottom:20, padding:0, fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
            ← Retour
          </button>

          <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:24, flexWrap:'wrap' }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:C.card, border:'3px solid '+(tier !== 'amateur' ? cfg.color : C.border), display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, boxShadow: tier !== 'amateur' ? '0 0 24px '+cfg.glow : 'none' }}>
                {artist.avatar || '🎵'}
              </div>
              {isOwner && (
                <div style={{ position:'absolute', bottom:-4, right:-4, background:C.glow, border:'2px solid '+C.bg, width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>✦</div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:C.cream, margin:0 }}>{artist.name}</h1>
                {tier !== 'amateur' && (
                  <span style={{ background:cfg.color+'22', border:'1px solid '+cfg.color+'55', color:cfg.color, borderRadius:20, padding:'3px 12px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{cfg.badge}</span>
                )}
              </div>
              {artist.genre && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>{artist.genre}</div>}
              {artist.region && <div style={{ fontSize:12, color:C.dim }}>📍 {artist.region}{artist.country ? ', '+artist.country : ''}</div>}
              {artist.bio && <p style={{ fontSize:13, color:C.muted, marginTop:8, lineHeight:1.6, maxWidth:480 }}>{artist.bio}</p>}
            </div>

            {/* Subscribe / manage / contact */}
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
              {!isOwner && tier !== 'amateur' && (
                hasSubscription ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                    <span style={{ background:C.green+'22', border:'1px solid '+C.green+'44', color:C.green, borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:600 }}>✓ Abonné</span>
                    <button onClick={handleUnsubscribe} disabled={subLoading} style={{ background:'none', border:'none', color:C.dim, cursor:'pointer', fontSize:11, fontFamily:"'Outfit',sans-serif" }}>
                      {subLoading ? '...' : 'Se désabonner'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowSubscribeModal(true)}
                    style={{ background:'linear-gradient(135deg,'+cfg.color+','+(tier==='all_stars'?'#8030cc':C.orangeLt)+')', border:'none', borderRadius:10, color:'#fff', fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13, padding:'10px 18px', cursor:'pointer', boxShadow:'0 4px 20px '+cfg.glow }}>
                    S'abonner {cfg.monthlyPrice > 0 ? '— '+cfg.monthlyPrice+'$ / mois' : '— Gratuit'}
                  </button>
                )
              )}
              {!isOwner && (
                <button onClick={() => setShowContactModal(true)}
                  style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, color:C.muted, fontSize:12, padding:'8px 14px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", whiteSpace:'nowrap' }}>
                  ✉️ Contacter
                </button>
              )}
              {isOwner && (
                <button onClick={() => navigate('/dashboard')} style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, color:C.muted, fontSize:12, padding:'8px 14px', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                  ⚙️ Gérer mon profil
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid '+C.border }}>
            {TABS.map(t => {
              const isLocked = !isOwner && (
                (t.k === 'agenda' && !canAccessAgenda) ||
                (t.k === 'booking' && !canAccessBooking) ||
                (t.k === 'chat' && !canAccessChat)
              );
              return (
                <button key={t.k} onClick={() => setTab(t.k)}
                  style={{ padding:'12px 18px', background:'none', border:'none', borderBottom:'2px solid '+(tab===t.k?cfg.color:'transparent'), color:tab===t.k?cfg.color:C.muted, cursor:'pointer', fontSize:13, fontFamily:"'Outfit',sans-serif", fontWeight:tab===t.k?600:400, transition:'all .15s', display:'flex', alignItems:'center', gap:5 }}>
                  {t.icon} {t.l} {isLocked && <span style={{ fontSize:9 }}>🔒</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 20px 60px' }} className='fade-in'>
        {tab === 'repertoire' && <RepertoryTab artist={artist} myProfile={myProfile} isOwner={isOwner} />}
        {tab === 'agenda'     && <AgendaTab artist={artist} myProfile={myProfile} hasAccess={canAccessAgenda} />}
        {tab === 'booking'    && <BookingTab artist={artist} myProfile={myProfile} hasAccess={canAccessBooking} />}
        {tab === 'chat'       && <ChatTab artist={artist} myProfile={myProfile} hasAccess={canAccessChat} />}
      </div>

      {/* Subscribe modal */}
      {showSubscribeModal && (
        <SubscribeModal
          artist={artist}
          tier={tier}
          myProfile={myProfile}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            getFanSubscription(myProfile.id, artist.id).then(setSubscription);
          }}
        />
      )}

      {/* Contact modal */}
      {showContactModal && (
        <ContactModal
          target={artist}
          myProfile={myProfile}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
}

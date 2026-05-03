// src/components/FeaturedCarousel.jsx
import { useRef, useState, useEffect } from 'react';

const C = {
  bg:"#140c00", bg2:"#1e1100", card:"#271500",
  border:"#3d2200", borderHov:"#6b3d00",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030", amber:"#ffb940",
  brown:"#7a4010",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", red:"#ff5040", purple:"#c060ff",
};

const BOOST = {
  pro:   { border:'#c060ff', glow:'#c060ff28', badge:'🌍 Tour Pro',          badgeColor:'#c060ff', cta:'Réserver →' },
  boost: { border:'#d95f00', glow:'#d95f0028', badge:'🚀 Event Boost',       badgeColor:'#d95f00', cta:'Voir l\'événement →' },
  local: { border:'#ffb940', glow:'#ffb94020', badge:'📍 Local Spotlight',   badgeColor:'#ffb940', cta:'Voir l\'événement →' },
};

const MOCK_EVENTS = [
  { id:'me1', title:'Soirée Jazz & Soul', date_start:'2026-06-14', venue_name:'Le Café Scène', city:'Montréal', genre:'Jazz / Soul', visual:'🎷', boost:'pro',   profile:{ name:'Marie Tremblay',           avatar:'🎷', type:'artist', region:'Montréal' }},
  { id:'me2', title:'Festival Flamenco',  date_start:'2026-07-03', venue_name:'Théâtre du Soleil', city:'Paris', genre:'Flamenco', visual:'💃', boost:'boost', profile:{ name:'Salle du Soleil',            avatar:'🏛️', type:'venue',  region:'Paris' }},
  { id:'me3', title:'Nuit Électronique',  date_start:'2026-05-31', venue_name:'Club Nuit',     city:'Lyon',     genre:'Electronic',visual:'🎧', boost:'pro',   profile:{ name:'Synth Studio',              avatar:'🎹', type:'artist', region:'Lyon' }},
  { id:'me4', title:'Classique en Plein Air', date_start:'2026-08-10', venue_name:'Parc du Château', city:'Bordeaux', genre:'Classique', visual:'🎻', boost:'boost', profile:{ name:'Orchestre de Bordeaux', avatar:'🎼', type:'venue', region:'Bordeaux' }},
  { id:'me5', title:'Blues Session',      date_start:'2026-06-28', venue_name:'Le Vieux Comptoir', city:'Metz', genre:'Blues',    visual:'🎸', boost:'local',  profile:{ name:'Jean-Pierre Rousseau',      avatar:'🎸', type:'artist', region:'Metz' }},
  { id:'me6', title:'Hip-Hop Showcase',   date_start:'2026-05-24', venue_name:'Culture Box',   city:'Bruxelles',genre:'Hip-Hop', visual:'🎤', boost:'local',  profile:{ name:'MC Bruxellois',             avatar:'🎤', type:'artist', region:'Bruxelles' }},
];

const MOCK_PROFILES = [
  { id:'mp1', name:'Isabelle Leclair',   avatar:'🎵', type:'artist', genre:'Jazz / Soul',    region:'Montréal', bio:"Chanteuse jazz avec 10 ans d'expérience internationale.",    subscribed:true, rating:4.8 },
  { id:'mp2', name:'La Scène des Arts',  avatar:'🏛️', type:'venue',  genre:'Multi-genres',   region:'Paris',    bio:'Salle de spectacle parisienne de 500 places.',               subscribed:true, rating:4.6 },
  { id:'mp3', name:'Carlos Fernandez',   avatar:'💃', type:'artist', genre:'Flamenco',        region:'Lyon',     bio:'Danseur et guitariste flamenco, tournées Europe.',            subscribed:true, rating:4.9 },
  { id:'mp4', name:'Espace Lumière',     avatar:'✨', type:'venue',  genre:'Variété',          region:'Strasbourg',bio:'Salle modulable de 800 places en cœur de ville.',          subscribed:true, rating:4.5 },
];

function typeColor(type) {
  return type === 'artist' ? C.orange : type === 'venue' ? C.brown : C.muted;
}
function typeLabel(type) {
  return type === 'venue' ? '🏛️ Lieu' : type === 'fan' ? '💛 Fan' : '🎵 Artiste';
}

const CARD_W = 258;
const GAP    = 14;

export default function FeaturedCarousel({ profiles = [], events = [], onOpenProfile, onOpenEvent }) {
  const trackRef = useRef(null);
  const [paused,  setPaused]  = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Merge real + mock, dedup by id
  const realEvts  = events.filter(e => e.is_public !== false).slice(0, 6);
  const realProfs = profiles.filter(p => p.subscribed).slice(0, 4);
  const fillEvts  = MOCK_EVENTS.slice(0, Math.max(0, 6 - realEvts.length));
  const fillProfs = MOCK_PROFILES.slice(0, Math.max(0, 4 - realProfs.length));

  const evtCards  = [...realEvts.map(e=>({...e,_kind:'event'})),  ...fillEvts.map(e=>({...e,_kind:'event'}))];
  const profCards = [...realProfs.map(p=>({...p,_kind:'profile'})), ...fillProfs.map(p=>({...p,_kind:'profile'}))];

  const all = [
    ...evtCards.filter(e=>e.boost==='pro'),
    ...evtCards.filter(e=>e.boost==='boost'),
    ...profCards,
    ...evtCards.filter(e=>e.boost==='local'),
    ...evtCards.filter(e=>!e.boost),
  ];

  const updateNav = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
    return () => el.removeEventListener('scroll', updateNav);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: CARD_W + GAP, behavior: 'smooth' });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  const scroll = dir => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir === 'next' ? CARD_W + GAP : -(CARD_W + GAP), behavior: 'smooth' });
  };

  return (
    <div style={{ marginBottom: 28 }} className='fade-in'>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:C.cream, fontWeight:700, letterSpacing:-.3 }}>
            Événements & Artistes en vedette
          </div>
          <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>Mis en avant · Campagnes actives</div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          {[['prev','‹'], ['next','›']].map(([dir, ch]) => {
            const can = dir === 'prev' ? canPrev : canNext;
            return (
              <button key={dir} onClick={() => scroll(dir)}
                style={{ width:30, height:30, borderRadius:'50%', background:C.card, border:'1px solid '+(can?C.border:C.border+'55'), color:can?C.muted:C.dim, cursor:can?'pointer':'default', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', opacity:can?1:.35, transition:'all .15s' }}>
                {ch}
              </button>
            );
          })}
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
        style={{ display:'flex', gap:GAP, overflowX:'auto', scrollSnapType:'x mandatory', scrollBehavior:'smooth', paddingBottom:6,
          /* hide scrollbar */
          msOverflowStyle:'none', scrollbarWidth:'none' }}
      >
        <style>{`.fc-track::-webkit-scrollbar{display:none}`}</style>
        {all.map((card, i) => (
          card._kind === 'event'
            ? <EventCard key={card.id||i} event={card} onOpen={onOpenEvent} />
            : <ArtistCard key={card.id||i} profile={card} onOpen={onOpenProfile} />
        ))}
        <div style={{ flexShrink:0, width:8 }} />
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
        {[['#c060ff','Tour Pro'],['#d95f00','Event Boost'],['#ffb940','Local Spotlight'],['#3d2200','Standard']].map(([color,lbl])=>(
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:C.dim }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:color }} />
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCard({ event: ev, onOpen }) {
  const b = BOOST[ev.boost];
  const p = ev.profile || {};
  const isMock = ev.id?.startsWith('me');

  return (
    <div
      onClick={() => !isMock && onOpen && onOpen(ev)}
      style={{ width:CARD_W, flexShrink:0, scrollSnapAlign:'start', background:C.card,
        border:'1px solid '+(b ? b.border : C.border), borderRadius:14, overflow:'hidden',
        cursor:'pointer', transition:'transform .2s, box-shadow .2s',
        boxShadow: b ? '0 0 24px '+b.glow+', 0 4px 16px #00000060' : '0 4px 14px #00000040' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; }}
    >
      {/* Cover */}
      <div style={{ height:78, background:'linear-gradient(135deg,'+C.bg2+' 0%,#200a30 100%)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <span style={{ fontSize:34 }}>{ev.visual || '🎭'}</span>
        {b && (
          <div style={{ position:'absolute', top:7, left:8, background:b.border+'22', border:'1px solid '+b.border+'55', color:b.badgeColor, borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:700, letterSpacing:.5 }}>
            {b.badge}
          </div>
        )}
        {ev.boost === 'pro' && (
          <div style={{ position:'absolute', top:7, right:8, background:C.purple, color:'#fff', borderRadius:20, padding:'2px 7px', fontSize:9, fontWeight:700 }}>
            ★ HOT
          </div>
        )}
      </div>

      <div style={{ padding:12 }}>
        {/* Artist row */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
          <span style={{ fontSize:18 }}>{p.avatar || '🎵'}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
            <span style={{ fontSize:9, color:typeColor(p.type), background:typeColor(p.type)+'22', border:'1px solid '+typeColor(p.type)+'44', borderRadius:20, padding:'1px 6px' }}>
              {typeLabel(p.type)}
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700, color:C.cream, lineHeight:1.3, marginBottom:6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {ev.title}
        </div>

        <div style={{ fontSize:10, color:C.amber, marginBottom:2 }}>
          📅 {new Date(ev.date_start).toLocaleDateString('fr', { weekday:'short', day:'numeric', month:'short' })}
        </div>
        {(ev.venue_name || ev.city) && (
          <div style={{ fontSize:10, color:C.dim }}>
            📍 {[ev.venue_name, ev.city].filter(Boolean).join(' · ')}
          </div>
        )}

        <button
          style={{ marginTop:10, width:'100%', fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:11, cursor:'pointer', border:'1px solid '+(b?b.border:C.border), borderRadius:7, padding:'6px 0',
            background: ev.boost==='pro' ? 'linear-gradient(135deg,'+C.purple+',#8030cc)' : ev.boost==='boost' ? 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')' : C.bg2,
            color: (ev.boost==='pro'||ev.boost==='boost') ? '#fff' : C.muted }}>
          {b ? b.cta : 'Voir →'}
        </button>
      </div>
    </div>
  );
}

function ArtistCard({ profile: p, onOpen }) {
  const isMock = p.id?.startsWith('mp');
  return (
    <div
      onClick={() => !isMock && onOpen && onOpen(p)}
      style={{ width:CARD_W, flexShrink:0, scrollSnapAlign:'start', background:C.card,
        border:'1px solid '+C.orange+'44', borderRadius:14, overflow:'hidden',
        cursor:'pointer', transition:'transform .2s',
        boxShadow:'0 4px 14px #00000040' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=C.orange+'88'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor=C.orange+'44'; }}
    >
      {/* Cover */}
      <div style={{ height:58, background:'linear-gradient(135deg,'+C.bg2+' 0%,#2a1200 100%)', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-22, left:14, width:44, height:44, borderRadius:'50%', background:C.card, border:'2px solid '+typeColor(p.type), display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
          {p.avatar || '🎵'}
        </div>
      </div>

      <div style={{ padding:'30px 14px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700, color:C.cream }}>{p.name}</div>
            <span style={{ fontSize:9, color:typeColor(p.type), background:typeColor(p.type)+'22', border:'1px solid '+typeColor(p.type)+'44', borderRadius:20, padding:'1px 6px' }}>
              {typeLabel(p.type)}
            </span>
          </div>
          {p.rating > 0 && (
            <span style={{ fontSize:10, color:C.amber }}>{'★'.repeat(Math.round(p.rating))} {p.rating.toFixed(1)}</span>
          )}
        </div>

        {p.region && <div style={{ fontSize:10, color:C.dim, marginBottom:4 }}>📍 {p.region}</div>}
        {p.genre && (
          <div style={{ fontSize:9, background:C.orange+'18', color:C.orange, border:'1px solid '+C.orange+'33', borderRadius:20, padding:'2px 8px', display:'inline-block', marginBottom:7 }}>
            {p.genre}
          </div>
        )}
        {p.bio && (
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.4, marginBottom:9, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {p.bio}
          </div>
        )}

        <button style={{ width:'100%', background:C.bg2, border:'1px solid '+C.orange+'55', color:C.orange, borderRadius:7, padding:'6px 0', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
          Voir le profil →
        </button>
      </div>
    </div>
  );
}

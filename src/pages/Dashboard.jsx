// src/pages/Dashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../lib/store';
import {
  supabase, signOut, upsertProfile, getAllProfiles,
  getMessages, sendMessage, markMessageRead,
  getChatMessages, sendChatMessage, subscribeToChatRoom, getRoomId,
  getMyInvitations, createInvitation, respondToInvitation,
  getMyCalendar, addCalendarEntry, createCampaign,
} from '../lib/supabase';
import { runAI, buildTourPlannerSystem } from '../lib/ai';
import { startSubscription, checkSubscription, PRICES } from '../lib/stripe';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

/* ── Design Tokens ── */
const C = {
  bg:"#140c00", bg2:"#1e1100", card:"#271500", cardHov:"#301a00",
  border:"#3d2200", borderHov:"#6b3d00",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030", amber:"#ffb940",
  brown:"#7a4010", brownLt:"#a05820",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", red:"#ff5040", blue:"#40a8ff", purple:"#c060ff", tag:"#2a1600",
};

const typeColors = { artist: C.orange, venue: C.brown, fan: C.brownLt };
const typeLabels  = { artist: 'Artiste', venue: 'Lieu', fan: 'Fan' };
const nowT = () => new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

const REGION_COORDS = {
  'Montréal':{ lat:45.50, lng:-73.57 }, 'Québec':{ lat:46.82, lng:-71.22 },
  'Sherbrooke':{ lat:45.40, lng:-71.90 }, 'Toronto':{ lat:43.65, lng:-79.38 },
  'Vancouver':{ lat:49.28, lng:-123.12 }, 'Paris':{ lat:48.85, lng:2.35 },
  'Lyon':{ lat:45.75, lng:4.85 }, 'Bordeaux':{ lat:44.84, lng:-0.58 },
  'Marseille':{ lat:43.30, lng:5.37 }, 'Strasbourg':{ lat:48.57, lng:7.75 },
  'Metz':{ lat:49.12, lng:6.18 }, 'Bruxelles':{ lat:50.85, lng:4.35 },
  'Berlin':{ lat:52.52, lng:13.40 }, 'Amsterdam':{ lat:52.37, lng:4.90 },
  'Genève':{ lat:46.20, lng:6.15 }, 'Lausanne':{ lat:46.52, lng:6.63 },
};

const GENRES = ['Jazz / Soul','Rock / Indie','R&B / Neo Soul','Classique','Flamenco','Electronic / Techno','Folk / Chanson','Hip-Hop','Blues','Reggae / Dub','Musique du monde','Théâtre / Arts vivants','Danse','Variété','Multi-genres'];
const AVATARS = ['🎷','🎸','🎤','🎻','🥁','💃','🎹','🎺','🎭','🌟','🔥','🎪','🎵','🎼','🎬','🎨'];

const LEGAL_CLAUSES = [
  "L'artiste s'engage à se présenter à la date, heure et lieu convenus.",
  "Le lieu fournit les conditions techniques décrites dans le rider.",
  "Le cachet est réglé au plus tard 30 jours après la prestation.",
  "Annulation artiste <15 jours : 50% du cachet dû au lieu.",
  "Annulation lieu <15 jours : 100% du cachet dû à l'artiste.",
  "Les deux parties respectent les droits d'auteur (SACEM/SOCAN/CISAC).",
  "Les droits d'enregistrement sont négociés séparément.",
  "Toute modification doit être acceptée par écrit par les deux parties.",
];

const AD_PACKAGES = [
  { id:'local', name:'Local Spotlight', icon:'📍', price:29, color:C.amber, reach:'500–2 000 fans', features:['Bannière feed régional 7 jours','Notification push fans locaux','Badge Événement Local sur carte','Stats vues et clics'], platforms:['StageMap'], roi:'ROI estimé 3–5×' },
  { id:'boost', name:'Event Boost', icon:'🚀', price:89, color:C.orange, reach:'5 000–15 000', features:['Tout du pack Local','Meta Ads géociblés 50 km','Stories Instagram sponsorisée','Dashboard analytique'], platforms:['StageMap','Meta','Instagram'], roi:'ROI estimé 4–6×', badge:'Populaire' },
  { id:'pro', name:'Tour Pro', icon:'🌍', price:249, color:C.purple, reach:'20 000–80 000', features:['Tout du pack Boost','Google Ads CPC ~$5.26','TikTok Ads CPC $0.20','Spotify lien bio promo','Rapport par date'], platforms:['StageMap','Google','Meta','TikTok'], roi:'ROI estimé 5–8×' },
];

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

/* ── Mini components ── */
function Pill({ children, color = C.orange, sm }) {
  return <span style={{ background: color+'22', color, border:'1px solid '+color+'44', borderRadius:20, padding:sm?'1px 7px':'3px 10px', fontSize:sm?10:11, fontWeight:600, letterSpacing:.8, textTransform:'uppercase', fontFamily:"'Outfit',sans-serif", whiteSpace:'nowrap' }}>{children}</span>;
}
function Btn({ children, onClick, v='primary', sz='md', disabled, full, style:s={} }) {
  const base = { fontFamily:"'Outfit',sans-serif", fontWeight:600, cursor:disabled?'not-allowed':'pointer', border:'none', borderRadius:8, transition:'all .15s', opacity:disabled?.5:1, width:full?'100%':'auto', ...s };
  const sizes = { sm:{padding:'5px 12px',fontSize:12}, md:{padding:'9px 18px',fontSize:13}, lg:{padding:'13px 28px',fontSize:15} }[sz];
  const vars = {
    primary:   { background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color:'#fff', boxShadow:'0 4px 16px '+C.orange+'44' },
    secondary: { background:C.tag, color:C.muted, border:'1px solid '+C.border },
    ghost:     { background:'none', color:C.muted, border:'1px solid '+C.border },
    danger:    { background:C.red+'22', color:C.red, border:'1px solid '+C.red+'44' },
    success:   { background:C.green+'22', color:C.green, border:'1px solid '+C.green+'44' },
    purple:    { background:'linear-gradient(135deg,'+C.purple+',#8030cc)', color:'#fff' },
  }[v];
  return <button onClick={onClick} disabled={disabled} style={{...base,...sizes,...vars}}>{children}</button>;
}
function Inp({ value, onChange, placeholder, style:s={}, ml, rows=3 }) {
  const base = { background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', width:'100%', ...s };
  return ml ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,resize:'vertical'}}/> : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>;
}
function Sel({ value, onChange, options }) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:8, padding:'8px 12px', color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:13, outline:'none', width:'100%' }}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}
function Stars({ r }) {
  if (!r) return null;
  return <span style={{color:C.amber,fontSize:11}}>{'★'.repeat(Math.round(r))}{'☆'.repeat(5-Math.round(r))} {r.toFixed(1)}</span>;
}
function Spinner() {
  return <div style={{width:20,height:20,border:'2px solid '+C.border,borderTop:'2px solid '+C.orange,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>;
}

/* ── Profile Switcher ── */
function ProfileSwitcher({ profile, userProfiles, onSwitch, onAdd, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:6, background:C.tag, border:'1px solid '+(open?C.orange:C.border), borderRadius:20, padding:'4px 10px', cursor:'pointer', transition:'all .15s' }}>
        <span style={{ fontSize:16 }}>{profile.avatar || '🎵'}</span>
        <span style={{ fontSize:11, color:C.text, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.name}</span>
        <span style={{ fontSize:9, color:C.dim }}>▾</span>
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:C.bg2, border:'1px solid '+C.border, borderRadius:12, minWidth:210, zIndex:600, boxShadow:'0 16px 40px #00000090', overflow:'hidden' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid '+C.border, fontSize:10, color:C.dim, letterSpacing:1, textTransform:'uppercase' }}>Mes profils</div>

          {userProfiles.map(p => (
            <div key={p.id} onClick={() => { onSwitch(p.id); setOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', cursor:'pointer', background: profile.id===p.id ? C.orange+'11' : 'none', borderLeft: profile.id===p.id ? '2px solid '+C.orange : '2px solid transparent', transition:'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = profile.id===p.id ? C.orange+'11' : 'none'}>
              <span style={{ fontSize:18 }}>{p.avatar || '🎵'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight: profile.id===p.id ? 600 : 400, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize:10, color:C.muted }}>{typeLabels[p.type]} · {p.region}</div>
              </div>
              {profile.id===p.id && <span style={{ fontSize:10, color:C.orange }}>✓</span>}
            </div>
          ))}

          <div style={{ borderTop:'1px solid '+C.border }}>
            <div onClick={() => { onAdd(); setOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', cursor:'pointer', color:C.orangeLt, fontSize:12 }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ＋ Ajouter un profil
            </div>
            <div onClick={() => { onLogout(); setOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', cursor:'pointer', color:C.red, fontSize:12 }}
              onMouseEnter={e => e.currentTarget.style.background = C.card}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ↩ Déconnexion
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Map View (Mapbox) ── */
function MapView({ artists, myProfile, onOpen }) {
  const [popup, setPopup] = useState(null);
  const [hov, setHov] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const withCoords = artists.filter(a => a.lat && a.lng);
  const centerLng = withCoords.length ? withCoords.reduce((s,a)=>s+a.lng,0)/withCoords.length : -45;
  const centerLat = withCoords.length ? withCoords.reduce((s,a)=>s+a.lat,0)/withCoords.length : 47;
  const [viewport, setViewport] = useState({ longitude: centerLng, latitude: centerLat, zoom: 3.2 });

  const tokenOk = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'pk.eyJ1IjoieW91...' && MAPBOX_TOKEN.startsWith('pk.');
  if (!tokenOk || mapError) return <MapViewFallback artists={artists} myProfile={myProfile} onOpen={onOpen} />;

  return (
    <div>
      <div style={{ position:'relative', height:480, borderRadius:16, border:'1px solid '+C.border, overflow:'hidden', boxShadow:'0 8px 40px #00000060' }}>
        {!mapLoaded && (
          <div style={{ position:'absolute', inset:0, zIndex:10, background:'linear-gradient(135deg,#0a160a,#0a1220,#160a0a)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <Spinner /><span style={{ color:C.muted, fontSize:13 }}>Chargement de la carte…</span>
          </div>
        )}
        <Map {...viewport} onMove={e=>setViewport(e.viewState)} mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/dark-v11" style={{ width:'100%', height:'100%' }} onLoad={()=>setMapLoaded(true)} onError={()=>setMapError(true)} attributionControl={false}>
          <NavigationControl position="top-right" style={{ marginTop:8, marginRight:8 }} />
          {withCoords.map(a => {
            const isMe = myProfile && a.id === myProfile.id;
            const isH = hov === a.id;
            const size = isH ? 46 : isMe ? 40 : 34;
            return (
              <Marker key={a.id} longitude={a.lng} latitude={a.lat} anchor="center" onClick={e=>{ e.originalEvent.stopPropagation(); setPopup(a); }}>
                <div onMouseEnter={()=>setHov(a.id)} onMouseLeave={()=>setHov(null)} style={{ position:'relative', cursor:'pointer', transition:'all .2s', zIndex:isH?20:isMe?15:10 }}>
                  <div style={{ position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)', width:6, height:6, borderRadius:'50%', background:typeColors[a.type], boxShadow:'0 0 6px '+typeColors[a.type] }} />
                  <div style={{ width:size, height:size, borderRadius:'50%', background:C.card, border:isMe?'3px solid '+C.glow:'2px solid '+typeColors[a.type], display:'flex', alignItems:'center', justifyContent:'center', fontSize:isH?22:isMe?18:15, boxShadow:isH?'0 0 20px '+typeColors[a.type]+', 0 4px 12px #00000080':isMe?'0 0 14px '+C.glow+', 0 4px 12px #00000080':'0 2px 8px #00000060', transition:'all .2s' }}>
                    {a.avatar || '🎵'}
                  </div>
                  {isMe && !isH && <div style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:'50%', background:C.glow, border:'2px solid '+C.bg, animation:'pulse 2s infinite' }} />}
                  {isH && !popup && (
                    <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', background:C.card, border:'1px solid '+(isMe?C.glow:C.border), borderRadius:8, padding:'5px 9px', whiteSpace:'nowrap', color:C.text, fontSize:12, pointerEvents:'none', zIndex:30, boxShadow:'0 4px 16px #00000080' }}>
                      {isMe && <span style={{ color:C.glow, fontSize:10 }}>✦ Vous · </span>}
                      <strong>{a.name}</strong>
                      <div style={{ color:C.muted, fontSize:10 }}>{a.region}</div>
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}
          {popup && (
            <Popup longitude={popup.lng} latitude={popup.lat} anchor="bottom" offset={28} onClose={()=>setPopup(null)} closeButton={false} style={{ zIndex:50 }}>
              <div style={{ background:C.bg2, border:'1px solid '+(myProfile&&popup.id===myProfile.id?C.glow:C.border), borderRadius:10, padding:'10px 13px', minWidth:180, fontFamily:"'Outfit',sans-serif", color:C.text }}>
                {myProfile && popup.id === myProfile.id && <div style={{ color:C.glow, fontSize:10, marginBottom:4 }}>✦ Votre profil actif</div>}
                <div style={{ display:'flex', gap:9, alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:26 }}>{popup.avatar || '🎵'}</span>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700 }}>{popup.name}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{popup.genre}</div>
                    <div style={{ color:C.dim, fontSize:10 }}>📍 {popup.region}, {popup.country}</div>
                  </div>
                </div>
                {popup.available && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:C.green, marginBottom:7 }}><span style={{ width:5, height:5, borderRadius:'50%', background:C.green, display:'inline-block' }} />Disponible pour booking</div>}
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{ onOpen(popup); setPopup(null); }} style={{ flex:1, background:'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:600, padding:'5px 0', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>Voir profil</button>
                  <button onClick={()=>setPopup(null)} style={{ background:C.tag, border:'1px solid '+C.border, borderRadius:6, color:C.muted, fontSize:11, padding:'5px 8px', cursor:'pointer' }}>✕</button>
                </div>
              </div>
            </Popup>
          )}
        </Map>
        <div style={{ position:'absolute', bottom:12, left:12, background:C.card+'ee', border:'1px solid '+C.border, borderRadius:20, padding:'4px 11px', fontSize:11, color:C.muted, backdropFilter:'blur(8px)', pointerEvents:'none' }}>
          {withCoords.length} profils sur la carte
        </div>
      </div>
      <div style={{ display:'flex', gap:14, marginTop:8, justifyContent:'center' }}>
        {Object.entries(typeColors).map(([t,c]) => (
          <span key={t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }} />{typeLabels[t]}
          </span>
        ))}
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:C.glow, display:'inline-block' }} />Vous
        </span>
      </div>
    </div>
  );
}

/* ── Map View Fallback ── */
function MapViewFallback({ artists, myProfile, onOpen }) {
  const [hov, setHov] = useState(null);
  return (
    <div>
      <div style={{position:'relative',height:460,background:'linear-gradient(135deg,#0a160a,#0a1220,#160a0a)',borderRadius:16,border:'1px solid '+C.border,overflow:'hidden'}}>
        {[...Array(10)].map((_,i)=><div key={i} style={{position:'absolute',left:(i*10)+'%',top:0,bottom:0,borderLeft:'1px solid '+C.border+'18'}}/>)}
        {[...Array(8)].map((_,i)=><div key={i} style={{position:'absolute',top:(i*12.5)+'%',left:0,right:0,borderTop:'1px solid '+C.border+'18'}}/>)}
        {[{l:'Québec',x:'17%',y:'11%'},{l:'France',x:'46%',y:'23%'},{l:'Belgique',x:'52%',y:'17%'},{l:'Allemagne',x:'60%',y:'13%'}].map(r=>(
          <div key={r.l} style={{position:'absolute',left:r.x,top:r.y,color:C.dim,fontSize:10,letterSpacing:2,textTransform:'uppercase',pointerEvents:'none'}}>{r.l}</div>
        ))}
        {artists.filter(a=>a.lat&&a.lng).map(a=>{
          const x=(a.lng+80)/200*100, y=(60-a.lat)/60*100, isH=hov===a.id, isMe=myProfile&&a.id===myProfile.id;
          return (
            <div key={a.id} onClick={()=>onOpen(a)} onMouseEnter={()=>setHov(a.id)} onMouseLeave={()=>setHov(null)}
              style={{position:'absolute',left:x+'%',top:y+'%',transform:'translate(-50%,-50%)',cursor:'pointer',zIndex:isH?20:isMe?15:10,transition:'all .2s'}}>
              <div style={{width:isH?44:isMe?38:32,height:isH?44:isMe?38:32,borderRadius:'50%',background:typeColors[a.type],border:isMe?'3px solid '+C.glow:'3px solid '+(isH?C.cream:C.bg),display:'flex',alignItems:'center',justifyContent:'center',fontSize:isH?20:isMe?17:13,boxShadow:isH?'0 0 24px '+typeColors[a.type]:isMe?'0 0 16px '+C.glow:'none',transition:'all .2s'}}>
                {a.avatar||'🎵'}
              </div>
              {isMe&&!isH&&<div style={{position:'absolute',top:-6,right:-4,width:10,height:10,borderRadius:'50%',background:C.glow,border:'2px solid '+C.bg}}/>}
              {isH&&<div style={{position:'absolute',bottom:'110%',left:'50%',transform:'translateX(-50%)',background:C.card,border:'1px solid '+(isMe?C.glow:C.border),borderRadius:8,padding:'6px 10px',whiteSpace:'nowrap',color:C.text,fontSize:12,pointerEvents:'none',zIndex:30}}>
                {isMe&&<span style={{color:C.glow,fontSize:10}}>✦ Vous · </span>}{a.name}
                <div style={{color:C.muted,fontSize:10}}>{a.region}</div>
              </div>}
            </div>
          );
        })}
      </div>
      <div style={{display:'flex',gap:14,marginTop:8,justifyContent:'center'}}>
        {Object.entries(typeColors).map(([t,c])=><span key={t} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:C.muted}}><span style={{width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{typeLabels[t]}</span>)}
        <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:C.muted}}><span style={{width:8,height:8,borderRadius:'50%',background:C.glow,display:'inline-block'}}/>Vous</span>
      </div>
    </div>
  );
}

/* ── Profile Modal ── */
function ProfileModal({ a, myId, onClose, onChat, onInvite }) {
  const isMe = a.id === myId;
  return (
    <div style={{position:'fixed',inset:0,background:'#00000085',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg2,border:'1px solid '+(isMe?C.glow:C.border),borderRadius:16,padding:26,maxWidth:420,width:'100%',color:C.text,fontFamily:"'Outfit',sans-serif",boxShadow:'0 40px 100px #00000080'}}>
        {isMe&&<div style={{background:C.glow+'22',border:'1px solid '+C.glow+'44',borderRadius:8,padding:'5px 12px',fontSize:11,color:C.glow,marginBottom:14}}>✦ Votre profil actif</div>}
        <div style={{display:'flex',gap:14,marginBottom:14}}>
          <div style={{fontSize:38,width:58,height:58,background:C.tag,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid '+typeColors[a.type]}}>{a.avatar||'🎵'}</div>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:700}}>{a.name}</div>
            <div style={{color:C.muted,fontSize:12,margin:'2px 0'}}>{a.genre} · {a.region}, {a.country}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              <Pill color={typeColors[a.type]}>{typeLabels[a.type]}</Pill>
              {a.available&&<span style={{color:C.green,fontSize:10,display:'flex',alignItems:'center',gap:3}}><span style={{width:5,height:5,borderRadius:'50%',background:C.green,display:'inline-block'}}/>Disponible</span>}
              {a.verified&&<span style={{color:C.blue,fontSize:10}}>✓ Vérifié</span>}
            </div>
          </div>
        </div>
        {a.bio&&<p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:10}}>{a.bio}</p>}
        {a.fee&&<div style={{color:C.amber,fontSize:12,marginBottom:8}}>💰 {a.fee}</div>}
        {a.rating>0&&<div style={{marginBottom:10}}><Stars r={a.rating}/> <span style={{color:C.dim,fontSize:11}}>({a.rating_count} avis)</span></div>}
        {a.links&&a.links.length>0&&<div style={{marginBottom:14}}>{a.links.map((l,i)=><a key={i} href={'https://'+l} target='_blank' rel='noreferrer' style={{display:'inline-block',marginRight:4,marginBottom:4,background:C.tag,border:'1px solid '+C.border,color:C.orangeLt,borderRadius:5,padding:'2px 7px',fontSize:11,textDecoration:'none'}}>🔗 {l}</a>)}</div>}
        {!isMe&&<div style={{display:'flex',gap:8}}>
          <Btn onClick={()=>{onChat(a);onClose();}}>💬 Contacter</Btn>
          <Btn v="secondary" onClick={()=>{onInvite(a);onClose();}}>🗺️ Inviter tournée</Btn>
          <Btn v="ghost" onClick={onClose}>✕</Btn>
        </div>}
        {isMe&&<Btn v="ghost" onClick={onClose} full>Fermer</Btn>}
      </div>
    </div>
  );
}

/* ── Real-time Chat Panel ── */
function ChatPanel({ myProfile, partner, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef();
  const roomId = getRoomId(myProfile.id, partner.id);

  useEffect(() => {
    getChatMessages(roomId).then(data => { setMsgs(data); setLoading(false); });
    const sub = subscribeToChatRoom(roomId, payload => { setMsgs(m => [...m, payload.new]); });
    return () => supabase.removeChannel(sub);
  }, [roomId]);

  useEffect(() => { endRef.current&&endRef.current.scrollIntoView({behavior:'smooth'}); }, [msgs]);

  const send = async () => {
    if (!inp.trim()) return;
    const txt = inp; setInp('');
    await sendChatMessage(roomId, myProfile.id, txt);
  };

  return (
    <div style={{position:'fixed',right:24,bottom:24,width:330,height:440,background:C.bg2,border:'1px solid '+C.border,borderRadius:16,zIndex:900,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px #00000090'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',gap:8,background:C.card}}>
        <span style={{fontSize:22}}>{partner.avatar||'🎵'}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:13}}>{partner.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:5,height:5,borderRadius:'50%',background:C.green}}/><span style={{fontSize:10,color:C.green}}>En ligne</span></div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:15}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:11,display:'flex',flexDirection:'column',gap:7}}>
        {loading&&<div style={{textAlign:'center',paddingTop:30}}><Spinner/></div>}
        {msgs.map(m=>{
          const isMe = m.sender_id===myProfile.id;
          return <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start'}}>
            <div style={{background:isMe?C.orange:C.tag,color:isMe?'#fff':C.text,borderRadius:isMe?'11px 11px 2px 11px':'11px 11px 11px 2px',padding:'7px 10px',maxWidth:'80%',fontSize:12,lineHeight:1.5}}>
              {m.body}<div style={{fontSize:9,color:isMe?'#ffffff55':C.dim,marginTop:2,textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>;
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:8,borderTop:'1px solid '+C.border,display:'flex',gap:6}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder='Message...' style={{flex:1,background:C.tag,border:'1px solid '+C.border,borderRadius:7,padding:'6px 9px',color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:12,outline:'none'}}/>
        <button onClick={send} style={{background:C.orange,border:'none',borderRadius:7,color:'#fff',padding:'6px 11px',cursor:'pointer',fontSize:13}}>➤</button>
      </div>
    </div>
  );
}

/* ── AI Tour Planner ── */
function AIPanel({ profiles, myProfile, onLaunchTour }) {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tourPlan, setTourPlan] = useState(null);
  const [err, setErr] = useState('');

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true); setErr(''); setResult(null); setTourPlan(null);
    try {
      const system = buildTourPlannerSystem(profiles);
      const p = await runAI(system, query);
      if (p.mode==='tour') setTourPlan(p); else setResult(p);
    } catch(e) { setErr('Erreur IA : '+e.message); }
    setLoading(false);
  };

  const matched = result ? profiles.filter(p=>result.results&&result.results.includes(p.id)) : [];
  const SUGGESTIONS = {
    search: ['Jazz Montréal disponible','Salles France 200 places','Artistes électro Berlin','Flamenco budget 1000€'],
    tour:   ['Tournée jazz Canada→France 3 semaines','Circuit Europe flamenco 10 dates','Mini-tournée Québec 5 dates juin','Festival Belgique-France août'],
  };

  return (
    <div className='fade-in'>
      <div style={{marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:28}}>🤖</span>
        <div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:C.cream,fontWeight:700}}>Recherche et Planification IA</h2>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>Décrivez en langage naturel — l'IA cherche parmi les {profiles.length} vrais profils</p>
        </div>
      </div>
      <div style={{display:'flex',gap:7,marginBottom:10}}>
        {[{k:'search',l:'🔍 Recherche'},{k:'tour',l:'🗺️ Tournée IA'}].map(m=>(
          <button key={m.k} onClick={()=>setMode(m.k)} style={{background:mode===m.k?C.orange+'22':C.tag,color:mode===m.k?C.orange:C.muted,border:'1px solid '+(mode===m.k?C.orange:C.border),borderRadius:20,padding:'5px 14px',cursor:'pointer',fontSize:12,fontFamily:"'Outfit',sans-serif",fontWeight:mode===m.k?600:400}}>{m.l}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:9}}>
        {SUGGESTIONS[mode].map(s=><button key={s} onClick={()=>setQuery(s)} style={{background:C.tag,border:'1px solid '+C.border,color:C.muted,borderRadius:20,padding:'3px 9px',fontSize:11,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>{s}</button>)}
      </div>
      <div style={{display:'flex',gap:9,marginBottom:14}}>
        <Inp value={query} onChange={setQuery} placeholder={mode==='search'?'Ex: saxophoniste jazz Québec budget 500$...':'Ex: tournée Montréal→Paris→Bruxelles 3 semaines...'} style={{flex:1}}/>
        <Btn onClick={run} disabled={loading||!query.trim()}>{loading?<Spinner/>:'✦ Générer'}</Btn>
      </div>
      {err&&<div style={{color:C.red,fontSize:13,padding:'8px 12px',background:C.red+'11',border:'1px solid '+C.red+'33',borderRadius:8,marginBottom:12}}>{err}</div>}
      {result&&<div className='fade-in'>
        <div style={{background:C.orange+'11',border:'1px solid '+C.orange+'33',borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{color:C.orangeLt,fontWeight:600,marginBottom:3}}>✦ {result.summary}</div>
          {result.tip&&<div style={{color:C.muted,fontSize:12}}>💡 {result.tip}</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:12}}>
          {matched.map(a=><ProfileCard key={a.id} a={a} myId={myProfile.id} compact/>)}
          {matched.length===0&&<div style={{color:C.dim,fontSize:13,gridColumn:'1/-1',textAlign:'center',padding:'20px 0'}}>Aucun profil correspondant.</div>}
        </div>
      </div>}
      {tourPlan&&<TourPlanCard plan={tourPlan} profiles={profiles} onLaunch={()=>onLaunchTour(tourPlan)}/>}
    </div>
  );
}

/* ── Tour Plan Card ── */
function TourPlanCard({ plan, profiles, onLaunch }) {
  const [exp, setExp] = useState(true);
  const getP = id => profiles.find(p=>p.id===id);
  return (
    <div className='fade-in' style={{background:C.card,border:'1px solid '+C.border,borderRadius:14,overflow:'hidden',marginTop:12}}>
      <div style={{background:'linear-gradient(135deg,'+C.bg2+',#2d1600)',padding:'12px 18px',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:20}}>🗺️</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:C.cream}}>{plan.title}</div>
          <div style={{color:C.muted,fontSize:11,marginTop:1}}>{plan.stops&&plan.stops.length} étapes · {plan.totalDays} jours{plan.estimatedBudget&&' · '+plan.estimatedBudget}</div>
        </div>
        <button onClick={()=>setExp(e=>!e)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:14}}>{exp?'▲':'▼'}</button>
      </div>
      {exp&&<div style={{padding:'14px 18px'}}>
        <div style={{color:C.muted,fontSize:13,marginBottom:12,lineHeight:1.6}}>{plan.summary}</div>
        <div style={{position:'relative',paddingLeft:20,marginBottom:14}}>
          <div style={{position:'absolute',left:6,top:0,bottom:0,width:2,background:'linear-gradient('+C.orange+','+C.brown+')'}}/>
          {plan.stops&&plan.stops.map((s,i)=>{
            const p=getP(s.profileId);
            return <div key={i} style={{position:'relative',marginBottom:10,paddingLeft:10}}>
              <div style={{position:'absolute',left:-18,top:4,width:8,height:8,borderRadius:'50%',background:i===0?C.glow:C.orange}}/>
              <div style={{background:C.tag,border:'1px solid '+C.border,borderRadius:8,padding:'8px 11px'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:2}}>
                  <span style={{fontSize:14}}>{p?p.avatar:'📍'}</span>
                  <span style={{fontWeight:600,fontSize:12,color:C.text}}>{p?p.name:'Étape '+(i+1)}</span>
                  <Pill color={s.role==='headliner'?C.glow:C.brown} sm>{s.role}</Pill>
                  <span style={{marginLeft:'auto',color:C.orange,fontSize:11}}>{s.date}</span>
                </div>
                <div style={{color:C.muted,fontSize:11}}>📍 {s.city}{s.note?' — '+s.note:''}</div>
              </div>
            </div>;
          })}
        </div>
        {plan.legalNote&&<div style={{background:C.amber+'11',border:'1px solid '+C.amber+'33',borderRadius:8,padding:9,marginBottom:12,fontSize:12,color:C.amber}}>⚖️ {plan.legalNote}</div>}
        <Btn onClick={onLaunch}>🚀 Envoyer les invitations</Btn>
      </div>}
    </div>
  );
}

/* ── Profile Card ── */
function ProfileCard({ a, myId, compact, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onOpen&&onOpen(a)}
      style={{background:hov?C.cardHov:C.card,border:'1px solid '+(hov?C.borderHov:C.border),borderRadius:12,padding:compact?14:20,cursor:onOpen?'pointer':'default',transition:'all .2s',transform:hov&&onOpen?'translateY(-2px)':'none'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <div style={{fontSize:compact?28:36,width:compact?44:56,height:compact?44:56,background:C.tag,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid '+typeColors[a.type]+'44',flexShrink:0}}>{a.avatar||'🎵'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:compact?15:17,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:3}}>
            <Pill color={typeColors[a.type]} sm>{typeLabels[a.type]}</Pill>
            {a.available&&<span style={{color:C.green,fontSize:10,display:'flex',alignItems:'center',gap:3}}><span style={{width:5,height:5,borderRadius:'50%',background:C.green,display:'inline-block'}}/>Dispo</span>}
            {myId&&a.id===myId&&<span style={{color:C.glow,fontSize:10}}>✦ Vous</span>}
          </div>
        </div>
      </div>
      <div style={{color:C.muted,fontSize:11,marginBottom:4}}>📍 {a.region}, {a.country} · 🎼 {a.genre}</div>
      {!compact&&a.bio&&<div style={{color:C.dim,fontSize:12,lineHeight:1.5,marginBottom:6}}>{a.bio}</div>}
      {a.fee&&<div style={{color:C.amber,fontSize:11,marginTop:4}}>💰 {a.fee}</div>}
    </div>
  );
}

/* ── Invitation Modal ── */
function InviteModal({ organizer, invitee, profiles, onClose, onSent }) {
  const [form, setForm] = useState({ tour_title:'', city:invitee.region||'', date:'', role:'headliner', note:'', cal_visibility:'private' });
  const [legalOk, setLegalOk] = useState(false);
  const [sig, setSig] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const send = async () => {
    setLoading(true);
    try {
      const inv = await createInvitation({ tour_title:form.tour_title||'Invitation', organizer_id:organizer.id, invitee_id:invitee.id, city:form.city, date:form.date||null, role:form.role, note:form.note, status:'pending', legal_accepted_by_organizer:true, organizer_signature:sig, cal_visibility:form.cal_visibility });
      await sendMessage(organizer.id, invitee.id, 'Invitation de tournée : '+form.tour_title, form.note||'Vous avez reçu une invitation de tournée.', true, inv.id);
      toast.success('Invitation envoyée à '+invitee.name+' !');
      onSent();
    } catch(e) { toast.error('Erreur: '+e.message); }
    setLoading(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'#00000090',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,maxWidth:520,width:'100%',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 40px 100px #00000090'}}>
        <div style={{padding:'15px 22px',borderBottom:'1px solid '+C.border,background:C.card,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>🗺️</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:C.cream}}>Inviter à une tournée</div>
            <div style={{color:C.muted,fontSize:11}}>{invitee.avatar} {invitee.name}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 22px'}}>
          {step===0&&<div style={{display:'flex',flexDirection:'column',gap:13}}>
            {[{l:'Titre de la tournée',k:'tour_title',p:'Ex: Tournée Jazz Automne 2026'},{l:'Ville / Date',k:'city',p:'Montréal, Paris...'},{l:'Message personnel',k:'note',p:'Détails, attentes, conditions...'}].map(f=>(
              <div key={f.k}>
                <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>{f.l}</div>
                <Inp value={form[f.k]} onChange={v=>set(f.k,v)} placeholder={f.p} ml={f.k==='note'} rows={2}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Date proposée</div>
              <input type='date' value={form.date} onChange={e=>set('date',e.target.value)} style={{background:C.tag,border:'1px solid '+C.border,borderRadius:8,padding:'8px 12px',color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:13,outline:'none',width:'100%'}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Rôle</div>
              <Sel value={form.role} onChange={v=>set('role',v)} options={['headliner','support','venue','special']}/>
            </div>
            <Btn onClick={()=>setStep(1)}>Continuer → Accord légal</Btn>
          </div>}
          {step===1&&<div>
            <div style={{background:C.tag,border:'1px solid '+C.border,borderRadius:8,padding:12,marginBottom:12}}>
              <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:C.orange,marginBottom:8,fontWeight:600}}>Contrat simplifié StageMap</div>
              {LEGAL_CLAUSES.map((c,i)=><div key={i} style={{display:'flex',gap:7,marginBottom:6,fontSize:11,color:C.muted,lineHeight:1.5}}><span style={{color:C.orange,fontWeight:700,flexShrink:0}}>{i+1}.</span><span>{c}</span></div>)}
            </div>
            <div style={{background:C.amber+'11',border:'1px solid '+C.amber+'33',borderRadius:6,padding:8,fontSize:11,color:C.amber,marginBottom:12}}>⚖️ Accord de principe. Un contrat complet peut être demandé avant confirmation finale.</div>
            <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,cursor:'pointer'}}>
              <input type='checkbox' checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{accentColor:C.orange,width:14,height:14}}/>
              <span style={{fontSize:12,color:C.text}}>J'accepte les conditions en tant qu'organisateur</span>
            </label>
            <Inp value={sig} onChange={setSig} placeholder='Votre nom complet (signature électronique)...' style={{marginBottom:14}}/>
            <div style={{display:'flex',gap:9}}>
              <Btn v='ghost' onClick={()=>setStep(0)}>← Retour</Btn>
              <Btn onClick={send} disabled={!legalOk||!sig.trim()||loading}>{loading?<Spinner/>:"🚀 Envoyer l'invitation"}</Btn>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ── Inbox ── */
function InboxView({ messages, myId, profiles, onChat, onRefresh }) {
  const [sel, setSel] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [invLoading, setInvLoading] = useState({});

  useEffect(() => { getMyInvitations(myId).then(data=>setInvitations(data||[])); }, [myId]);

  const respond = async (invId, status) => {
    setInvLoading(l=>({...l,[invId]:true}));
    try {
      await respondToInvitation(invId, status);
      setInvitations(prev=>prev.map(i=>i.id===invId?{...i,status}:i));
      toast.success(status==='accepted'?'Invitation acceptée ✓':'Invitation déclinée');
    } catch(e) { toast.error(e.message); }
    setInvLoading(l=>({...l,[invId]:false}));
  };

  const getProfile = (id) => profiles.find(p=>p.id===id)||{name:'Utilisateur',avatar:'👤'};
  const pendingInvites = invitations.filter(i=>i.invitee_id===myId&&i.status==='pending');

  return (
    <div className='fade-in' style={{display:'grid',gridTemplateColumns:'270px 1fr',gap:14,minHeight:400}}>
      <div>
        {pendingInvites.length>0&&(
          <div style={{background:C.orange+'11',border:'1px solid '+C.orange+'33',borderRadius:9,padding:10,marginBottom:10}}>
            <div style={{fontSize:11,color:C.orange,fontWeight:600,marginBottom:6}}>🗺️ {pendingInvites.length} invitation(s) en attente</div>
            {pendingInvites.map(inv=>{
              const org=getProfile(inv.organizer_id);
              return <div key={inv.id} style={{background:C.card,border:'1px solid '+C.border,borderRadius:8,padding:10,marginBottom:6}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:3}}>{org.avatar} {org.name}</div>
                <div style={{color:C.muted,fontSize:11,marginBottom:6}}>📍 {inv.city} · {inv.role} · {inv.date}</div>
                <div style={{display:'flex',gap:6}}>
                  <Btn v='success' sz='sm' disabled={invLoading[inv.id]} onClick={()=>respond(inv.id,'accepted')}>✓ Accepter</Btn>
                  <Btn v='danger' sz='sm' disabled={invLoading[inv.id]} onClick={()=>respond(inv.id,'declined')}>✕ Décliner</Btn>
                  <Btn v='ghost' sz='sm' onClick={()=>onChat(getProfile(inv.organizer_id))}>💬</Btn>
                </div>
              </div>;
            })}
          </div>
        )}
        {messages.map(m=>{
          const other=getProfile(m.from_id===myId?m.to_id:m.from_id);
          return <div key={m.id} onClick={()=>{setSel(m);if(!m.read&&m.to_id===myId)markMessageRead(m.id);}}
            style={{background:sel?.id===m.id?C.cardHov:C.card,border:'1px solid '+(sel?.id===m.id?C.borderHov:C.border),borderLeft:'3px solid '+(m.read?C.border:C.orange),borderRadius:9,padding:11,marginBottom:6,cursor:'pointer',transition:'all .15s'}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:18}}>{other.avatar||'👤'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:1}}>
                  <span style={{fontWeight:m.read?400:700,fontSize:12}}>{other.name}</span>
                  <span style={{fontSize:10,color:C.dim}}>{new Date(m.created_at).toLocaleDateString('fr')}</span>
                </div>
                <div style={{fontSize:11,color:m.read?C.dim:C.muted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.subject}</div>
              </div>
            </div>
          </div>;
        })}
        {messages.length===0&&pendingInvites.length===0&&<div style={{color:C.dim,fontSize:13,textAlign:'center',padding:'24px 0'}}>Aucun message</div>}
      </div>
      <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:11,padding:20}}>
        {!sel?<div style={{color:C.dim,textAlign:'center',paddingTop:50,fontSize:13}}>Sélectionnez un message</div>:(
          <div>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,paddingBottom:12,borderBottom:'1px solid '+C.border}}>
              <span style={{fontSize:26}}>{getProfile(sel.from_id===myId?sel.to_id:sel.from_id).avatar||'👤'}</span>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700}}>{sel.subject}</div>
                <div style={{color:C.muted,fontSize:11}}>De : {getProfile(sel.from_id).name} · {new Date(sel.created_at).toLocaleDateString('fr')}</div>
              </div>
            </div>
            <div style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:14}}>{sel.body}</div>
            <Btn v='secondary' sz='sm' onClick={()=>onChat(getProfile(sel.from_id===myId?sel.to_id:sel.from_id))}>💬 Répondre par chat</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Calendar View ── */


/* ── Promo Module ── */
function PromoModule({ myProfile, isSubscribed }) {
  const [pkg, setPkg] = useState(null);
  const [step, setStep] = useState('list');
  const [ev, setEv] = useState({ title:'', date:'', venue:'', city:'', genre:'', desc:'', visual:'🎷', budget:89 });
  const [pl, setPl] = useState({ stagemap:true, meta:false, google:false, tiktok:false, spotify:false });
  const totalBudget = Object.entries(pl).filter(([k,v])=>v&&k!=='stagemap').length*30+ev.budget;

  const launch = async () => {
    try { await startSubscription(pkg.id, myProfile.id); }
    catch(e) { toast.error('Erreur paiement: '+e.message); }
  };

  return (
    <div className='fade-in'>
      <div style={{marginBottom:18,display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:28}}>📣</span>
        <div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:C.cream,fontWeight:700}}>Promotion et Publicité</h2>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>Diffusez vos événements sur StageMap + plateformes externes</p>
        </div>
      </div>
      {step==='list'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14}}>
        {AD_PACKAGES.map(p=>(
          <div key={p.id} onClick={()=>{setPkg(p);setStep('builder');}} style={{background:C.card,border:'2px solid '+C.border,borderRadius:14,padding:20,cursor:'pointer',transition:'all .2s',position:'relative'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color;e.currentTarget.style.transform='translateY(-3px)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none';}}>
            {p.badge&&<div style={{position:'absolute',top:-10,right:14,background:C.orange,color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:10,fontWeight:700}}>★ {p.badge}</div>}
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:26}}>{p.icon}</span>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:C.cream}}>{p.name}</div>
                <Pill color={p.color} sm>{p.reach}</Pill>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:p.color}}>{p.price}$</span>
              <span style={{color:C.muted,fontSize:11,marginLeft:4}}>CA/événement</span>
            </div>
            <div style={{marginBottom:10}}>{p.features.map((f,i)=><div key={i} style={{display:'flex',gap:6,marginBottom:3,fontSize:11,color:C.text}}><span style={{color:p.color}}>✓</span>{f}</div>)}</div>
            <div style={{background:C.tag,borderRadius:6,padding:'5px 9px',fontSize:11,color:C.muted}}>{p.roi}</div>
          </div>
        ))}
      </div>}
      {step==='builder'&&<div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button onClick={()=>setStep('list')} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:18}}>←</button>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:C.cream,fontWeight:700}}>Configurer — {pkg&&pkg.name}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[{l:'Titre',k:'title',p:'Ex: Soirée Jazz'},{l:'Date',k:'date',p:'2026-06-15'},{l:'Lieu',k:'venue',p:'Le Café Scène'},{l:'Ville',k:'city',p:'Montréal, QC'},{l:'Genre',k:'genre',p:'Jazz...'}].map(f=>(
              <div key={f.k}>
                <div style={{fontSize:10,color:C.dim,marginBottom:3,textTransform:'uppercase',letterSpacing:1}}>{f.l}</div>
                <Inp value={ev[f.k]} onChange={v=>setEv(d=>({...d,[f.k]:v}))} placeholder={f.p}/>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:C.dim,marginBottom:10,fontWeight:600}}>Plateformes</div>
            {[{k:'stagemap',l:'StageMap',c:C.orange},{k:'meta',l:'Meta/Instagram',c:'#1877f2'},{k:'google',l:'Google Ads',c:'#34a853'},{k:'tiktok',l:'TikTok',c:'#ff0050'},{k:'spotify',l:'Spotify',c:'#1db954'}].map(p=>(
              <div key={p.k} onClick={()=>setPl(prev=>({...prev,[p.k]:!prev[p.k]}))} style={{background:pl[p.k]?p.c+'11':C.tag,border:'1px solid '+(pl[p.k]?p.c:C.border),borderRadius:8,padding:'8px 12px',marginBottom:7,cursor:'pointer',display:'flex',alignItems:'center',gap:9}}>
                <div style={{flex:1,fontSize:12,color:pl[p.k]?C.text:C.muted,fontWeight:pl[p.k]?600:400}}>{p.l}</div>
                <div style={{width:16,height:16,borderRadius:4,background:pl[p.k]?p.c:C.bg,border:'2px solid '+(pl[p.k]?p.c:C.border),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>{pl[p.k]?'✓':''}</div>
              </div>
            ))}
            <div style={{marginTop:14,background:C.card,border:'1px solid '+C.border,borderRadius:10,padding:14}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:(pkg&&pkg.color)||C.orange,fontWeight:700,marginBottom:4}}>{totalBudget}$ CA</div>
              <div style={{fontSize:11,color:C.muted}}>ROI estimé : {(totalBudget*4).toLocaleString()}$ – {(totalBudget*7).toLocaleString()}$</div>
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <Btn onClick={launch} sz='lg'>💳 Payer et lancer la campagne</Btn>
          <Btn v='secondary' onClick={()=>setStep('list')}>← Changer</Btn>
        </div>
      </div>}
    </div>
  );
}

/* ── My Profile Tab ── */
function MyProfileTab({ profile, userProfiles, setProfile, user, onLogout, onAddProfile, isSubscribed }) {
  const { updateUserProfile } = useStore();
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState({ ...profile, links: Array.isArray(profile.links)?profile.links.join(', '):profile.links||'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setP(prev=>({...prev,[k]:v}));

  const save = async () => {
    setLoading(true);
    try {
      const coords = REGION_COORDS[p.region]||{lat:p.lat,lng:p.lng};
      const updated = await upsertProfile({
        ...p,
        links: p.links?p.links.split(',').map(l=>l.trim()).filter(Boolean):[],
        lat: coords.lat+(Math.random()-.5)*.2,
        lng: coords.lng+(Math.random()-.5)*.2,
      });
      updateUserProfile(updated);
      setProfile(updated);
      setEditing(false);
      toast.success('Profil mis à jour ✓');
    } catch(e) { toast.error(e.message); }
    setLoading(false);
  };

  if (editing) return (
    <div style={{maxWidth:560}} className='fade-in'>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:C.cream,fontWeight:700}}>Modifier mon profil</div>
        <Btn v='ghost' sz='sm' onClick={()=>setEditing(false)}>✕ Annuler</Btn>
      </div>
      <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:24,display:'flex',flexDirection:'column',gap:13}}>
        <div>
          <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:7}}>Avatar</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {AVATARS.map(a=><button key={a} onClick={()=>set('avatar',a)} style={{fontSize:20,width:38,height:38,background:p.avatar===a?C.orange+'33':C.tag,border:'1px solid '+(p.avatar===a?C.orange:C.border),borderRadius:7,cursor:'pointer'}}>{a}</button>)}
          </div>
        </div>
        {[{l:'Nom artistique',k:'name'},{l:'Genre',k:'genre',sel:GENRES},{l:'Bio',k:'bio',ml:true},{l:'Cachet / Tarif',k:'fee'},{l:'Liens (séparés par virgule)',k:'links'}].map(f=>(
          <div key={f.k}>
            <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>{f.l}</div>
            {f.sel?<Sel value={p[f.k]||''} onChange={v=>set(f.k,v)} options={f.sel}/>:<Inp value={p[f.k]||''} onChange={v=>set(f.k,v)} placeholder={f.l+'...'} ml={f.ml} rows={2}/>}
          </div>
        ))}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Région</div>
            <Sel value={p.region||'Montréal'} onChange={v=>set('region',v)} options={Object.keys(REGION_COORDS)}/>
          </div>
          <div>
            <div style={{fontSize:10,color:C.dim,letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Pays</div>
            <Sel value={p.country||'Canada'} onChange={v=>set('country',v)} options={['Canada','France','Belgique','Suisse','Allemagne','Espagne','Pays-Bas','Autre']}/>
          </div>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <input type='checkbox' checked={p.available} onChange={e=>set('available',e.target.checked)} style={{accentColor:C.orange,width:16,height:16}}/>
          <span style={{fontSize:13,color:C.text}}>Disponible pour booking</span>
        </label>
        <Btn onClick={save} disabled={loading} sz='lg'>{loading?<Spinner/>:'💾 Sauvegarder'}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:600}} className='fade-in'>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:C.cream,fontWeight:700}}>Mon profil actif</div>
        <div style={{display:'flex',gap:8}}>
          <Btn v='secondary' sz='sm' onClick={()=>setEditing(true)}>✏️ Modifier</Btn>
          <Btn v='ghost' sz='sm' onClick={onLogout}>Déconnexion</Btn>
        </div>
      </div>
      <div style={{background:C.card,border:'1px solid '+C.orange+'44',borderRadius:16,padding:24,marginBottom:16}}>
        <div style={{display:'flex',gap:16,marginBottom:16}}>
          <div style={{fontSize:48,width:72,height:72,background:C.tag,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid '+C.orange}}>{profile.avatar||'🎵'}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,marginBottom:4}}>{profile.name}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
              <Pill color={typeColors[profile.type]}>{typeLabels[profile.type]}</Pill>
              {profile.available&&<span style={{color:C.green,fontSize:11}}>● Disponible</span>}
              {isSubscribed&&<Pill color={C.glow}>✦ Abonné</Pill>}
              {profile.verified&&<Pill color={C.blue}>✓ Vérifié</Pill>}
            </div>
            <div style={{color:C.muted,fontSize:12}}>📍 {profile.region}, {profile.country} · 🎼 {profile.genre}</div>
            <div style={{color:C.dim,fontSize:11,marginTop:2}}>📧 {user.email}</div>
          </div>
        </div>
        {profile.bio&&<p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:10}}>{profile.bio}</p>}
        {profile.fee&&<div style={{color:C.amber,fontSize:13,marginBottom:8}}>💰 {profile.fee}</div>}
        {profile.links&&profile.links.length>0&&<div>{profile.links.map((l,i)=><a key={i} href={'https://'+l} target='_blank' rel='noreferrer' style={{display:'inline-block',marginRight:5,marginBottom:5,background:C.tag,border:'1px solid '+C.border,color:C.orangeLt,borderRadius:5,padding:'2px 8px',fontSize:11,textDecoration:'none'}}>🔗 {l}</a>)}</div>}
        <div style={{marginTop:12,background:C.orange+'11',border:'1px solid '+C.orange+'33',borderRadius:8,padding:10,fontSize:12,color:C.muted}}>
          ✦ Votre profil est <strong style={{color:C.green}}>visible sur la carte</strong> et dans le répertoire.
        </div>
      </div>

      {userProfiles && userProfiles.length > 1 && (
        <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:18,marginBottom:16}}>
          <div style={{fontWeight:700,color:C.text,marginBottom:12,fontSize:13}}>Mes autres profils</div>
          {userProfiles.filter(p=>p.id!==profile.id).map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid '+C.border+'44'}}>
              <span style={{fontSize:22}}>{p.avatar}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{typeLabels[p.type]} · {p.region}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginBottom:16}}>
        <Btn v='secondary' onClick={onAddProfile} full>＋ Ajouter un profil</Btn>
      </div>

      {!isSubscribed&&<div style={{background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:18}}>
        <div style={{fontWeight:700,color:C.orange,marginBottom:6,fontSize:14}}>✦ Activer l'abonnement</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:14,lineHeight:1.7}}>Booking illimité · Streaming · Messagerie pro · IA Tournée · 1 boost publicitaire/mois</div>
        <div style={{display:'flex',gap:10}}>
          <Btn onClick={()=>startSubscription('monthly',profile.id).catch(e=>toast.error(e.message))}>19$/mois</Btn>
          <Btn v='secondary' onClick={()=>startSubscription('annual',profile.id).catch(e=>toast.error(e.message))}>149$/an (−22%)</Btn>
        </div>
      </div>}
    </div>
  );
}

/* ════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { session, user, profile, setProfile, setProfiles, tab, setTab, userProfiles, switchProfile } = useStore();

  const [profiles, setLocalProfiles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [profileModal, setProfileModal] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [calEntries, setCalEntries] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const isSubscribed = checkSubscription(profile);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const data = await getAllProfiles({ search: search || undefined, type: filter !== 'all' ? filter : undefined });
      setLocalProfiles(data);
      setProfiles(data);
    } catch(e) { toast.error('Erreur chargement: '+e.message); }
    setLoadingProfiles(false);
  }, [search, filter]);

  useEffect(() => { loadProfiles(); }, [filter]);
  useEffect(() => { const t = setTimeout(loadProfiles, 400); return ()=>clearTimeout(t); }, [search]);

  useEffect(() => {
    if (!user) return;
    getMessages(user.id).then(setMessages);
    const sub = supabase.channel('messages_'+user.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:'to_id=eq.'+user.id }, () => {
        getMessages(user.id).then(setMessages);
        toast('📬 Nouveau message !');
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getMyCalendar(user.id).then(setCalEntries);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAddProfile = () => navigate('/onboard');
  const handleSwitchProfile = (profileId) => {
    switchProfile(profileId);
    toast.success('Profil changé ✓');
  };

  const openChat = (p) => { setChatPartner(p); setInviteTarget(null); };
  const openInvite = (p) => { setInviteTarget(p); setChatPartner(null); };

  const unread = messages.filter(m=>!m.read&&m.to_id===user?.id).length;

  const filtered = profiles.filter(a =>
    (filter === 'all' || a.type === filter) &&
    (!search || (a.name+a.genre+(a.region||'')+(a.country||'')).toLowerCase().includes(search.toLowerCase()))
  );

  const TABS = [
    { k:'map',    i:'🗺️',  l:'Carte' },
    { k:'list',   i:'📋',  l:'Répertoire' },
    { k:'ai',     i:'🤖',  l:'IA Tournée' },
    { k:'inbox',  i:'💬',  l:'Messages', badge: unread },
    { k:'cal',    i:'📅',  l:'Agenda' },
    { k:'promo',  i:'📣',  l:'Promotion' },
    { k:'me',     i:'👤',  l:'Profil' },
  ];

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",background:C.bg,color:C.text,minHeight:'100vh'}}>
      <header style={{background:'linear-gradient(135deg,'+C.bg+' 0%,#2a1200 100%)',borderBottom:'1px solid '+C.border,padding:'0 20px',height:58,display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:500,boxShadow:'0 4px 32px #00000060'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:22}}>🎭</span>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.glow,letterSpacing:-.5}}>StageMap</div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:2,textTransform:'uppercase',marginTop:-2}}>Réseau Scène Global</div>
          </div>
        </div>

        <nav style={{display:'flex',gap:1,marginLeft:12,flex:1,overflowX:'auto'}}>
          {TABS.map(n=>(
            <button key={n.k} onClick={()=>setTab(n.k)}
              style={{position:'relative',background:tab===n.k?C.orange+'20':'none',border:'1px solid '+(tab===n.k?C.orange+'66':'transparent'),color:tab===n.k?C.orangeLt:C.muted,borderRadius:7,padding:'4px 11px',cursor:'pointer',fontSize:11,fontWeight:tab===n.k?600:400,fontFamily:"'Outfit',sans-serif",transition:'all .15s',whiteSpace:'nowrap'}}>
              {n.i} {n.l}
              {n.badge>0&&<span style={{position:'absolute',top:0,right:0,background:C.red,color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        {profile && (
          <ProfileSwitcher
            profile={profile}
            userProfiles={userProfiles && userProfiles.length > 0 ? userProfiles : [profile]}
            onSwitch={handleSwitchProfile}
            onAdd={handleAddProfile}
            onLogout={handleLogout}
          />
        )}
      </header>

      {(tab==='map'||tab==='list')&&(
        <div style={{background:C.card,borderBottom:'1px solid '+C.border,padding:'8px 20px',display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='🔍 Nom, région, genre, pays...' style={{background:C.tag,border:'1px solid '+C.border,borderRadius:8,padding:'6px 12px',color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:12,outline:'none',width:220}}/>
          {['all','artist','venue','fan'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?(typeColors[f]||C.orange)+'22':C.tag,color:filter===f?(typeColors[f]||C.orange):C.muted,border:'1px solid '+(filter===f?(typeColors[f]||C.orange):C.border),borderRadius:20,padding:'3px 11px',cursor:'pointer',fontSize:11,fontWeight:filter===f?600:400,fontFamily:"'Outfit',sans-serif"}}>
              {f==='all'?'Tous':(f==='artist'?'🎵 ':f==='venue'?'🏛️ ':'💛 ')+typeLabels[f]}
            </button>
          ))}
          <span style={{marginLeft:'auto',color:C.dim,fontSize:11}}>
            {loadingProfiles?'Chargement...':(filtered.length+' profils')}
          </span>
        </div>
      )}

      <main style={{padding:'20px',maxWidth:1100,margin:'0 auto'}}>
        {tab==='map'&&<MapView artists={filtered} myProfile={profile} onOpen={setProfileModal}/>}
        {tab==='list'&&(
          <div className='fade-in' style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {loadingProfiles&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px 0',display:'flex',justifyContent:'center'}}><Spinner/></div>}
            {!loadingProfiles&&filtered.map(a=><ProfileCard key={a.id} a={a} myId={profile?.id} onOpen={setProfileModal}/>)}
            {!loadingProfiles&&filtered.length===0&&<div style={{gridColumn:'1/-1',color:C.dim,textAlign:'center',padding:'30px 0'}}>Aucun profil trouvé</div>}
          </div>
        )}
        {tab==='ai'&&<AIPanel profiles={profiles} myProfile={profile} onLaunchTour={plan=>{}}/>}
        {tab==='inbox'&&<InboxView messages={messages} myId={user?.id} profiles={profiles} onChat={openChat} onRefresh={()=>getMessages(user.id).then(setMessages)}/>}
        {tab==='cal'&&<CalendarView myId={profile?.id} profiles={profiles}/>}
        {tab==='promo'&&<PromoModule myProfile={profile} isSubscribed={isSubscribed}/>}
        {tab==='me'&&profile&&<MyProfileTab profile={profile} userProfiles={userProfiles||[profile]} setProfile={setProfile} user={user} onLogout={handleLogout} onAddProfile={handleAddProfile} isSubscribed={isSubscribed}/>}
      </main>

      <footer style={{borderTop:'1px solid '+C.border,padding:'12px 20px',display:'flex',justifyContent:'space-between',color:C.dim,fontSize:11}}>
        <span>© 2026 StageMap — Réseau Scène Global</span>
        <span>{profiles.length} profils enregistrés</span>
      </footer>

      {profileModal&&<ProfileModal a={profileModal} myId={profile?.id} onClose={()=>setProfileModal(null)} onChat={openChat} onInvite={openInvite}/>}
      {chatPartner&&profile&&<ChatPanel myProfile={profile} partner={chatPartner} onClose={()=>setChatPartner(null)}/>}
      {inviteTarget&&profile&&(
        <InviteModal organizer={profile} invitee={inviteTarget} profiles={profiles} onClose={()=>setInviteTarget(null)} onSent={()=>{setInviteTarget(null);getMessages(user.id).then(setMessages);}}/>
      )}
    </div>
  );
}

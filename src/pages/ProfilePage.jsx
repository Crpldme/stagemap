// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, sendMessage } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';

const C = {
  bg:'#140c00', bg2:'#1e1100', card:'#271500', cardHov:'#301a00',
  border:'#3d2200', orange:'#d95f00', orangeLt:'#f07020', glow:'#ff9030', amber:'#ffb940',
  brown:'#7a4010', brownLt:'#a05820',
  text:'#f0d8a8', muted:'#9a6830', dim:'#5a3810', cream:'#fef3d0',
  green:'#3ed870', blue:'#40a8ff', purple:'#c060ff', tag:'#2a1600',
};

const typeColors = { artist: C.orange, venue: C.brown, fan: C.brownLt };
const typeLabels  = { artist: 'Artiste', venue: 'Lieu', fan: 'Fan' };

function parseLinkMeta(raw) {
  const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  try {
    // YouTube video
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { type:'youtube', embed:`https://www.youtube.com/embed/${yt[1]}?rel=0`, label:'YouTube', icon:'▶️' };

    // Spotify track / album / playlist / artist
    const sp = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/);
    if (sp) return {
      type: 'spotify',
      embed: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?utm_source=generator&theme=0`,
      height: sp[1] === 'track' ? 152 : 352,
      label: 'Spotify', icon: '🎧',
    };

    // SoundCloud
    if (url.includes('soundcloud.com')) return {
      type: 'soundcloud',
      embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23d95f00&auto_play=false&hide_related=true&show_comments=false&show_user=true`,
      label: 'SoundCloud', icon: '☁️',
    };

    // Known social links — button only
    const host = new URL(url).hostname.replace('www.', '');
    const socials = {
      'instagram.com': { icon:'📸', label:'Instagram' },
      'tiktok.com':    { icon:'🎵', label:'TikTok' },
      'facebook.com':  { icon:'📘', label:'Facebook' },
      'twitter.com':   { icon:'🐦', label:'Twitter' },
      'x.com':         { icon:'🐦', label:'X / Twitter' },
      'bandcamp.com':  { icon:'🎸', label:'Bandcamp' },
      'linktr.ee':     { icon:'🌿', label:'Linktree' },
    };
    const s = socials[host];
    if (s) return { type:'link', url, label: s.label, icon: s.icon };

    return { type:'link', url, label: host, icon:'🔗' };
  } catch {
    return { type:'link', url: raw, label: raw, icon:'🔗' };
  }
}

function generateEventPost(ev, profile, profileUrl) {
  const dateStr = new Date(ev.date_start).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = ev.time_start ? `${ev.time_start}${ev.time_end ? ' – ' + ev.time_end : ''}` : null;
  const slug = s => s?.replace(/[\s/,&]+/g, '') || '';
  const hashtags = ['#StageMap', profile?.genre ? '#' + slug(profile.genre) : '#LiveMusic', profile?.region ? '#' + slug(profile.region) : null, '#Concert'].filter(Boolean).join(' ');
  return [
    `🎭 ${ev.title}`,
    '',
    `📅 ${dateStr}`,
    timeStr ? `⏰ ${timeStr}` : null,
    ev.location ? `📍 ${ev.location}` : null,
    profile?.name ? `🎵 ${profile.name}${profile.region ? ' · ' + profile.region : ''}` : null,
    profile?.genre ? `🎼 ${profile.genre}` : null,
    '',
    ev.description ? ev.description : null,
    '',
    `Réservez sur StageMap 👉 ${profileUrl}`,
    '',
    hashtags,
  ].filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang, setLang, profile: myProfile } = useStore();
  const t = useT();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedEv, setSelectedEv] = useState(null);
  const [copiedAnnonce, setCopiedAnnonce] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: p, error } = await supabase
        .from('profiles').select('*').eq('id', id).single();

      if (error || !p) {
        // Retry once — session may need an extra tick to propagate
        await new Promise(r => setTimeout(r, 600));
        const { data: p2, error: e2 } = await supabase
          .from('profiles').select('*').eq('id', id).single();
        if (e2 || !p2) { setNotFound(true); setLoading(false); return; }
        setProfile(p2);
      } else {
        setProfile(p);
      }

      const { data: evs } = await supabase
        .from('calendar_entries').select('*')
        .eq('user_id', id).eq('visibility', 'public')
        .gt('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(20);
      const loaded = evs || [];
      setEvents(loaded);
      const evParam = searchParams.get('event');
      if (evParam) {
        const match = loaded.find(e => e.id === evParam);
        if (match) setSelectedEv(match);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Lien copié !');
  };

  const handleContact = async () => {
    if (!contactBody.trim()) { toast.error('Message requis'); return; }
    setContactSending(true);
    try {
      await sendMessage(myProfile.id, profile.id, contactSubject || `Message de ${myProfile.name}`, contactBody);
      setContactSent(true);
      toast.success('Message envoyé !');
    } catch(e) { toast.error(e.message || 'Erreur'); }
    setContactSending(false);
  };

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid '+C.border, borderTop: '2px solid '+C.orange, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 12 }}>
      <div style={{ fontSize: 48 }}>🎭</div>
      <div style={{ fontSize: 16, color: C.text }}>{t('pub.not_found')}</div>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>{t('pub.back')}</button>
    </div>
  );

  const vis = profile.profile_visibility || {};
  const show = (key) => vis[key] !== false;

  const links = (profile.links || []).filter(Boolean);
  const linkMetas = links.map(parseLinkMeta);
  const embeds = linkMetas.filter(m => m.type !== 'link');
  const linkButtons = linkMetas.filter(m => m.type === 'link');
  const tc = typeColors[profile.type] || C.orange;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #140c00; }
        ::-webkit-scrollbar-thumb { background: #3d2200; border-radius: 2px; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: C.bg, borderBottom: '1px solid '+C.border, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(8px)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>{t('pub.back')}</button>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: C.glow, fontWeight: 700 }}>🎭 StageMap</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          style={{ background: 'none', border: '1px solid '+C.border, color: C.dim, borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>
          {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
        </button>
        <button onClick={copyLink} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>{t('pub.share')}</button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.card, border: '3px solid '+tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, flexShrink: 0, boxShadow: '0 0 20px '+tc+'44' }}>
            {profile.avatar || '🎵'}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.cream, lineHeight: 1.1, marginBottom: 6 }}>{profile.name}</h1>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
              <span style={{ background: tc+'22', color: tc, border: '1px solid '+tc+'44', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{typeLabels[profile.type]}</span>
              {profile.venue_type && <span style={{ background: C.card, color: C.muted, border: '1px solid '+C.border, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>{profile.venue_type}</span>}
              {show('show_available') && profile.available && <span style={{ color: C.green, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, display: 'inline-block' }} />{t('status.available')}</span>}
              {profile.verified && <span style={{ color: C.blue, fontSize: 11 }}>{t('status.verified')}</span>}
            </div>
            {show('show_genre') && profile.genre && <div style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>{profile.genre}</div>}
            {show('show_region') && (profile.region || profile.country) && <div style={{ color: C.dim, fontSize: 11, marginBottom: 4 }}>📍 {profile.region}{profile.country ? ', ' + profile.country : ''}</div>}
            {profile.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: 11, color: s <= Math.round(profile.rating) ? C.amber : C.dim }}>★</span>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: C.dim }}>({profile.rating_count})</span>
              </div>
            )}
            {profile.type === 'artist' && (
              <a href={`/artist/${profile.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: C.orange, textDecoration: 'none', border: '1px solid '+C.orange+'44', background: C.orange+'11', borderRadius: 20, padding: '2px 10px' }}>
                🎼 Page artiste →
              </a>
            )}
          </div>
        </div>

        {show('show_bio') && profile.bio && (
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24, padding: '14px 16px', background: C.card, borderRadius: 10, border: '1px solid '+C.border }}>
            {profile.bio}
          </p>
        )}

        {show('show_fee') && profile.fee && (
          <div style={{ color: C.amber, fontSize: 13, marginBottom: 20 }}>💰 {profile.fee}</div>
        )}

        {/* Media embeds */}
        {show('show_links') && embeds.length > 0 && (
          <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{t('pub.media')}</div>
            {embeds.map((m, i) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid '+C.border }}>
                {m.type === 'youtube' && (
                  <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                    <iframe
                      src={m.embed}
                      title='YouTube'
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                      allowFullScreen
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                )}
                {m.type === 'spotify' && (
                  <iframe
                    src={m.embed}
                    title='Spotify'
                    allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
                    loading='lazy'
                    style={{ width: '100%', height: m.height, border: 'none', display: 'block' }}
                  />
                )}
                {m.type === 'soundcloud' && (
                  <iframe
                    src={m.embed}
                    title='SoundCloud'
                    allow='autoplay'
                    style={{ width: '100%', height: 166, border: 'none', display: 'block' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Social / link buttons */}
        {show('show_links') && linkButtons.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('pub.links')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {linkButtons.map((m, i) => (
                <a key={i} href={m.url} target='_blank' rel='noreferrer'
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.card, border: '1px solid '+C.border, color: C.text, borderRadius: 8, padding: '7px 13px', fontSize: 12, textDecoration: 'none', transition: 'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.orange}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <span>{m.icon}</span> {m.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming public events */}
        {show('show_events') && events.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('pub.events')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(ev => (
                <div key={ev.id} onClick={() => setSelectedEv(ev)}
                  style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '3px solid '+C.purple, borderRadius: 9, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.cardHov; e.currentTarget.style.borderColor = C.purple+'88'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border; }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 2 }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: 11, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>
                      {new Date(ev.date_start).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                    </div>
                    {ev.time_start && <div style={{ fontSize: 10, color: C.dim }}>{ev.time_start}</div>}
                    <div style={{ fontSize: 9, color: C.purple, marginTop: 2 }}>Voir →</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event detail modal */}
        {selectedEv && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setSelectedEv(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: C.bg2, border: '1px solid '+C.purple+'66', borderRadius: 16, maxWidth: 440, width: '100%', padding: 28, boxShadow: '0 40px 100px #00000090', fontFamily: "'Outfit', sans-serif" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <span style={{ background: C.purple+'22', color: C.purple, border: '1px solid '+C.purple+'44', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 600 }}>{t('ev.public')}</span>
                <button onClick={() => setSelectedEv(null)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.cream, marginBottom: 14, lineHeight: 1.2 }}>{selectedEv.title}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.text }}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <span>
                    {new Date(selectedEv.date_start).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {selectedEv.date_end && selectedEv.date_end !== selectedEv.date_start &&
                      ' → ' + new Date(selectedEv.date_end).toLocaleDateString('fr', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                {selectedEv.time_start && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                    <span style={{ fontSize: 16 }}>🕐</span>
                    <span>{selectedEv.time_start}{selectedEv.time_end ? ' – ' + selectedEv.time_end : ''}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                  <span style={{ fontSize: 16 }}>🎭</span>
                  <span>{profile.name} · {profile.region}</span>
                </div>
              </div>

              {selectedEv.description && (
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20, padding: '10px 14px', background: C.card, borderRadius: 8, border: '1px solid '+C.border }}>
                  {selectedEv.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <button
                  onClick={() => {
                    const post = generateEventPost(selectedEv, profile, window.location.href);
                    navigator.clipboard.writeText(post);
                    setCopiedAnnonce(true);
                    setTimeout(() => setCopiedAnnonce(false), 2500);
                  }}
                  style={{ width:'100%', padding:'10px 0', background:copiedAnnonce?C.green+'22':'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color:copiedAnnonce?C.green:'#fff', border:'1px solid '+(copiedAnnonce?C.green+'55':'transparent'), borderRadius:9, fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .2s' }}>
                  {copiedAnnonce ? t('ev.copied') : t('ev.copy')}
                </button>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { label:'𝕏', url:`https://twitter.com/intent/tweet?text=${encodeURIComponent(generateEventPost(selectedEv, profile, window.location.href))}`, color:'#1da1f2' },
                    { label:'💬', url:`https://wa.me/?text=${encodeURIComponent(generateEventPost(selectedEv, profile, window.location.href))}`, color:'#25d366' },
                    { label:'📘', url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, color:'#1877f2' },
                  ].map(p => (
                    <a key={p.label} href={p.url} target='_blank' rel='noreferrer'
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 0', background:p.color+'18', border:'1px solid '+p.color+'44', borderRadius:8, color:p.color, fontSize:14, textDecoration:'none', transition:'all .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = p.color+'30'}
                      onMouseLeave={e => e.currentTarget.style.background = p.color+'18'}>
                      {p.label}
                    </a>
                  ))}
                </div>
                <a href='/dashboard' style={{ display:'block', textAlign:'center', background:'linear-gradient(135deg,'+C.purple+',#8030cc)', color:'#fff', borderRadius:9, padding:'9px 0', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                  {t('ev.book')}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Contact / Booking section */}
        {myProfile && myProfile.id !== profile.id ? (
          <div style={{ background: C.card, border: '1px solid '+C.border, borderRadius: 14, padding: 22, marginBottom: 28 }}>
            {!showContact ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: C.cream, fontWeight: 700 }}>
                    {profile.type === 'venue' ? 'Réserver ce lieu' : `Contacter ${profile.name}`}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
                    {profile.type === 'venue' ? 'Envoyez une demande de booking directement' : 'Envoyez un message dans sa boîte StageMap'}
                  </div>
                </div>
                <button onClick={() => { setShowContact(true); setContactSubject(profile.type === 'venue' ? `Demande de booking — ${myProfile.name}` : `Message de ${myProfile.name}`); }}
                  style={{ background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border: 'none', borderRadius: 9, color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {profile.type === 'venue' ? '📋 Demander une réservation' : '✉️ Envoyer un message'}
                </button>
              </div>
            ) : contactSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: C.green, fontSize: 14 }}>✓ Message envoyé à {profile.name} !</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: C.cream, fontWeight: 700, marginBottom: 2 }}>
                  {profile.type === 'venue' ? 'Demande de réservation' : 'Envoyer un message'}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Sujet</div>
                  <input value={contactSubject} onChange={e => setContactSubject(e.target.value)}
                    style={{ width: '100%', background: '#1a0d00', border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: 'none' }}/>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Message</div>
                  <textarea value={contactBody} onChange={e => setContactBody(e.target.value)} rows={4} placeholder={`Bonjour ${profile.name}, ...`}
                    style={{ width: '100%', background: '#1a0d00', border: '1px solid '+C.border, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: 'none', resize: 'vertical' }}/>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowContact(false)} style={{ flex: 1, background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 8, padding: '9px 0', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13 }}>Annuler</button>
                  <button onClick={handleContact} disabled={contactSending}
                    style={{ flex: 2, background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 0', cursor: contactSending ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, opacity: contactSending ? .7 : 1 }}>
                    {contactSending ? '⏳ Envoi...' : '✉️ Envoyer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !myProfile ? (
          <div style={{ background: C.card, border: '1px solid '+C.border, borderRadius: 14, padding: 22, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: C.cream, fontWeight: 700 }}>
                {profile.type === 'venue' ? 'Réserver ce lieu' : `Contacter ${profile.name}`}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Créez un compte gratuit pour envoyer un message</div>
            </div>
            <a href='/dashboard' style={{ background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color: '#fff', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>
              Rejoindre StageMap →
            </a>
          </div>
        ) : null}

        {/* Footer CTA */}
        <div style={{ borderTop: '1px solid '+C.border, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.dim }}>
            {t('pub.profile_on')} <span style={{ color: C.glow, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>StageMap</span>
          </div>
          <a href='/dashboard' style={{ background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>
            {t('pub.join')}
          </a>
        </div>

      </div>
    </div>
  );
}

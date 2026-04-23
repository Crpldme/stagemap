// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Ensure Supabase session is loaded from localStorage before querying
      await supabase.auth.getSession();

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
        .limit(6);
      setEvents(evs || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Lien copié !');
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
      <div style={{ fontSize: 16, color: C.text }}>Profil introuvable</div>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>← Retour</button>
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
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>← Retour</button>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: C.glow, fontWeight: 700 }}>🎭 StageMap</div>
        <div style={{ flex: 1 }} />
        <button onClick={copyLink} style={{ background: 'none', border: '1px solid '+C.border, color: C.muted, borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>🔗 Partager</button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.card, border: '3px solid '+tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, flexShrink: 0, boxShadow: '0 0 20px '+tc+'44' }}>
            {profile.avatar || '🎵'}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.cream, lineHeight: 1.1, marginBottom: 6 }}>{profile.name}</h1>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ background: tc+'22', color: tc, border: '1px solid '+tc+'44', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{typeLabels[profile.type]}</span>
              {show('show_available') && profile.available && <span style={{ color: C.green, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, display: 'inline-block' }} />Disponible</span>}
              {profile.verified && <span style={{ color: C.blue, fontSize: 11 }}>✓ Vérifié</span>}
            </div>
            {show('show_genre') && <div style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>{profile.genre}</div>}
            {show('show_region') && <div style={{ color: C.dim, fontSize: 11 }}>📍 {profile.region}{profile.country ? ', ' + profile.country : ''}</div>}
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
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Musique & Médias</div>
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
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Liens</div>
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
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Événements à venir</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(ev => (
                <div key={ev.id} style={{ background: C.card, border: '1px solid '+C.border, borderLeft: '3px solid '+C.purple, borderRadius: 9, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 2 }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: 11, color: C.dim }}>{ev.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>
                      {new Date(ev.date_start).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                    </div>
                    {ev.time_start && <div style={{ fontSize: 10, color: C.dim }}>{ev.time_start}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ borderTop: '1px solid '+C.border, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.dim }}>
            Profil sur <span style={{ color: C.glow, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>StageMap</span>
          </div>
          <a href='/dashboard' style={{ background: 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>
            Rejoindre StageMap →
          </a>
        </div>

      </div>
    </div>
  );
}

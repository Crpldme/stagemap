// src/pages/OnboardPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../lib/store';
import { supabase, upsertProfile } from '../lib/supabase';

const C = {
  bg:"#140c00", card:"#271500", border:"#3d2200", tag:"#2a1600",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  green:"#3ed870", brown:"#7a4010", brownLt:"#a05820",
};

const typeColors = { artist: C.orange, venue: C.brown, fan: C.brownLt };
const typeLabels = { artist: 'Artiste', venue: 'Lieu', fan: 'Fan' };

const REGION_COORDS = {
  'Montréal':{ lat:45.50, lng:-73.57 }, 'Québec':{ lat:46.82, lng:-71.22 },
  'Sherbrooke':{ lat:45.40, lng:-71.90 }, 'Toronto':{ lat:43.65, lng:-79.38 },
  'Vancouver':{ lat:49.28, lng:-123.12 }, 'Paris':{ lat:48.85, lng:2.35 },
  'Lyon':{ lat:45.75, lng:4.85 }, 'Bordeaux':{ lat:44.84, lng:-0.58 },
  'Marseille':{ lat:43.30, lng:5.37 }, 'Strasbourg':{ lat:48.57, lng:7.75 },
  'Metz':{ lat:49.12, lng:6.18 }, 'Bruxelles':{ lat:50.85, lng:4.35 },
  'Berlin':{ lat:52.52, lng:13.40 }, 'Amsterdam':{ lat:52.37, lng:4.90 },
  'Madrid':{ lat:40.42, lng:-3.70 }, 'Barcelone':{ lat:41.38, lng:2.17 },
  'Genève':{ lat:46.20, lng:6.15 }, 'Lausanne':{ lat:46.52, lng:6.63 },
};

const AVATARS = ['🎷','🎸','🎤','🎻','🥁','💃','🎹','🎺','🎭','🌟','🔥','🎪','🎵','🎼','🎬','🎨'];

const GENRES = [
  'Jazz / Soul','Rock / Indie','R&B / Neo Soul','Classique','Flamenco',
  'Electronic / Techno','Folk / Chanson','Hip-Hop','Metal / Punk','Blues',
  'Reggae / Dub','Musique du monde','Théâtre / Arts vivants','Danse','Variété',
  'Multi-genres','Tous styles',
];

function Inp({ value, onChange, placeholder, ml, rows = 3, style: s = {} }) {
  const base = { background: C.tag, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%', ...s };
  return ml
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, resize: 'vertical' }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />;
}

function Sel({ value, onChange, options, style: s = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: C.tag, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%', ...s }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function OnboardPage() {
  const navigate = useNavigate();
  const { user, setProfile } = useStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState({
    type: 'artist', name: '', genre: 'Jazz / Soul',
    region: 'Montréal', country: 'Canada', avatar: '🎷',
    bio: '', fee: '', links: '', available: true,
  });
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));

  const finish = async () => {
    if (!user) { toast.error('Session expirée, reconnectez-vous'); navigate('/auth'); return; }
    setLoading(true);
    try {
      const coords = REGION_COORDS[p.region] || { lat: 45.5, lng: -73.57 };
      const profile = {
        id: user.id,
        email: user.email,
        name: p.name || user.user_metadata?.name || 'Utilisateur',
        type: p.type,
        genre: p.genre,
        region: p.region,
        country: p.country,
        avatar: p.avatar,
        bio: p.bio,
        fee: p.fee || null,
        available: p.available,
        links: p.links ? p.links.split(',').map(l => l.trim()).filter(Boolean) : [],
        lat: coords.lat + (Math.random() - 0.5) * 0.2,
        lng: coords.lng + (Math.random() - 0.5) * 0.2,
      };
      const saved = await upsertProfile(profile);
      setProfile(saved);
      toast.success('✦ Profil créé ! Bienvenue sur StageMap.');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
    setLoading(false);
  };

  const steps = [
    {
      title: 'Quel est votre rôle ?',
      valid: true,
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { k: 'artist', l: 'Artiste', i: '🎵', d: 'Musicien, chanteur, DJ, comédien, danseur...' },
            { k: 'venue',  l: 'Lieu',    i: '🏛️', d: 'Salle, club, théâtre, festival, studio...' },
            { k: 'fan',    l: 'Fan',     i: '💛', d: 'Spectateur, organisateur, passionné...' },
          ].map(r => (
            <div key={r.k} onClick={() => set('type', r.k)}
              style={{ background: p.type === r.k ? typeColors[r.k] + '22' : C.tag, border: '2px solid ' + (p.type === r.k ? typeColors[r.k] : C.border), borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'center', transition: 'all .2s' }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>{r.i}</div>
              <div style={{ fontWeight: 700, color: p.type === r.k ? typeColors[r.k] : C.text, fontSize: 14, marginBottom: 4 }}>{r.l}</div>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{r.d}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Votre identité',
      valid: p.name.trim().length > 0,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Nom artistique / Nom du lieu *</div>
            <Inp value={p.name} onChange={v => set('name', v)} placeholder="Ex: Léa Fontaine · Le Café Scène" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Genre / Spécialité</div>
            <Sel value={p.genre} onChange={v => set('genre', v)} options={GENRES} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Bio courte</div>
            <Inp value={p.bio} onChange={v => set('bio', v)} placeholder="Décrivez-vous en 1–2 phrases..." ml rows={2} />
          </div>
          {p.type !== 'fan' && (
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Cachet / Tarif (optionnel)</div>
              <Inp value={p.fee} onChange={v => set('fee', v)} placeholder="Ex: 300–600 $CA · Partage recette · Sur demande" />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Localisation et liens',
      valid: true,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Avatar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => set('avatar', a)}
                  style={{ fontSize: 22, width: 42, height: 42, background: p.avatar === a ? C.orange + '33' : C.tag, border: '1px solid ' + (p.avatar === a ? C.orange : C.border), borderRadius: 8, cursor: 'pointer', transition: 'all .15s' }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Région</div>
              <Sel value={p.region} onChange={v => set('region', v)} options={Object.keys(REGION_COORDS)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Pays</div>
              <Sel value={p.country} onChange={v => set('country', v)} options={['Canada','France','Belgique','Suisse','Allemagne','Espagne','Pays-Bas','Portugal','Autre']} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Liens externes (séparés par virgule)</div>
            <Inp value={p.links} onChange={v => set('links', v)} placeholder="soundcloud.com/vous, instagram.com/vous, votresite.com" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={p.available} onChange={e => set('available', e.target.checked)} style={{ accentColor: C.orange, width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: C.text }}>Disponible pour booking</span>
          </label>
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: C.cream, fontWeight: 700 }}>Créer votre profil</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Étape {step + 1} sur {steps.length}</div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: i <= step ? C.orange : C.border, borderRadius: 2, transition: 'all .3s' }} />
          ))}
        </div>

        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 28, boxShadow: '0 24px 60px #00000060' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: C.cream, fontWeight: 700, marginBottom: 20 }}>{steps[step].title}</div>
          {steps[step].content}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ background: 'none', border: '1px solid ' + C.border, borderRadius: 8, padding: '9px 18px', color: C.muted, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>← Retour</button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!steps[step].valid}
                style={{ background: 'linear-gradient(135deg,' + C.orange + ',' + C.orangeLt + ')', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', cursor: steps[step].valid ? 'pointer' : 'not-allowed', fontWeight: 600, fontFamily: "'Outfit',sans-serif", fontSize: 13, opacity: steps[step].valid ? 1 : .5 }}>
                Continuer →
              </button>
            ) : (
              <button onClick={finish} disabled={loading}
                style={{ flex: 1, background: loading ? C.tag : 'linear-gradient(135deg,' + C.orange + ',' + C.orangeLt + ')', border: 'none', borderRadius: 10, padding: '13px 0', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'Outfit',sans-serif", fontSize: 15, boxShadow: '0 4px 20px ' + C.orange + '44' }}>
                {loading ? '⏳ Publication...' : '✦ Publier mon profil'}
              </button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 14, background: C.card, border: '1px solid ' + C.border, borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 30, width: 46, height: 46, background: C.tag, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + typeColors[p.type] }}>{p.avatar}</div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 700, color: C.cream }}>{p.name || 'Votre nom'}</div>
            <div style={{ color: C.muted, fontSize: 11 }}>{p.genre} · {p.region}, {p.country}</div>
            <span style={{ background: typeColors[p.type] + '22', color: typeColors[p.type], border: '1px solid ' + typeColors[p.type] + '44', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>{typeLabels[p.type]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

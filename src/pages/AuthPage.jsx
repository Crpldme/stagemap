// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signIn, signUp, supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const C = {
  bg:"#140c00", card:"#271500", border:"#3d2200", tag:"#2a1600",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  red:"#ff5040", green:"#3ed870",
};

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession, setUser } = useStore();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (mode === 'reset') {
      if (!form.email) { toast.error('Entrez votre email'); return; }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
         redirectTo: 'https://stagemap.vercel.app/auth',
        });
        if (error) throw error;
        toast.success('Email de récupération envoyé ! Vérifiez votre boîte.');
        setMode('login');
      } catch (err) {
        toast.error(err.message || 'Erreur');
      }
      setLoading(false);
      return;
    }

    if (!form.email || !form.password) { toast.error('Email et mot de passe requis'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { session, user } = await signIn(form.email, form.password);
        setSession(session); setUser(user);
        navigate('/dashboard');
      } else {
        if (!form.name.trim()) { toast.error('Nom requis'); setLoading(false); return; }
        await signUp(form.email, form.password, form.name);
        toast.success('Compte créé ! Vérifiez votre email si requis.');
        navigate('/onboard');
      }
    } catch (err) {
      const msg = err.message || 'Erreur';
      if (msg.includes('Invalid login')) toast.error('Email ou mot de passe incorrect');
      else if (msg.includes('already registered')) toast.error('Email déjà utilisé');
      else toast.error(msg);
    }
    setLoading(false);
  };

  const inp = (k, type = 'text', ph = '') => (
    <input
      type={type}
      value={form[k]}
      onChange={e => set(k, e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handle()}
      placeholder={ph}
      style={{ background: C.tag, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }}
    />
  );

  const btnLabel = () => {
    if (loading) return '⏳ Chargement...';
    if (mode === 'login') return 'Se connecter →';
    if (mode === 'signup') return 'Créer mon compte →';
    return 'Envoyer le lien →';
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🎭</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontWeight: 700, color: C.glow, letterSpacing: -1 }}>StageMap</div>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginTop: 6 }}>Réseau Scène Global</div>
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 32, boxShadow: '0 32px 80px #00000080, 0 0 60px ' + C.orange + '11' }}>

          {/* Tabs — cachés en mode reset */}
          {mode !== 'reset' && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: C.tag, borderRadius: 10, padding: 4 }}>
              {[{ k: 'login', l: 'Se connecter' }, { k: 'signup', l: "S'inscrire" }].map(t => (
                <button key={t.k} onClick={() => setMode(t.k)}
                  style={{ flex: 1, background: mode === t.k ? C.orange : 'none', color: mode === t.k ? '#fff' : C.muted, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: mode === t.k ? 600 : 400, fontFamily: "'Outfit',sans-serif", transition: 'all .2s' }}>{t.l}</button>
              ))}
            </div>
          )}

          {/* Titre mode reset */}
          {mode === 'reset' && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, fontFamily: "'Outfit',sans-serif", marginBottom: 12, padding: 0 }}>← Retour</button>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: C.cream, fontWeight: 700 }}>Récupérer mon mot de passe</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Un lien vous sera envoyé par email.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Nom artistique / Nom du lieu</div>
                {inp('name', 'text', 'Ex: Léa Fontaine · Le Café Scène')}
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Email</div>
              {inp('email', 'email', 'vous@email.com')}
            </div>
            {mode !== 'reset' && (
              <div>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Mot de passe</div>
                {inp('password', 'password', '••••••••')}
              </div>
            )}
          </div>

          <button
            onClick={handle}
            disabled={loading}
            style={{ marginTop: 24, width: '100%', background: loading ? C.tag : 'linear-gradient(135deg,' + C.orange + ',' + C.orangeLt + ')', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontFamily: "'Outfit',sans-serif", boxShadow: '0 4px 20px ' + C.orange + '44', transition: 'all .2s' }}>
            {btnLabel()}
          </button>

          {/* Liens bas de carte */}
          {mode === 'login' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>
                🔑 Mot de passe oublié ?
              </button>
              <p style={{ margin: 0, fontSize: 12, color: C.dim }}>
                Pas encore de compte ?{' '}
                <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: C.orangeLt, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>S'inscrire gratuitement</button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: C.dim }}>
              Déjà un compte ?{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.orangeLt, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>Se connecter</button>
            </p>
          )}
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
          En vous inscrivant vous acceptez nos conditions d'utilisation.<br />
          Données sécurisées · Aucune pub sans votre consentement.
        </p>
      </div>
    </div>
  );
}

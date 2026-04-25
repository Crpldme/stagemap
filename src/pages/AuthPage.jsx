// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signIn, signUp, supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';

const C = {
  bg:"#140c00", card:"#271500", border:"#3d2200", tag:"#2a1600",
  orange:"#d95f00", orangeLt:"#f07020", glow:"#ff9030",
  text:"#f0d8a8", muted:"#9a6830", dim:"#5a3810", cream:"#fef3d0",
  red:"#ff5040", green:"#3ed870",
};

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession, setUser, lang, setLang } = useStore();
  const t = useT();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (mode === 'reset') {
      if (!form.email) { toast.error('Email requis'); return; }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: 'https://stagemap.vercel.app/auth',
        });
        if (error) throw error;
        toast.success('Email de récupération envoyé ! Vérifiez votre boîte.');
        setMode('login');
      } catch (err) { toast.error(err.message || 'Erreur'); }
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
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder={ph}
      style={{ background: C.tag, border: '1px solid '+C.border, borderRadius: 8, padding: '10px 14px', color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: 'none', width: '100%' }} />
  );

  const btnLabel = () => {
    if (loading) return t('auth.btn_loading');
    if (mode === 'login') return t('auth.btn_login');
    if (mode === 'signup') return t('auth.btn_signup');
    return t('auth.btn_reset');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo + lang toggle */}
        <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
          <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            style={{ position: 'absolute', right: 0, top: 0, background: C.tag, border: '1px solid '+C.border, borderRadius: 20, padding: '4px 12px', fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>
            {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
          </button>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🎭</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontWeight: 700, color: C.glow, letterSpacing: -1 }}>StageMap</div>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: 3, textTransform: 'uppercase', marginTop: 6 }}>{t('auth.tagline')}</div>
        </div>

        <div style={{ background: C.card, border: '1px solid '+C.border, borderRadius: 16, padding: 32, boxShadow: '0 32px 80px #00000080, 0 0 60px '+C.orange+'11' }}>

          {mode !== 'reset' && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: C.tag, borderRadius: 10, padding: 4 }}>
              {[{ k: 'login', l: t('auth.signin') }, { k: 'signup', l: t('auth.signup') }].map(tab => (
                <button key={tab.k} onClick={() => setMode(tab.k)}
                  style={{ flex: 1, background: mode === tab.k ? C.orange : 'none', color: mode === tab.k ? '#fff' : C.muted, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: mode === tab.k ? 600 : 400, fontFamily: "'Outfit',sans-serif", transition: 'all .2s' }}>
                  {tab.l}
                </button>
              ))}
            </div>
          )}

          {mode === 'reset' && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, fontFamily: "'Outfit',sans-serif", marginBottom: 12, padding: 0 }}>{t('auth.back')}</button>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: C.cream, fontWeight: 700 }}>{t('auth.reset_title')}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{t('auth.reset_hint')}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('auth.name')}</div>
                {inp('name', 'text', t('auth.name_ph'))}
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('auth.email')}</div>
              {inp('email', 'email', t('auth.email_ph'))}
            </div>
            {mode !== 'reset' && (
              <div>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{t('auth.password')}</div>
                {inp('password', 'password', '••••••••')}
              </div>
            )}
          </div>

          <button onClick={handle} disabled={loading}
            style={{ marginTop: 24, width: '100%', background: loading ? C.tag : 'linear-gradient(135deg,'+C.orange+','+C.orangeLt+')', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontFamily: "'Outfit',sans-serif", boxShadow: '0 4px 20px '+C.orange+'44', transition: 'all .2s' }}>
            {btnLabel()}
          </button>

          {mode === 'login' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>{t('auth.forgot')}</button>
              <p style={{ margin: 0, fontSize: 12, color: C.dim }}>
                {t('auth.no_account')}{' '}
                <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: C.orangeLt, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>{t('auth.signup_free')}</button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: C.dim }}>
              {t('auth.has_account')}{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.orangeLt, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>{t('auth.signin')}</button>
            </p>
          )}
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: C.dim, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {t('auth.terms')}
        </p>
      </div>
    </div>
  );
}

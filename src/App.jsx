// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './lib/store';
import { supabase, getUserProfiles, onAuthChange } from './lib/supabase';

import AuthPage    from './pages/AuthPage';
import OnboardPage from './pages/OnboardPage';
import Dashboard   from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import ArtistPage  from './pages/ArtistPage';

const GF = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');`;

function RequireAuth({ children }) {
  const { session, profile, user } = useStore();
  if (!session) return <Navigate to="/auth" replace />;
  if (session && !user) return <div style={{background:'#140c00',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#f0d8a8'}}>Chargement...</div>;
  if (!profile) return <Navigate to="/onboard" replace />;
  return children;
}

function RequireNoAuth({ children }) {
  const { session, profile } = useStore();
  if (session && profile) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { setSession, setUser, setProfile, setUserProfiles, clearAuth } = useStore();

const loadUserProfiles = async (user) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const profiles = await getUserProfiles(user.id);
  setUserProfiles(profiles);
  if (profiles.length > 0) {
    setProfile(profiles[0]);
  } else {
    setProfile(null);
  }
};
  useEffect(() => {
    // Inject Google Fonts
    const style = document.createElement('style');
    style.textContent = GF;
    document.head.appendChild(style);

    // onAuthStateChange fires INITIAL_SESSION on load — no need for a separate getSession() call
    const sub = onAuthChange(async (event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        await loadUserProfiles(session.user);
      } else {
        clearAuth();
        // Wipe persisted store so stale profile IDs don't survive account deletion
        localStorage.removeItem('stagemap-store');
      }
    });

    return () => sub.unsubscribe();
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #140c00; color: #f0d8a8; font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #140c00; }
        ::-webkit-scrollbar-thumb { background: #3d2200; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: #5a3810; }
        select option { background: #271500; color: #f0d8a8; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn .3s ease; }
      `}</style>

      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={
            <RequireNoAuth><AuthPage /></RequireNoAuth>
          } />
          <Route path="/onboard" element={
            <OnboardPage />
          } />
          <Route path="/dashboard" element={
            <RequireAuth><Dashboard /></RequireAuth>
          } />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#271500',
            color: '#f0d8a8',
            border: '1px solid #3d2200',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#3ed870', secondary: '#271500' } },
          error:   { iconTheme: { primary: '#ff5040', secondary: '#271500' } },
        }}
      />
    </>
  );
}

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
realtime: { params: { eventsPerSecond: 2 } },  }
);

// ── Auth helpers ─────────────────────────────────────────────

export const signUp = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const onAuthChange = (cb) => {
  const { data } = supabase.auth.onAuthStateChange(cb);
  return data.subscription;
};

// ── Profile helpers ──────────────────────────────────────────

// Récupère tous les profils d'un utilisateur
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error && error.code !== 'PGRST116') throw error;
  // Retourne le premier profil pour compatibilité
  return data && data.length > 0 ? data[0] : null;
};

// Récupère tous les profils d'un utilisateur
export const getUserProfiles = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const upsertProfile = async (profile) => {
  // Si le profil a un id existant, on le met à jour
  // Sinon on en crée un nouveau
  if (profile.id && !profile._isNew) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...profile, id: undefined })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { _isNew, ...profileData } = profile;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ ...profileData, id: undefined })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const createProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProfile = async (profileId) => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (error) throw error;
};

export const getAllProfiles = async (filters = {}) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      let query = supabase.from('profiles').select('*');
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.search) query = query.or(
        `name.ilike.%${filters.search}%,genre.ilike.%${filters.search}%,region.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`
      );
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) return data;
      attempts++;
      await new Promise(r => setTimeout(r, 500));
    } catch(e) {
      attempts++;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return [];
};

// ── Message helpers ──────────────────────────────────────────

export const getMessages = async (userId) => {
  // Récupère tous les profile IDs de cet utilisateur
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId);
  
  const profileIds = userProfiles ? userProfiles.map(p => p.id) : [userId];
  const allIds = [...new Set([userId, ...profileIds])];
  
  const { data, error } = await supabase
    .from('messages')
.select('*')
    .or(allIds.map(id => `from_id.eq.${id},to_id.eq.${id}`).join(','))
    .order('created_at', { ascending: false });
  
  console.log('getAllProfiles result', data?.length, error);
  if (error) throw error;
  return data || [];
};
export const sendMessage = async (fromId, toId, subject, body, hasInvite = false, inviteId = null) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ from_id: fromId, to_id: toId, subject, body, has_invite: hasInvite, invite_id: inviteId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const markMessageRead = async (messageId) => {
  await supabase.from('messages').update({ read: true }).eq('id', messageId);
};

// ── Chat helpers ─────────────────────────────────────────────

export const getRoomId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const getChatMessages = async (roomId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*, sender:sender_id(id,name,avatar)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const sendChatMessage = async (roomId, senderId, body) => {
  const { data, error } = await supabase
    .from('chats')
    .insert({ room_id: roomId, sender_id: senderId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const subscribeToChatRoom = (roomId, callback) => {
  return supabase
    .channel('chat_' + roomId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chats',
      filter: 'room_id=eq.' + roomId,
    }, callback)
    .subscribe();
};

// ── Invitation helpers ───────────────────────────────────────

export const createInvitation = async (inv) => {
  const { data, error } = await supabase
    .from('invitations')
    .insert(inv)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getMyInvitations = async (userId) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, organizer:organizer_id(id,name,avatar), invitee:invitee_id(id,name,avatar)')
    .or(`organizer_id.eq.${userId},invitee_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const respondToInvitation = async (invId, status, signature = null) => {
  const update = { status };
  if (signature) { update.invitee_signature = signature; update.legal_accepted_by_invitee = true; }
  const { data, error } = await supabase
    .from('invitations')
    .update(update)
    .eq('id', invId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Campaign helpers ─────────────────────────────────────────

export const createCampaign = async (campaign) => {
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaign)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getMyCampaigns = async (userId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// ── Calendar helpers ─────────────────────────────────────────

export const getMyCalendar = async (userId) => {
  const { data, error } = await supabase
    .from('calendar_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date_start', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addCalendarEntry = async (entry) => {
  const { data, error } = await supabase
    .from('calendar_entries')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
};

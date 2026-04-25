// src/lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────
      session: null,
      user: null,
      profile: null,         // profil actif
      userProfiles: [],      // tous les profils du compte
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setUserProfiles: (userProfiles) => set({ userProfiles }),
      switchProfile: (profileId) => set(state => ({
        profile: state.userProfiles.find(p => p.id === profileId) || state.profile,
      })),
      addUserProfile: (profile) => set(state => ({
        userProfiles: [...state.userProfiles, profile],
        profile: profile, // switche vers le nouveau profil
      })),
      updateUserProfile: (profile) => set(state => ({
        userProfiles: state.userProfiles.map(p => p.id === profile.id ? profile : p),
        profile: state.profile?.id === profile.id ? profile : state.profile,
      })),
      removeUserProfile: (profileId) => set(state => {
        const remaining = state.userProfiles.filter(p => p.id !== profileId);
        return {
          userProfiles: remaining,
          profile: state.profile?.id === profileId ? (remaining[0] || null) : state.profile,
        };
      }),
      clearAuth: () => set({ session: null, user: null, profile: null, userProfiles: [] }),

      // ── UI state ──────────────────────────────
      tab: 'map',
      setTab: (tab) => set({ tab }),
      filter: 'all',
      setFilter: (filter) => set({ filter }),
      search: '',
      setSearch: (search) => set({ search }),
      lang: 'fr',
      setLang: (lang) => set({ lang }),

      // ── Profiles cache ────────────────────────
      profiles: [],
      setProfiles: (profiles) => set({ profiles }),
      upsertProfileInList: (profile) => set(state => ({
        profiles: state.profiles.find(p => p.id === profile.id)
          ? state.profiles.map(p => p.id === profile.id ? profile : p)
          : [profile, ...state.profiles],
      })),

      // ── Messages ──────────────────────────────
      messages: [],
      setMessages: (messages) => set({ messages }),
      unreadCount: 0,
      setUnreadCount: (n) => set({ unreadCount: n }),

      // ── Active chat ───────────────────────────
      activeChatProfile: null,
      setActiveChatProfile: (p) => set({ activeChatProfile: p }),

      // ── Invitations ───────────────────────────
      invitations: [],
      setInvitations: (invitations) => set({ invitations }),
      pendingInviteCount: 0,
      setPendingInviteCount: (n) => set({ pendingInviteCount: n }),

      // ── Calendar ──────────────────────────────
      calendarEntries: [],
      setCalendarEntries: (entries) => set({ calendarEntries: entries }),

      // ── Campaigns ─────────────────────────────
      campaigns: [],
      setCampaigns: (campaigns) => set({ campaigns }),

      // ── AI tour plan ──────────────────────────
      tourPlan: null,
      setTourPlan: (plan) => set({ tourPlan: plan }),
    }),
    {
      name: 'stagemap-store',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        userProfiles: state.userProfiles,
        tab: state.tab,
        lang: state.lang,
      }),
    }
  )
);

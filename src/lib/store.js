// src/lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────
      session: null,
      user: null,
      profile: null,
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      clearAuth: () => set({ session: null, user: null, profile: null }),

      // ── UI state ──────────────────────────────
      tab: 'map',
      setTab: (tab) => set({ tab }),
      filter: 'all',
      setFilter: (filter) => set({ filter }),
      search: '',
      setSearch: (search) => set({ search }),

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

      // ── AI tour plan (in-progress) ────────────
      tourPlan: null,
      setTourPlan: (plan) => set({ tourPlan: plan }),
    }),
    {
      name: 'stagemap-store',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        tab: state.tab,
      }),
    }
  )
);

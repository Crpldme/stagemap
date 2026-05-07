# StageMap — Session Handoff
## Work to apply from the salespitchers prototype session

This file was written at the end of a long session where the same features were
prototyped in a separate Next.js project (salespitchers). Everything below must
be re-implemented in StageMap's own conventions:
- React 18 SPA with react-router-dom
- **Inline CSS only** — use the `C` design token object in Dashboard.jsx
- **French UI text** throughout
- JSX only, no TypeScript
- Supabase + real Stripe (already wired) — no fake payment needed
- Single large page files (~1000 lines) — do NOT extract mini-components to
  separate files unless explicitly asked

---

## 1. Featured Carousel — `src/components/FeaturedCarousel.jsx`

### What it is
A horizontal auto-scrolling card carousel that surfaces:
- **Active ad campaigns** (`campaigns` table, `status = 'active'`) as event cards
- **Subscribed artist/venue profiles** (`profiles` table, `subscribed = true`) as profile cards

### Visual tiers (maps to `campaigns.package_id`)
| package_id | border / glow | badge |
|---|---|---|
| `pro` | `C.purple` border + purple glow | `🌍 Tour Pro` |
| `boost` | `C.orange` border + orange glow | `🚀 Event Boost` |
| `local` | `C.amber` border | `📍 Local Spotlight` |
| (profile card) | `C.border` | tier pill only |

### Behaviour
- Auto-scrolls every 3.2 s, pauses on `mouseenter`/`touchstart`
- Prev / Next chevron buttons (disabled at boundaries)
- CSS `overflow-x: auto; scroll-snap-type: x mandatory` on the track div
- Card width: 272px, gap: 16px
- Touch drag works natively via overflow scroll
- Responds to window resize

### Campaign event card layout (272px wide)
```
[Gradient cover 90px — using campaign.genre colour or random from AVATARS palette]
  badge top-left: package pill  |  "HOT" badge top-right if pro
[Body padding 12px]
  artist/venue avatar emoji (32px circle) + name + type pill
  event title (bold, 2-line clamp)
  date (date-fns format 'EEE d MMM') + venue_name
  CTA button: "Voir l'événement →" (pro = orange gradient, boost = amber, local = ghost)
```

### Profile card layout (272px wide)
```
[Gradient cover 72px]
[Avatar emoji 52px overlapping, ring border C.bg]
  name + type pill (Artiste/Lieu/Fan)
  region + genre tags
  bio (2-line clamp, muted)
  "Voir le profil →" ghost button  |  follower/rating row
```

### Where to place it
- In `Dashboard.jsx`, inside the **Découvrir** tab (the `tab === 'discover'` section),
  above the profile grid / map switcher
- Also render it on the public `ProfilePage.jsx` as a
  "Vous aimerez aussi" (You might also like) section at the bottom

### Mock data fallback
When `campaigns` or `profiles` DB returns empty, use the same mock data
that already exists in the Découvrir tab (profiles list). No separate mock array needed.

---

## 2. Demo Login Button — `src/pages/AuthPage.jsx`

### What to add
A single amber/orange highlighted button above the email form:

```
┌─────────────────────────────────────────────────┐
│  ⚡  Essayer la démo — accès instantané         │
└─────────────────────────────────────────────────┘
```

### Logic
```js
const DEMO_EMAIL    = 'demo@stagemap.com';
const DEMO_PASSWORD = 'Demo2026!';

async function handleDemo() {
  setDemoLoading(true);
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
  });
  if (error) {
    // First time: create the account, then sign in
    await supabase.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  }
  // App.jsx onAuthChange handles redirect to /dashboard
  setDemoLoading(false);
}
```

- After sign-in, if no profile exists for this user the app redirects to `/onboard`
  as normal. That's fine — the demo user just fills in a quick profile.
- Optionally pre-seed a demo profile in Supabase with `name:'Demo User', type:'artist'`
  so it skips onboarding entirely.

### Styling (inline, use `C` tokens)
```js
{
  background: C.amber + '18',
  border: '1px solid ' + C.amber + '44',
  color: C.amber,
  borderRadius: 10,
  padding: '11px 0',
  width: '100%',
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  marginBottom: 16,
}
```

---

## 3. Boost/Marketing Options on Event Creation

### Context
StageMap already has `AD_PACKAGES` (local/boost/pro) and a `createCampaign()` call in
`src/lib/supabase.js`. The campaigns are currently created in their own separate tab.

### What to add
When an artist/venue creates an event via the invitation/calendar flow **or** edits
an event, show a **"Promouvoir cet événement"** section at the bottom of the form
with the three package tiles already defined in `AD_PACKAGES`.

Selecting a package should:
1. Store the selected `packageId` in local form state
2. On submit, if `packageId !== null`, call `payForCampaign(packageId, eventData)`
   (already in `src/lib/stripe.js`) — this triggers Stripe checkout
3. If no package selected, just save the event normally

### Visual — 3 tiles in a grid (same pattern as existing `AD_PACKAGES` rendering)
```
[○ Standard — inclus]   [📍 Local Spotlight — 29$]   [🚀 Event Boost — 89$]
```
Selected tile gets `border: 1px solid ${pkg.color}` + `background: ${pkg.color}18`.

### SQL migration needed
Add `boost_level` column to `events` table (for display in carousel):
```sql
-- supabase/migrations/002_boost_level.sql
alter table public.events
  add column if not exists boost_level text
    default 'standard'
    check (boost_level in ('standard', 'local', 'boost', 'pro'));

update public.events set boost_level = 'standard' where boost_level is null;
```
Also add it to the `campaigns` → `events` join when building carousel cards.

---

## 4. Mobile Optimisation

### Problem
Dashboard.jsx uses fixed-width layouts (e.g. sidebar `width:260px`) that break
on 375px iPhone portrait.

### What to fix

**A. Bottom navigation bar for mobile** (screens < 768px)
Add a fixed bottom bar with 5 items inside `Dashboard.jsx` (check `window.innerWidth`
or a `useMobile` hook):
```
Découvrir | Agenda | [+ Créer FAB] | Messages | Profil
```
- FAB centre button: 56px circle, `background: linear-gradient(...)C.orange`, `-mt` to lift it
- On mobile, hide the left sidebar (`display: none` when `isMobile`)
- Bottom bar height: 64px, `position:fixed, bottom:0, left:0, right:0`
- Add `paddingBottom: 80` to the main content area on mobile

**B. Responsive adjustments**
- `AuthPage.jsx`: the two-column layout (left branding + right form) → single column on mobile
  (`flexDirection: isMobile ? 'column' : 'row'`)
- `OnboardPage.jsx`: step progress → horizontal dots (already OK), but ensure padding
  doesn't overflow on small screens (`padding: isMobile ? '20px 16px' : '40px'`)
- `Dashboard.jsx` profile grid: `gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(240px,1fr))'`
- Map view: full-width on mobile, hide sidebar
- Chat panel: full-screen overlay on mobile instead of side panel

**C. `useMobile` hook** (add to `src/lib/store.js` or inline wherever needed)
```js
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
useEffect(() => {
  const fn = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', fn);
  return () => window.removeEventListener('resize', fn);
}, []);
```

---

## 5. Build Fix (already done in salespitchers, check if needed here)

StageMap uses `react-scripts` (CRA), not Next.js. No Tailwind config to fix.
Run `npm run build` to check for errors before starting work.

---

## Priority order
1. **Demo button** — 20 min, unblocks testing everything else
2. **Mobile bottom nav** — 1h, biggest UX win
3. **Featured Carousel** — 2h, main visual feature
4. **Boost options on event form** — 1h, ties campaigns to event creation
5. **Mobile responsive polish** — 1h, cleanup pass

---

## Key files to read before starting
- `src/pages/Dashboard.jsx` — understand the tab structure and `C` tokens
- `src/pages/AuthPage.jsx` — where to add demo button
- `src/lib/supabase.js` — all DB helpers (use existing functions, don't duplicate)
- `src/lib/stripe.js` — `payForCampaign()` already handles Stripe checkout
- `supabase/migrations/001_schema.sql` — DB schema reference

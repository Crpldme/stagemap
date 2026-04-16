# StageMap — Guide d'installation complet
**Version production · Avril 2026**

---

## Architecture complète

```
Frontend React  →  Supabase (Auth + DB + Realtime)
                →  Anthropic Claude (IA Tournée)
                →  Stripe (Paiements + Abonnements)
                →  Mapbox (Carte interactive — optionnel)
```

---

## ÉTAPE 1 — Supabase (base de données + auth)

### 1.1 Créer le projet
1. Aller sur **supabase.com** → New Project
2. Choisir une région proche (ex: `ca-central-1` pour Canada, `eu-west-1` pour France)
3. Noter l'URL et la clé `anon` (Settings → API)

### 1.2 Créer le schéma
1. Dans Supabase → SQL Editor
2. Copier-coller tout le contenu de `supabase/migrations/001_schema.sql`
3. Cliquer **Run**

### 1.3 Activer l'auth email
- Authentication → Settings → Email Auth → Activé
- (Optionnel) Désactiver "Confirm email" pour les tests

### 1.4 Variables d'environnement
```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

---

## ÉTAPE 2 — Anthropic API

1. Aller sur **console.anthropic.com**
2. API Keys → Create Key
3. ```
   REACT_APP_ANTHROPIC_KEY=sk-ant-api03-...
   ```

**Coût estimé :** ~$0.003/requête · 1000 requêtes/mois ≈ 3$/mois

---

## ÉTAPE 3 — Stripe (paiements)

### 3.1 Compte Stripe
1. Aller sur **dashboard.stripe.com**
2. Compléter le KYC (vérification identité)
3. Récupérer les clés API (Developers → API Keys)

### 3.2 Créer les produits
Dans Stripe Dashboard → Products → Add Product :

| Produit | Prix | Type | Variable env |
|---------|------|------|-------------|
| Abonnement Mensuel | 19.00 CAD | Récurrent mensuel | `REACT_APP_STRIPE_PRICE_MONTHLY` |
| Abonnement Annuel | 149.00 CAD | Récurrent annuel | `REACT_APP_STRIPE_PRICE_ANNUAL` |
| Local Spotlight | 29.00 CAD | Unique | `REACT_APP_STRIPE_PRICE_LOCAL` |
| Event Boost | 89.00 CAD | Unique | `REACT_APP_STRIPE_PRICE_BOOST` |
| Tour Pro | 249.00 CAD | Unique | `REACT_APP_STRIPE_PRICE_PRO` |

### 3.3 Déployer les Edge Functions Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_REF

# Définir les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ANNUAL=price_...

# Déployer les fonctions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 3.4 Configurer le webhook Stripe
Dans Stripe Dashboard → Developers → Webhooks → Add endpoint :
- URL : `https://VOTRE_PROJECT.supabase.co/functions/v1/stripe-webhook`
- Événements : `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`

```
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
```

---

## ÉTAPE 4 — Mapbox (carte interactive avancée)

> *Optionnel — la carte vectorielle de base fonctionne sans Mapbox*

1. Compte sur **mapbox.com** → Tokens → Create Token
2. ```
   REACT_APP_MAPBOX_TOKEN=pk.eyJ1...
   ```

---

## ÉTAPE 5 — Déploiement

### Option A — Vercel (recommandé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Dans le dossier du projet
vercel

# Ou via GitHub : vercel.com → Import → Repo
```

Variables d'environnement à ajouter dans Vercel Dashboard :
- Toutes les variables du fichier `.env.example`

### Option B — Netlify

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=build
```

### Build local (test avant deploy)

```bash
cd stagemap-full
npm install
cp .env.example .env.local
# Remplir .env.local avec vos clés
npm run build
npm start  # development
```

---

## ÉTAPE 6 — Domaine personnalisé

### Vercel
- Settings → Domains → Add Domain
- Pointer le DNS : `CNAME @ cname.vercel-dns.com`

### Netlify  
- Domain Settings → Add custom domain
- SSL automatique (Let's Encrypt)

---

## Structure des fichiers

```
stagemap-full/
├── src/
│   ├── App.jsx                 ← Routeur principal + auth listener
│   ├── index.js                ← Entry point React
│   ├── lib/
│   │   ├── supabase.js         ← Client + tous les helpers DB
│   │   ├── store.js            ← État global (Zustand)
│   │   ├── stripe.js           ← Helpers paiement
│   │   └── ai.js               ← Anthropic API calls
│   └── pages/
│       ├── AuthPage.jsx        ← Login / Inscription
│       ├── OnboardPage.jsx     ← Création de profil (3 étapes)
│       └── Dashboard.jsx       ← App principale (tous les onglets)
├── public/
│   └── index.html
├── supabase/
│   ├── migrations/
│   │   └── 001_schema.sql      ← Schéma complet de la DB
│   └── functions/
│       ├── create-checkout-session/index.ts
│       └── stripe-webhook/index.ts
├── .env.example                ← Template des variables
├── package.json
├── vercel.json
└── netlify.toml
```

---

## Fonctionnalités production incluses

| Module | Technologie | Statut |
|--------|-------------|--------|
| Auth email (inscription/connexion) | Supabase Auth | ✅ |
| Profils persistants en DB | Supabase Postgres | ✅ |
| Carte avec vrais profils | CSS map (Mapbox optionnel) | ✅ |
| Répertoire searchable | Supabase full-text | ✅ |
| Chat temps réel | Supabase Realtime | ✅ |
| Messagerie inbox | Supabase Postgres | ✅ |
| Invitations de tournée | Supabase Postgres | ✅ |
| Contrat légal simplifié | In-app | ✅ |
| Calendrier partageable | Supabase Postgres | ✅ |
| IA Tournée (search + plan) | Anthropic Claude | ✅ |
| Abonnement mensuel/annuel | Stripe Subscriptions | ✅ |
| Paiement campagnes pub | Stripe Payments | ✅ |
| Webhook Stripe → DB | Supabase Edge Functions | ✅ |
| État global persistant | Zustand + localStorage | ✅ |
| Routing SPA | React Router v6 | ✅ |
| Notifications toast | react-hot-toast | ✅ |

---

## Coûts mensuels estimés (500 users)

| Service | Plan | Coût |
|---------|------|------|
| Vercel / Netlify | Free → Pro $20 | $0–20 |
| Supabase | Free → Pro $25 | $0–25 |
| Anthropic API | Pay-per-use | ~$5–30 |
| Stripe | 2.9% + $0.30/transaction | Variable |
| Mapbox | Free 50K loads/mois | $0 |
| **Total** | | **~$5–75/mois** |

**Revenus à 500 abonnés : $9 500 CA/mois**

---

## Support

Pour toute question sur l'installation :
- Supabase docs : docs.supabase.com
- Stripe docs : stripe.com/docs
- Anthropic docs : docs.anthropic.com
- Vercel docs : vercel.com/docs

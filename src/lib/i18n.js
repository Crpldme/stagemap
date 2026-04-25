// src/lib/i18n.js
import { useStore } from './store';

const T = {
  fr: {
    // ── Navigation ──────────────────────
    'nav.map':       'Carte',
    'nav.directory': 'Répertoire',
    'nav.ai':        'IA Tournée',
    'nav.inbox':     'Messages',
    'nav.calendar':  'Agenda',
    'nav.promo':     'Promotion',
    'nav.profile':   'Profil',

    // ── Type labels ──────────────────────
    'type.artist': 'Artiste',
    'type.venue':  'Lieu',
    'type.fan':    'Fan',

    // ── Common buttons ───────────────────
    'btn.save':        'Sauvegarder',
    'btn.cancel':      'Annuler',
    'btn.edit':        '✏️ Modifier',
    'btn.delete':      'Supprimer',
    'btn.back':        '← Retour',
    'btn.share':       '🔗 Partager',
    'btn.copy':        'Copier',
    'btn.preview':     'Aperçu →',
    'btn.add_profile': '＋ Ajouter un profil',
    'btn.logout':      'Déconnexion',
    'btn.join':        'Rejoindre StageMap →',

    // ── Filters ──────────────────────────
    'filter.all':    'Tous',
    'filter.events': '📅 Événements',

    // ── Profile switcher ─────────────────
    'switcher.my_profiles': 'Mes profils',
    'switcher.add':         '＋ Ajouter un profil',
    'switcher.logout':      '↩ Déconnexion',

    // ── Map ──────────────────────────────
    'map.you':             'Vous',
    'map.active':          '✦ Votre profil actif',
    'map.profiles_count':  '{n} profils sur la carte',
    'map.upcoming_events': '📅 Événements à venir',
    'map.click_profile':   'Cliquer pour voir le profil',

    // ── Status ───────────────────────────
    'status.available':         'Disponible',
    'status.available_booking': 'Disponible pour booking',
    'status.verified':          '✓ Vérifié',
    'status.subscribed':        '✦ Abonné',

    // ── Profile modal ────────────────────
    'modal.active':    '✦ Votre profil actif',
    'modal.see':       'Voir profil',
    'modal.public':    '🌐 Page',
    'modal.my_public': '🌐 Voir ma page publique',
    'modal.invite':    '🗺️ Inviter',
    'modal.chat':      '💬 Chat',
    'modal.message':   '✉️ Message',
    'modal.public_event': 'Événement public',
    'modal.see_event':   'Voir événement',

    // ── My Profile tab ───────────────────
    'me.title':            'Mon Profil',
    'me.public_page':      '🌐 Page publique',
    'me.info':             'Informations du profil',
    'me.avatar':           'Avatar',
    'me.artist_name':      'Nom artistique',
    'me.genre':            'Genre',
    'me.bio':              'Biographie',
    'me.fee':              'Cachet / Tarif (ex: 500$, sur devis…)',
    'me.links':            'Liens médias & réseaux (YouTube, Spotify, Instagram… séparés par virgule)',
    'me.region':           'Région',
    'me.country':          'Pays',
    'me.available':        'Disponible pour booking',
    'me.save':             '💾 Sauvegarder les modifications',
    'me.saved':            '✓ Sauvegardé',
    'me.vis_title':        'Visibilité de la page publique',
    'me.vis_desc':         'Choisissez ce que les visiteurs voient sur votre page',
    'me.vis_on':           'Visible',
    'me.vis_off':          'Masqué',
    'me.vis_note':         "ℹ️ Nom, avatar et type de profil sont toujours visibles. Sauvegardez le profil après avoir modifié la visibilité.",
    'me.other_profiles':   'Mes autres profils',
    'me.subscribe':        "✦ Activer l'abonnement",
    'me.subscribe_desc':   "Booking illimité · Streaming · Messagerie pro · IA Tournée · 1 boost publicitaire/mois",
    'me.monthly':          '19$/mois',
    'me.annual':           '149$/an (−22%)',
    'me.visible_on_map':   'visible sur la carte',
    'me.visible_map_full': '✦ Votre profil est <b>visible sur la carte</b> et dans le répertoire.',

    // ── Visibility field labels ───────────
    'vis.bio':       'Biographie',
    'vis.fee':       'Tarif / Cachet',
    'vis.links':     'Liens & Médias',
    'vis.genre':     'Genre musical',
    'vis.region':    'Région & Pays',
    'vis.available': 'Statut disponible',
    'vis.events':    'Événements à venir',

    // ── Public profile page ───────────────
    'pub.back':      '← Retour',
    'pub.share':     '🔗 Partager',
    'pub.media':     'Musique & Médias',
    'pub.links':     'Liens',
    'pub.events':    'Événements à venir',
    'pub.join':      'Rejoindre StageMap →',
    'pub.profile_on': 'Profil sur',
    'pub.not_found': 'Profil introuvable',

    // ── Event detail (public page) ────────
    'ev.public':  '📅 Événement public',
    'ev.by':      'par',
    'ev.book':    'Rejoindre StageMap pour réserver →',
    'ev.copy':    "📋 Copier l'annonce",
    'ev.copied':  '✓ Annonce copiée !',

    // ── Share modal ───────────────────────
    'share.title':   "📢 Partager l'événement",
    'share.desc':    'Copiez cette annonce et collez-la sur vos réseaux, ou cliquez un bouton pour partager directement.',
    'share.copy':    "📋 Copier l'annonce",
    'share.copied':  '✓ Annonce copiée !',
    'share.btn':     '📢 Partager',
    'share.ig_note': 'Instagram et TikTok ne supportent pas le partage direct — utilisez "Copier" puis collez dans votre publication.',

    // ── Inbox ────────────────────────────
    'inbox.pending':     'invitation(s) en attente',
    'inbox.accept':      '✓ Accepter',
    'inbox.decline':     '✕ Décliner',
    'inbox.reply_chat':  '💬 Répondre par chat',
    'inbox.from':        'De :',

    // ── Calendar: arrays ─────────────────
    'cal.months': ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    'cal.days':   ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],

    // ── Calendar: strings ────────────────
    'cal.today':          "Aujourd'hui",
    'cal.new':            '+ Nouveau',
    'cal.month_view':     '📅 Mois',
    'cal.list_view':      '📋 Liste',
    'cal.compare':        '👥 Comparer',
    'cal.share_profile':  '🔗 Partager mon profil public',
    'cal.all':            'Tous',
    'cal.avail':          '🟢 Disponibilité',
    'cal.event':          '🎵 Événement',
    'cal.booking':        '📋 Booking',
    'cal.personal':       '🔒 Personnel',
    'cal.visible_to_all': '⚠️ Visible par tous les utilisateurs de StageMap',
    'cal.loading':        'Chargement…',
    'cal.no_events':      'Aucun événement ce mois',
    'cal.shared_lbl':     '🔗 Partagé',
    'cal.private_lbl':    '🔒 Privé',
    'cal.public_lbl':     '🌐 Public',
    'cal.others':         '+{n} autres',
    'cal.recurrence_none':     'Aucune',
    'cal.recurrence_weekly':   'Chaque semaine',
    'cal.recurrence_biweekly': 'Toutes les 2 semaines',
    'cal.recurrence_monthly':  'Chaque mois',

    // ── Event form ────────────────────────
    'evf.new':            'Nouvel événement',
    'evf.edit':           "Modifier l'événement",
    'evf.title':          'Titre',
    'evf.desc':           'Description (optionnel)',
    'evf.type':           'Type',
    'evf.date_start':     'Date de début',
    'evf.date_end':       'Date de fin',
    'evf.time_start':     'Heure début',
    'evf.time_end':       'Heure fin',
    'evf.location':       'Lieu / Adresse',
    'evf.visibility':     'Visibilité',
    'evf.recurrence':     'Récurrence',
    'evf.notify':         '📧 Notifier par courriel',
    'evf.vis_private':    'Privé (vous seul)',
    'evf.vis_shared':     'Partagé (comparaisons)',
    'evf.vis_public':     'Public (agenda StageMap)',
    'evf.public_warn':    '⚠️ Cet événement sera visible publiquement sur votre page et sur la carte StageMap.',
    'evf.confirm_public': '⚠️ Je confirme que cet événement sera visible par tous les utilisateurs de StageMap',
    'evf.save':           '💾 Enregistrer',
    'evf.delete':         '🗑 Supprimer',

    // ── Availability comparison ───────────
    'cmp.free_slot':   'Vous êtes tous les deux disponibles. Envoyez une invitation à {name} !',
    'cmp.send_invite': '🗺️ Envoyer une invitation',
    'cmp.cancel':      'Annuler',

    // ── AI Panel ─────────────────────────
    'ai.search_tab':  'Recherche',
    'ai.tour_tab':    'Tournée',
    'ai.placeholder': 'Ex: artiste jazz disponible à Montréal en juillet...',
    'ai.searching':   'Recherche en cours...',
    'ai.send':        'Envoyer',
    'ai.no_match':    'Aucun profil correspondant.',
    'ai.tour_ready':  '🗺️ Plan de tournée généré',
    'ai.launch':      '🚀 Envoyer les invitations',

    // ── Promo ────────────────────────────
    'promo.reach':  'Portée estimée',
    'promo.choose': 'Choisir ce pack',
    'promo.pay':    '💳 Payer et lancer la campagne',

    // ── Upgrade modal ────────────────────
    'upg.fan_title':     'Section réservée aux professionnels',
    'upg.prem_title':    'Fonctionnalité Premium',
    'upg.fan_desc':      "Cette section est réservée aux artistes et lieux. Créez un profil Artiste ou Lieu pour accéder à l'IA Tournée, l'agenda et les campagnes.",
    'upg.prem_desc':     "Abonnez-vous pour débloquer l'IA Tournée, l'agenda complet, la comparaison de disponibilités et les campagnes publicitaires.",
    'upg.understood':    'Compris',
    'upg.not_now':       'Pas maintenant',

    // ── Auth ─────────────────────────────
    'auth.signin':       'Se connecter',
    'auth.signup':       "S'inscrire",
    'auth.forgot':       '🔑 Mot de passe oublié ?',
    'auth.reset_title':  'Récupérer mon mot de passe',
    'auth.reset_hint':   'Un lien vous sera envoyé par email.',
    'auth.email':        'Email',
    'auth.password':     'Mot de passe',
    'auth.name':         'Nom artistique / Nom du lieu',
    'auth.name_ph':      'Ex: Léa Fontaine · Le Café Scène',
    'auth.email_ph':     'vous@email.com',
    'auth.btn_login':    'Se connecter →',
    'auth.btn_signup':   'Créer mon compte →',
    'auth.btn_reset':    'Envoyer le lien →',
    'auth.btn_loading':  '⏳ Chargement...',
    'auth.back':         '← Retour',
    'auth.no_account':   "Pas encore de compte ?",
    'auth.signup_free':  "S'inscrire gratuitement",
    'auth.has_account':  'Déjà un compte ?',
    'auth.tagline':      'Réseau Scène Global',
    'auth.terms':        "En vous inscrivant vous acceptez nos conditions d'utilisation.\nDonnées sécurisées · Aucune pub sans votre consentement.",

    // ── Onboard ──────────────────────────
    'ob.title':       'Créer votre profil',
    'ob.step':        'Étape {n}/3',
    'ob.type_title':  'Quel type de profil ?',
    'ob.artist_desc': 'Musicien·ne, groupe, performer',
    'ob.venue_desc':  'Salle, festival, club, espace culturel',
    'ob.fan_desc':    'Suivre les artistes et événements',
    'ob.create':      'Créer mon profil',
    'ob.next':        'Continuer →',
    'ob.saving':      'Création...',

    // ── Footer / general ─────────────────
    'footer.copy':     '© 2026 StageMap — Réseau Scène Global',
    'footer.count':    '{n} profils enregistrés',
    'loading':         'Chargement...',
    'no_profiles':     'Aucun profil trouvé',
    'profiles_n':      '{n} profils',
    'events_n':        '{n} événement{s}',
    'link_copied':     'Lien copié !',
    'post_copied':     'Annonce copiée !',
    'profile_updated': 'Profil mis à jour ✓',
    'profile_changed': 'Profil changé ✓',
    'event_added':     'Événement ajouté ✓',
    'event_updated':   'Événement mis à jour ✓',
    'event_deleted':   'Événement supprimé',
    'confirm_delete':  'Supprimer cet événement ?',
    'invites_sent':    '{n} invitation(s) envoyée(s) !',

    // ── Extra dashboard strings ───────────
    'nav.tagline':        'Réseau Scène Global',
    'header.search_ph':   '🔍 Nom, région, genre, pays...',
    'ai.title':           'Recherche et Planification IA',
    'ai.subtitle':        "Décrivez en langage naturel — l'IA cherche parmi les {n} vrais profils",
    'promo.title':        'Promotion et Publicité',
    'promo.subtitle':     'Diffusez vos événements sur StageMap + plateformes externes',
    'chat.online':        'En ligne',
    'btn.close':          'Fermer',
    'inbox.empty':        'Aucun message',
    'inbox.select':       'Sélectionnez un message',
    'events_public_empty':'Aucun événement public à venir',
    'status.dispo':       'Dispo',
    'events_filter_count':'{n} événement{s}',

    // ── Calendar extras ──────────────────
    'cal.locale':          'fr',
    'cal.day_no_ev':       'Aucun événement ce jour',
    'cal.add_here':        '+ Ajouter ici',
    'cal.compare_title':   'Comparer avec...',
    'cal.compare_ph':      'Chercher un artiste, lieu...',
    'cal.no_profile':      'Aucun profil trouvé',
    'cal.see_agenda':      'Voir agenda →',
    'cal.booking_incoming':'📋 Annonce de booking à venir',
    'cal.booking_private': '🔒 Titre masqué au public — publiez en mode Public pour révéler',
    'cal.public_warn_short':'⚠️ Cet événement est visible par tous les utilisateurs',
    'cal.poster_soon':     "🖼️ Affiche de l'événement · Bientôt disponible",
    'cal.confirm_ev':      '✓ Confirmer comme événement officiel',
    'cmp.title':           'Disponibilités avec {name}',
    'cmp.hint':            'Cliquez sur une plage ✨ commune pour envoyer une invitation',
    'cmp.both_free':       '✨ Tous les deux disponibles — cliquer pour inviter',
    'cmp.them_busy':       '{name} est réservé(e)',
    'cmp.me_busy':         'Vous êtes réservé(e)',
    'cmp.both_busy':       'Tous les deux occupés',
    'cmp.no_avail':        "{name} n'a pas encore partagé sa disponibilité. Invitez-les à créer des entrées «Disponibilité» visibles publiquement.",
    'cmp.slots':           '{n} place(s)',
    'cmp.dispo':           'Dispo',
    'cmp.you_busy':        '🔒 Vous',
    'cmp.x_busy':          '✕ Occupés',
    'evf.title_req':       'Titre requis',
    'evf.date_req':        'Date de début requise',
    'evf.ph_avail':        'Ex: Disponible pour concerts',
    'evf.ph_event':        'Ex: Concert au Café Scène',
    'evf.ph_location':     'Ex: Le Café Scène, Montréal',
    'evf.ph_desc':         'Détails supplémentaires...',
    'evf.btn_add':         '✦ Ajouter',
    'evf.saving':          '⏳',
    'event_confirmed':     'Événement confirmé ✓',
    'cal.availability':    '🟢 Disponibilité',
  },

  en: {
    // ── Navigation ──────────────────────
    'nav.map':       'Map',
    'nav.directory': 'Directory',
    'nav.ai':        'AI Tour',
    'nav.inbox':     'Messages',
    'nav.calendar':  'Calendar',
    'nav.promo':     'Promotion',
    'nav.profile':   'Profile',

    // ── Type labels ──────────────────────
    'type.artist': 'Artist',
    'type.venue':  'Venue',
    'type.fan':    'Fan',

    // ── Common buttons ───────────────────
    'btn.save':        'Save',
    'btn.cancel':      'Cancel',
    'btn.edit':        '✏️ Edit',
    'btn.delete':      'Delete',
    'btn.back':        '← Back',
    'btn.share':       '🔗 Share',
    'btn.copy':        'Copy',
    'btn.preview':     'Preview →',
    'btn.add_profile': '＋ Add a profile',
    'btn.logout':      'Log out',
    'btn.join':        'Join StageMap →',

    // ── Filters ──────────────────────────
    'filter.all':    'All',
    'filter.events': '📅 Events',

    // ── Profile switcher ─────────────────
    'switcher.my_profiles': 'My profiles',
    'switcher.add':         '＋ Add a profile',
    'switcher.logout':      '↩ Log out',

    // ── Map ──────────────────────────────
    'map.you':             'You',
    'map.active':          '✦ Your active profile',
    'map.profiles_count':  '{n} profiles on the map',
    'map.upcoming_events': '📅 Upcoming events',
    'map.click_profile':   'Click to view profile',

    // ── Status ───────────────────────────
    'status.available':         'Available',
    'status.available_booking': 'Available for booking',
    'status.verified':          '✓ Verified',
    'status.subscribed':        '✦ Subscribed',

    // ── Profile modal ────────────────────
    'modal.active':    '✦ Your active profile',
    'modal.see':       'View profile',
    'modal.public':    '🌐 Page',
    'modal.my_public': '🌐 View my public page',
    'modal.invite':    '🗺️ Invite',
    'modal.chat':      '💬 Chat',
    'modal.message':   '✉️ Message',
    'modal.public_event': 'Public event',
    'modal.see_event':   'View event',

    // ── My Profile tab ───────────────────
    'me.title':            'My Profile',
    'me.public_page':      '🌐 Public page',
    'me.info':             'Profile information',
    'me.avatar':           'Avatar',
    'me.artist_name':      'Artist name',
    'me.genre':            'Genre',
    'me.bio':              'Biography',
    'me.fee':              'Fee / Rate (e.g. $500, quote on request…)',
    'me.links':            'Media & social links (YouTube, Spotify, Instagram… comma-separated)',
    'me.region':           'Region',
    'me.country':          'Country',
    'me.available':        'Available for booking',
    'me.save':             '💾 Save changes',
    'me.saved':            '✓ Saved',
    'me.vis_title':        'Public page visibility',
    'me.vis_desc':         'Choose what visitors see on your page',
    'me.vis_on':           'Visible',
    'me.vis_off':          'Hidden',
    'me.vis_note':         "ℹ️ Name, avatar and profile type are always visible. Save the profile after changing visibility.",
    'me.other_profiles':   'My other profiles',
    'me.subscribe':        '✦ Activate subscription',
    'me.subscribe_desc':   'Unlimited booking · Streaming · Pro messaging · AI Tour · 1 ad boost/month',
    'me.monthly':          '$19/month',
    'me.annual':           '$149/year (−22%)',
    'me.visible_on_map':   'visible on the map',
    'me.visible_map_full': '✦ Your profile is <b>visible on the map</b> and in the directory.',

    // ── Visibility field labels ───────────
    'vis.bio':       'Biography',
    'vis.fee':       'Fee / Rate',
    'vis.links':     'Links & Media',
    'vis.genre':     'Musical genre',
    'vis.region':    'Region & Country',
    'vis.available': 'Availability status',
    'vis.events':    'Upcoming events',

    // ── Public profile page ───────────────
    'pub.back':      '← Back',
    'pub.share':     '🔗 Share',
    'pub.media':     'Music & Media',
    'pub.links':     'Links',
    'pub.events':    'Upcoming events',
    'pub.join':      'Join StageMap →',
    'pub.profile_on': 'Profile on',
    'pub.not_found': 'Profile not found',

    // ── Event detail (public page) ────────
    'ev.public':  '📅 Public event',
    'ev.by':      'by',
    'ev.book':    'Join StageMap to book →',
    'ev.copy':    '📋 Copy announcement',
    'ev.copied':  '✓ Announcement copied!',

    // ── Share modal ───────────────────────
    'share.title':   '📢 Share event',
    'share.desc':    'Copy this announcement and paste it on your social networks, or click a button to share directly.',
    'share.copy':    '📋 Copy announcement',
    'share.copied':  '✓ Announcement copied!',
    'share.btn':     '📢 Share',
    'share.ig_note': 'Instagram and TikTok do not support direct sharing — use "Copy" and paste in your post.',

    // ── Inbox ────────────────────────────
    'inbox.pending':    'invitation(s) pending',
    'inbox.accept':     '✓ Accept',
    'inbox.decline':    '✕ Decline',
    'inbox.reply_chat': '💬 Reply via chat',
    'inbox.from':       'From:',

    // ── Calendar: arrays ─────────────────
    'cal.months': ['January','February','March','April','May','June','July','August','September','October','November','December'],
    'cal.days':   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],

    // ── Calendar: strings ────────────────
    'cal.today':          'Today',
    'cal.new':            '+ New',
    'cal.month_view':     '📅 Month',
    'cal.list_view':      '📋 List',
    'cal.compare':        '👥 Compare',
    'cal.share_profile':  '🔗 Share my public profile',
    'cal.all':            'All',
    'cal.avail':          '🟢 Availability',
    'cal.event':          '🎵 Event',
    'cal.booking':        '📋 Booking',
    'cal.personal':       '🔒 Personal',
    'cal.visible_to_all': '⚠️ Visible to all StageMap users',
    'cal.loading':        'Loading…',
    'cal.no_events':      'No events this month',
    'cal.shared_lbl':     '🔗 Shared',
    'cal.private_lbl':    '🔒 Private',
    'cal.public_lbl':     '🌐 Public',
    'cal.others':         '+{n} more',
    'cal.recurrence_none':     'None',
    'cal.recurrence_weekly':   'Every week',
    'cal.recurrence_biweekly': 'Every 2 weeks',
    'cal.recurrence_monthly':  'Every month',

    // ── Event form ────────────────────────
    'evf.new':            'New event',
    'evf.edit':           'Edit event',
    'evf.title':          'Title',
    'evf.desc':           'Description (optional)',
    'evf.type':           'Type',
    'evf.date_start':     'Start date',
    'evf.date_end':       'End date',
    'evf.time_start':     'Start time',
    'evf.time_end':       'End time',
    'evf.location':       'Venue / Address',
    'evf.visibility':     'Visibility',
    'evf.recurrence':     'Recurrence',
    'evf.notify':         '📧 Email notification',
    'evf.vis_private':    'Private (you only)',
    'evf.vis_shared':     'Shared (comparisons)',
    'evf.vis_public':     'Public (StageMap calendar)',
    'evf.public_warn':    '⚠️ This event will be publicly visible on your profile page and on the StageMap map.',
    'evf.confirm_public': '⚠️ I confirm this event will be visible to all StageMap users',
    'evf.save':           '💾 Save',
    'evf.delete':         '🗑 Delete',

    // ── Availability comparison ───────────
    'cmp.free_slot':   'You are both available. Send an invitation to {name}!',
    'cmp.send_invite': '🗺️ Send an invitation',
    'cmp.cancel':      'Cancel',

    // ── AI Panel ─────────────────────────
    'ai.search_tab':  'Search',
    'ai.tour_tab':    'Tour',
    'ai.placeholder': 'E.g. jazz artist available in Montreal in July...',
    'ai.searching':   'Searching...',
    'ai.send':        'Send',
    'ai.no_match':    'No matching profiles.',
    'ai.tour_ready':  '🗺️ Tour plan generated',
    'ai.launch':      '🚀 Send invitations',

    // ── Promo ────────────────────────────
    'promo.reach':  'Estimated reach',
    'promo.choose': 'Choose this pack',
    'promo.pay':    '💳 Pay and launch campaign',

    // ── Upgrade modal ────────────────────
    'upg.fan_title':  'Section for professionals only',
    'upg.prem_title': 'Premium Feature',
    'upg.fan_desc':   'This section is reserved for artists and venues. Create an Artist or Venue profile to access AI Tour, calendar and campaigns.',
    'upg.prem_desc':  'Subscribe to unlock AI Tour, full calendar, availability comparison and advertising campaigns.',
    'upg.understood': 'Got it',
    'upg.not_now':    'Not now',

    // ── Auth ─────────────────────────────
    'auth.signin':      'Sign in',
    'auth.signup':      'Sign up',
    'auth.forgot':      '🔑 Forgot password?',
    'auth.reset_title': 'Reset my password',
    'auth.reset_hint':  'A recovery link will be sent to your email.',
    'auth.email':       'Email',
    'auth.password':    'Password',
    'auth.name':        'Artist name / Venue name',
    'auth.name_ph':     'E.g. Léa Fontaine · Le Café Scène',
    'auth.email_ph':    'you@email.com',
    'auth.btn_login':   'Sign in →',
    'auth.btn_signup':  'Create my account →',
    'auth.btn_reset':   'Send link →',
    'auth.btn_loading': '⏳ Loading...',
    'auth.back':        '← Back',
    'auth.no_account':  "Don't have an account?",
    'auth.signup_free': 'Sign up free',
    'auth.has_account': 'Already have an account?',
    'auth.tagline':     'Global Stage Network',
    'auth.terms':       "By signing up you agree to our terms of use.\nSecure data · No ads without your consent.",

    // ── Onboard ──────────────────────────
    'ob.title':       'Create your profile',
    'ob.step':        'Step {n}/3',
    'ob.type_title':  'What type of profile?',
    'ob.artist_desc': 'Musician, band, performer',
    'ob.venue_desc':  'Hall, festival, club, cultural space',
    'ob.fan_desc':    'Follow artists and events',
    'ob.create':      'Create my profile',
    'ob.next':        'Continue →',
    'ob.saving':      'Creating...',

    // ── Footer / general ─────────────────
    'footer.copy':     '© 2026 StageMap — Global Stage Network',
    'footer.count':    '{n} profiles registered',
    'loading':         'Loading...',
    'no_profiles':     'No profiles found',
    'profiles_n':      '{n} profiles',
    'events_n':        '{n} event{s}',
    'link_copied':     'Link copied!',
    'post_copied':     'Announcement copied!',
    'profile_updated': 'Profile updated ✓',
    'profile_changed': 'Profile changed ✓',
    'event_added':     'Event added ✓',
    'event_updated':   'Event updated ✓',
    'event_deleted':   'Event deleted',
    'confirm_delete':  'Delete this event?',
    'invites_sent':    '{n} invitation(s) sent!',

    // ── Extra dashboard strings ───────────
    'nav.tagline':        'Global Stage Network',
    'header.search_ph':   '🔍 Name, region, genre, country...',
    'ai.title':           'AI Search & Planning',
    'ai.subtitle':        'Describe in natural language — AI searches across {n} real profiles',
    'promo.title':        'Promotion & Advertising',
    'promo.subtitle':     'Broadcast your events on StageMap + external platforms',
    'chat.online':        'Online',
    'btn.close':          'Close',
    'inbox.empty':        'No messages',
    'inbox.select':       'Select a message',
    'events_public_empty':'No upcoming public events',
    'status.dispo':       'Avail',
    'events_filter_count':'{n} event{s}',

    // ── Calendar extras ──────────────────
    'cal.locale':          'en-US',
    'cal.day_no_ev':       'No events on this day',
    'cal.add_here':        '+ Add here',
    'cal.compare_title':   'Compare with...',
    'cal.compare_ph':      'Search an artist, venue...',
    'cal.no_profile':      'No profiles found',
    'cal.see_agenda':      'See calendar →',
    'cal.booking_incoming':'📋 Booking announcement coming',
    'cal.booking_private': '🔒 Title hidden from public — publish as Public to reveal',
    'cal.public_warn_short':'⚠️ This event is visible to all users',
    'cal.poster_soon':     '🖼️ Event poster · Coming soon',
    'cal.confirm_ev':      '✓ Confirm as official event',
    'cmp.title':           'Availability with {name}',
    'cmp.hint':            'Click on a ✨ common slot to send an invitation',
    'cmp.both_free':       '✨ Both available — click to invite',
    'cmp.them_busy':       '{name} is booked',
    'cmp.me_busy':         'You are booked',
    'cmp.both_busy':       'Both busy',
    'cmp.no_avail':        '{name} has not yet shared their availability. Invite them to create "Availability" entries visible to the public.',
    'cmp.slots':           '{n} slot(s)',
    'cmp.dispo':           'Avail',
    'cmp.you_busy':        '🔒 You',
    'cmp.x_busy':          '✕ Busy',
    'evf.title_req':       'Title required',
    'evf.date_req':        'Start date required',
    'evf.ph_avail':        'E.g. Available for concerts',
    'evf.ph_event':        'E.g. Concert at Café Scène',
    'evf.ph_location':     'E.g. Le Café Scène, Montréal',
    'evf.ph_desc':         'Additional details...',
    'evf.btn_add':         '✦ Add',
    'evf.saving':          '⏳',
    'event_confirmed':     'Event confirmed ✓',
    'cal.availability':    '🟢 Availability',
  },
};

export function useT() {
  const lang = useStore(state => state.lang) || 'fr';
  return (key, vars = {}) => {
    const val = T[lang]?.[key] ?? T.fr[key] ?? key;
    if (Array.isArray(val)) return val;
    if (typeof val !== 'string') return String(key);
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val);
  };
}

// Standalone (non-hook) for use outside React — reads current store state
export function tStatic(key, vars = {}) {
  const { useStore: _useStore } = require('./store');
  const lang = _useStore.getState().lang || 'fr';
  const val = T[lang]?.[key] ?? T.fr[key] ?? key;
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return String(key);
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val);
}

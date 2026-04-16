// src/lib/ai.js
// Calls Anthropic API directly from browser (Claude claude-sonnet-4-20250514)
// In production consider proxying via Supabase Edge Function for key security

const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

export const runAI = async (systemPrompt, userMessage) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Anthropic API error');
  }
  const data = await res.json();
  const text = data.content?.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(text);
};

export const buildTourPlannerSystem = (profiles) => {
  const profileData = profiles.map(p => ({
    id: p.id, name: p.name, type: p.type, genre: p.genre,
    region: p.region, country: p.country,
    available: p.available, fee: p.fee, rating: p.rating,
  }));

  return `Tu es l'assistant IA de StageMap — plateforme de booking pour artistes et salles de spectacle.

BASE DE DONNÉES RÉELLE (${profiles.length} profils) :
${JSON.stringify(profileData)}

RÈGLES STRICTES :
- Recherche → retourne JSON : {"mode":"search","results":[ids],"summary":"...","tip":"..."}
- Tournée → retourne JSON : {"mode":"tour","title":"...","stops":[{"profileId":"id_string","date":"YYYY-MM-DD","city":"...","role":"headliner|support|venue|special","note":"..."}],"totalDays":N,"summary":"...","legalNote":"...","estimatedBudget":"..."}
- Utilise UNIQUEMENT les IDs de profils présents dans la base
- Réponds en FRANÇAIS exclusivement
- Retourne du JSON valide SANS markdown, SANS backticks
- Prends en compte la disponibilité (available: true/false)
- Tiens compte des régions géographiques pour créer des tournées logistiquement sensées`;
};

export const buildSearchSystem = (profiles) => {
  return buildTourPlannerSystem(profiles);
};

// Rangs, points de rang (PR) et saisons mensuelles. Partagé par le serveur ; l'appli en a une copie.

export const TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0 },
  { id: 'argent', name: 'Argent', min: 100 },
  { id: 'or', name: 'Or', min: 200 },
  { id: 'platine', name: 'Platine', min: 300 },
  { id: 'diamant', name: 'Diamant', min: 400 },
  { id: 'rubis', name: 'Rubis', min: 500 },
  { id: 'emeraude', name: 'Émeraude', min: 600 },
  { id: 'maitre', name: 'Maître', min: 700 },
  { id: 'gm', name: 'Grand Maître', min: 850 },
];

export function tierOf(rp) {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (rp >= TIERS[i].min) t = i;
  return t;
}

// salons publics séparés par niveau : un Bronze ne joue jamais contre un Rubis
export const BRACKET_OF_TIER = [0, 0, 1, 1, 2, 2, 3, 3, 3];
export const TIERS_OF_BRACKET = [[0, 1], [2, 3], [4, 5], [6, 7, 8]];
export const bracketOf = tier => BRACKET_OF_TIER[tier] ?? 0;

// adresse des bots selon le niveau du salon (0 = Bronze-Argent … 3 = Émeraude-Grand Maître)
export const BOT_SKILL = [[0.25, 0.5], [0.4, 0.65], [0.55, 0.8], [0.7, 0.92]];

// gain du 1er / perte du dernier, selon le rang : plus on monte, plus c'est dur
const WIN = [35, 32, 30, 28, 26, 24, 22, 20, 18];
const LOSS = [5, 8, 10, 12, 14, 16, 18, 20, 22];

// rank : place à la fin (1 = premier), n : nombre de joueurs bots compris,
// share : part de la partie jouée (arrivé en cours de route), perfect : tout trouvé
export function rpDelta(tier, rank, n, share = 1, perfect = false) {
  if (n < 2 || share < 0.5) return 0;
  const p = (n - rank) / (n - 1);
  let d = -LOSS[tier] + (WIN[tier] + LOSS[tier]) * p;
  if (perfect) d += 5;
  return Math.round(d * Math.min(1, share));
}

// nouvelle saison : on repart de la moitié, arrondie au palier inférieur
export const softReset = rp => Math.floor(rp / 200) * 100;

// pièces : en atteignant un rang pour la 1re fois de la saison, et en fin de saison selon le meilleur rang
export const PROMO_COINS = tier => 50 * tier;
export const SEASON_COINS = [50, 100, 150, 250, 350, 500, 700, 1000, 1500];

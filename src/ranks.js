// Rangs, points de rang (PR) et saisons mensuelles. Partagé par le serveur ; l'appli en a une copie.

// paliers progressifs : les premiers rangs se passent vite, l'écart grandit à chaque rang
export const TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0 },
  { id: 'argent', name: 'Argent', min: 100 },
  { id: 'or', name: 'Or', min: 250 },
  { id: 'platine', name: 'Platine', min: 450 },
  { id: 'diamant', name: 'Diamant', min: 700 },
  { id: 'rubis', name: 'Rubis', min: 1000 },
  { id: 'emeraude', name: 'Émeraude', min: 1350 },
  { id: 'maitre', name: 'Maître', min: 1750 },
  { id: 'gm', name: 'Grand Maître', min: 2250 },
];

export function tierOf(rp) {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (rp >= TIERS[i].min) t = i;
  return t;
}

// salons publics : chacun joue avec son rang, un rang en dessous ou un rang au-dessus.
// Un salon = 2 rangs voisins (fenêtre 0 = Bronze-Argent, 1 = Argent-Or … 7 = Maître-Grand Maître) ;
// un joueur peut entrer dans les 2 fenêtres qui contiennent son rang, jamais plus d'un rang d'écart dans un salon.
export const WINDOWS = TIERS.length - 1;
export const windowTiers = w => [w, w + 1];
export const windowsOf = tier => [tier - 1, tier].filter(w => w >= 0 && w < WINDOWS);
export const inWindow = (tier, w) => tier === w || tier === w + 1;

// adresse des bots en salon public : de Bronze-Argent à Maître-Grand Maître
export const windowSkill = w => {
  const k = Math.min(1, Math.max(0, w / (WINDOWS - 1)));
  return [0.25 + 0.45 * k, 0.5 + 0.42 * k];
};

// salons privés : l'hôte choisit le niveau des bots (Facile, Moyen, Difficile, Expert), proposé d'après son rang
export const BRACKET_OF_TIER = [0, 0, 1, 1, 2, 2, 3, 3, 3];
export const TIERS_OF_BRACKET = [[0, 1], [2, 3], [4, 5], [6, 7, 8]];
export const bracketOf = tier => BRACKET_OF_TIER[tier] ?? 0;
export const BOT_SKILL = [[0.25, 0.5], [0.4, 0.65], [0.55, 0.8], [0.7, 0.92]];

// points de rang selon la place, pour une partie à 10 joueurs (1er … 10e), selon le rang du joueur :
// le podium gagne beaucoup, les suivants moins, le milieu rien, les deux derniers perdent un peu.
// Plus on monte, moins on gagne ; à partir de Diamant, le milieu perd un peu pour que les hauts rangs restent rares.
export const RP_TABLE = [
  [30, 25, 20, 10, 6, 3, 0, 0, -5, -8],     // Bronze
  [29, 24, 19, 9, 5, 2, 0, 0, -5, -8],      // Argent
  [27, 22, 17, 8, 5, 2, 0, 0, -6, -9],      // Or
  [25, 20, 16, 7, 4, 1, 0, 0, -6, -9],      // Platine
  [24, 19, 15, 7, 3, 1, 0, -1, -7, -10],    // Diamant
  [22, 18, 14, 6, 3, 0, -1, -2, -7, -10],   // Rubis
  [21, 17, 13, 6, 2, 0, -1, -2, -8, -11],   // Émeraude
  [20, 15, 12, 5, 2, 0, -2, -3, -8, -11],   // Maître
  [18, 14, 11, 5, 2, 0, -2, -3, -9, -12],   // Grand Maître
];

// rank : place à la fin (1 = premier), n : nombre de joueurs bots compris,
// share : part de la partie jouée (arrivé en cours de route), perfect : tout trouvé.
// Avec plus ou moins de 10 joueurs, la place est ramenée sur l'échelle de 10 (le 1er et le dernier gardent leurs points).
export function rpDelta(tier, rank, n, share = 1, perfect = false) {
  if (n < 2 || share < 0.5) return 0;
  const row = RP_TABLE[tier] || RP_TABLE[0], last = row.length - 1;
  const x = Math.min(1, Math.max(0, (rank - 1) / (n - 1))) * last, i = Math.min(last - 1, Math.floor(x));
  let d = row[i] + (row[i + 1] - row[i]) * (x - i);
  if (perfect) d += 5;
  return Math.round(d * Math.min(1, share)) || 0;
}

// nouvelle saison : on repart de la moitié, arrondie au palier inférieur
export const softReset = rp => TIERS[tierOf(Math.floor(rp / 2))].min;

// version 1.5 : passage des anciens paliers (100 PR par rang) aux paliers progressifs, chacun garde son rang
const OLD_MINS = [0, 100, 200, 300, 400, 500, 600, 700, 850];
export function fromOldScale(rp) {
  const t = OLD_MINS.reduce((k, m, i) => (rp >= m ? i : k), 0);
  const lo = OLD_MINS[t], nlo = TIERS[t].min;
  const ratio = t < WINDOWS ? (TIERS[t + 1].min - nlo) / (OLD_MINS[t + 1] - lo) : (TIERS[8].min - TIERS[7].min) / (OLD_MINS[8] - OLD_MINS[7]);
  return Math.round(nlo + (rp - lo) * ratio);
}

// pièces : en atteignant un rang pour la 1re fois de la saison, et en fin de saison selon le meilleur rang
export const PROMO_COINS = tier => 50 * tier;
export const SEASON_COINS = [50, 100, 150, 250, 350, 500, 700, 1000, 1500];

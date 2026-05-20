// src/utils/ranks.ts

export interface Rank {
  name: string;
  minLevel: number;
  maxLevel: number;
  borderColor: string;
  borderGradient: string;
  glowColor: string;
}

export const ranks: Rank[] = [
  {
    name: "Bronze",
    minLevel: 1,
    maxLevel: 5,
    borderColor: "#cd7f32",
    borderGradient: "from-[#cd7f32] via-[#b87333] to-[#966919]",
    glowColor: "shadow-[0_0_20px_rgba(205,127,50,0.5)]",
  },
  {
    name: "Silver",
    minLevel: 6,
    maxLevel: 10,
    borderColor: "#c0c0c0",
    borderGradient: "from-[#c0c0c0] via-[#a8a8a8] to-[#808080]",
    glowColor: "shadow-[0_0_20px_rgba(192,192,192,0.5)]",
  },
  {
    name: "Gold",
    minLevel: 11,
    maxLevel: 15,
    borderColor: "#ffd700",
    borderGradient: "from-[#ffd700] via-[#ffed4e] to-[#ffc700]",
    glowColor: "shadow-[0_0_20px_rgba(255,215,0,0.6)]",
  },
  {
    name: "Platinum",
    minLevel: 16,
    maxLevel: 20,
    borderColor: "#e5e4e2",
    borderGradient: "from-[#e5e4e2] via-[#b0c4de] to-[#778899]",
    glowColor: "shadow-[0_0_20px_rgba(229,228,226,0.6)]",
  },
  {
    name: "Diamond",
    minLevel: 21,
    maxLevel: 30,
    borderColor: "#b9f2ff",
    borderGradient: "from-[#b9f2ff] via-[#00bfff] to-[#1e90ff]",
    glowColor: "shadow-[0_0_25px_rgba(0,191,255,0.7)]",
  },
  {
    name: "Master",
    minLevel: 31,
    maxLevel: 40,
    borderColor: "#a855f7",
    borderGradient: "from-[#a855f7] via-[#9333ea] to-[#7e22ce]",
    glowColor: "shadow-[0_0_25px_rgba(168,85,247,0.7)]",
  },
  {
    name: "Ascendant",
    minLevel: 41,
    maxLevel: 50,
    borderColor: "#ef4444",
    borderGradient: "from-[#ef4444] via-[#f97316] to-[#eab308]",
    glowColor: "shadow-[0_0_30px_rgba(239,68,68,0.8)]",
  },
];

/**
 * Returns the rank object for a given user level.
 * - Levels <= 0 return Bronze by default.
 * - Levels above the highest rank return the last rank (Ascendant).
 */
export function getRankByLevel(level: number): Rank {
  const safeLevel = Number.isFinite(level) ? Math.floor(level) : 1;

  const found = ranks.find((rank) => safeLevel >= rank.minLevel && safeLevel <= rank.maxLevel);
  if (found) return found;

  // below Bronze
  if (safeLevel < ranks[0].minLevel) return ranks[0];

  // above Ascendant
  return ranks[ranks.length - 1];
}

/**
 * Optional helper: next rank milestone info.
 * Useful for “Next rank at level X” UI.
 */
export function getNextRank(level: number): Rank | null {
  const safeLevel = Number.isFinite(level) ? Math.floor(level) : 1;
  const current = getRankByLevel(safeLevel);
  const currentIndex = ranks.findIndex((r) => r.name === current.name);
  if (currentIndex < 0 || currentIndex >= ranks.length - 1) return null;
  return ranks[currentIndex + 1];
}
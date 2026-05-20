export type ThemeVars = Record<string, string>;

export const THEMES: Record<string, { name: string; vars: ThemeVars }> = {
  theme_clinic_blue: {
    name: "Clinic Blue",
    vars: { "--bg": "#0c0f1a", "--panel": "#151a24", "--panel-alt": "#1d2430", "--accent": "#4da3ff", "--accent-strong": "#1f6fff", "--persona-red": "#2563eb" },
  },
  theme_sterile_mint: {
    name: "Sterile Mint",
    vars: { "--bg": "#0d1716", "--panel": "#142624", "--panel-alt": "#1c312f", "--accent": "#54d8bd", "--accent-strong": "#20b997", "--persona-red": "#34d399" },
  },
  theme_surgical_teal: {
    name: "Surgical Teal",
    vars: { "--bg": "#0a1519", "--panel": "#112229", "--panel-alt": "#17303a", "--accent": "#4dcad6", "--accent-strong": "#1599a8", "--persona-red": "#14b8a6" },
  },
  theme_pharmacy_purple: {
    name: "Pharmacy Purple",
    vars: { "--bg": "#130f1f", "--panel": "#1e1930", "--panel-alt": "#292241", "--accent": "#b794f4", "--accent-strong": "#8b5cf6", "--persona-red": "#a855f7" },
  },
  theme_emergency_red: {
    name: "Emergency Red",
    vars: { "--bg": "#1a0d11", "--panel": "#2a141c", "--panel-alt": "#3a1d28", "--accent": "#fb7185", "--accent-strong": "#e11d48", "--persona-red": "#ef4444" },
  },
  theme_night_shift: {
    name: "Night Shift",
    vars: { "--bg": "#080b16", "--panel": "#12172a", "--panel-alt": "#1a2140", "--accent": "#7c9cf5", "--accent-strong": "#4f46e5", "--persona-red": "#6366f1" },
  },
  theme_icu_blue: {
    name: "ICU Blue",
    vars: { "--bg": "#09131d", "--panel": "#112233", "--panel-alt": "#193249", "--accent": "#60a5fa", "--accent-strong": "#2563eb", "--persona-red": "#3b82f6" },
  },
};

export const AVATARS: Record<string, { label: string; src: string }> = {
  avatar_default_logo: { label: "Default Logo", src: "/images/mediquestlogo.png" },
  
  avatar_first_aid: { label: "First Aid (Male)", src: "/images/avatars/mediavatarM1.png" },
  avatar_first_aidW: { label: "First Aid (Female)", src: "/images/avatars/mediavatarW1.png" },
  avatar_beginnier_gainsM: { label: "Beginner Gains (Male)", src: "/images/avatars/PTavatarM1.png" },
  avatar_beginnier_gainsW: { label: "Beginner Gains (Female)", src: "/images/avatars/PTavatarW1.png" },
  avatar_beginner_gainsM: { label: "Beginner Gains (Male)", src: "/images/avatars/PTavatarM1.png" },
  avatar_beginner_gainsW: { label: "Beginner Gains (Female)", src: "/images/avatars/PTavatarW1.png" },
  avatar_pill_bottleM: { label: "Pill Bottle (Male)", src: "/images/avatars/mediavatarM2.png" },
  avatar_pill_bottleW: { label: "Pill Bottle (Female)", src: "/images/avatars/mediavatarW2.png" },
  avatar_recovery_warriorM: { label: "Recovery Warrior (Male)", src: "/images/avatars/PTavatarM2.png" },
  avatar_recovery_warriorW: { label: "Recovery Warrior (Female)", src: "/images/avatars/PTavatarW2.png" },
  avatar_stethoscope: { label: "Stethoscope (Male)", src: "/images/avatars/mediavatarM3.png" },
  avatar_stethoscopeW: { label: "Stethoscope (Female)", src: "/images/avatars/mediavatarW3.png" },
  avatar_dumbbell_beastM: { label: "Dumbbell Beast (Male)", src: "/images/avatars/PTavatarM3.png" },
  avatar_dumbbell_beastW: { label: "Dumbbell Beast (Female)", src: "/images/avatars/PTavatarW3.png" },
  avatar_heartbeat: { label: "Heartbeat (Male)", src: "/images/avatars/mediavatarM4.png" },
  avatar_heartbeatW: { label: "Heartbeat (Female)", src: "/images/avatars/mediavatarW4.png" },
  avatar_fitness_medicM: { label: "Fitness Medic (Male)", src: "/images/avatars/PTavatarM4.png" },
  avatar_fitness_medicW: { label: "Fitness Medic (Female)", src: "/images/avatars/PTavatarW4.png" },
  avatar_medic_shield: { label: "Medic Shield (Male)", src: "/images/avatars/mediavatarM5.png" },
  avatar_medic_shieldW: { label: "Medic Shield (Female)", src: "/images/avatars/mediavatarW5.png" },
 avatar_strength_guardianM: { label: "Strength Guardian (Male)", src: "/images/avatars/PTavatarM5.png" },
 avatar_strength_guardianW: { label: "Strength Guardian (Female)", src: "/images/avatars/PTavatarW5.png" },
  avatar_scrubs_star: { label: "Scrubs Star (Male)", src: "/images/avatars/mediavatarM6.png" },
  avatar_scrubs_starW: { label: "Scrubs Star (Female)", src: "/images/avatars/mediavatarW6.png" },
  avatar_health_defender: { label: "Health Defender (Male)", src: "/images/avatars/mediavatarM7.png" },
  avatar_health_defenderW: { label: "Health Defender (Female)", src: "/images/avatars/mediavatarW7.png" },
  avatar_medic_marine: { label: "Medic Marine (Male)", src: "/images/avatars/mediavatarM8.png" },
  avatar_medic_marineW: { label: "Medic Marine (Female)", src: "/images/avatars/mediavatarW8.png" },
  avatar_medimancer_prime: { label: "Medimancer Prime (Male)", src: "/images/avatars/mediavatarM9.png" },
  avatar_medimancer_primeW: { label: "Medimancer Prime (Female)", src: "/images/avatars/mediavatarW9.png" },
};

const AVATAR_KEY_ALIASES: Record<string, string> = {
  avatar_beginner_gainsM: "avatar_beginnier_gainsM",
  avatar_beginner_gainsW: "avatar_beginnier_gainsW",
};

export function normalizeAvatarKey(key?: string | null) {
  if (!key) return null;
  const normalized = key.trim();
  if (!normalized) return null;
  const canonical = AVATAR_KEY_ALIASES[normalized] ?? normalized;
  return AVATARS[canonical] ? canonical : null;
}

export function applyTheme(vars: ThemeVars) {
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}

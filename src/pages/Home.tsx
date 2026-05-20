// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../utils/api";
import { clearSession, getAccessToken, getSession } from "../utils/auth";
import { MedicationSidebar } from "../components/MedicationSidebar";
import { applyTheme, AVATARS, normalizeAvatarKey, THEMES } from "../cosmetics/cosmetics";
import { getRankByLevel } from "../utils/ranks";

type PartyMember = {
  id: string;
  name: string;
  email?: string;
  memberCode?: string;
  role: string;
  status: string;
  xp?: number;
  avatarKey?: string | null;
};

type Claim = {
  id: number;
  activityType: "Medication" | "PhysicalTherapy";
  medicationId?: number;
  physicalTherapyTaskId?: number;
  activityLabel: string;
  memberName?: string;
  status: string;
  createdAt?: string;
  deniedReason?: string;
};

type NotificationItem = {
  id: number;
  type: string;
  category?: string | null;
  title: string;
  message?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
  metaJson?: string | null;
  metadata?: Record<string, unknown> | null;
};

type NotificationMeta = {
  claimId?: number;
  claimRequestId?: number;
  medicationId?: number;
  status?: string;
  medicationName?: string;
  ownerUserId?: string;
  actorName?: string;
  refillStatus?: string;
};

type NotificationActionButton = {
  label: string;
  danger?: boolean;
  run: () => Promise<void>;
};

type PhysicalTherapyTask = {
  id: number;
  title: string;
  instructions?: string | null;
  isActive: boolean;
};

type RefillHistoryItem = {
  id: string;
  medicationId?: number;
  medicationName: string;
  memberName: string;
  status: string;
  createdAt: string;
};

type LeaderboardItem = {
  userId: string;
  avatarUserId?: string | null;
  displayName: string;
  email?: string | null;
  xp: number;
  level: number;
  avatarKey?: string | null;
};

type Med = {
  id: number;
  name: string;
  schedule: string;
  strengthText: string;
  directionsText: string;
  isActive: boolean;
  nextRefillDate: string | null;
  quantityOnHand: number | null;
  dosesRemaining: number | null;
  lowSupplyThreshold: number;
  refillStatus: string;
  isLowSupply: boolean;
  xp: number;
  ownerUserId?: string;
};

const MED_REFILL_STORAGE_KEY = "medRefillDatesById";
const LAST_SEEN_LEVEL_STORAGE_KEY_PREFIX = "mqLastSeenLevelByUser";
const AVATAR_STORAGE_KEY = "selectedAvatarByUserId";
const DEFAULT_AVATAR_KEY = "avatar_default_logo";
const DEFAULT_AVATAR_SRC = AVATARS[DEFAULT_AVATAR_KEY]?.src ?? "/images/mediquestlogo.png";

function parseStoredRefillDates() {
  try {
    const raw = localStorage.getItem(MED_REFILL_STORAGE_KEY);
    if (!raw) return {} as Record<string, string>;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string" && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function saveStoredRefillDates(next: Record<string, string>) {
  localStorage.setItem(MED_REFILL_STORAGE_KEY, JSON.stringify(next));
}

function parseStoredAvatarByUserId() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {} as Record<string, string>;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string" && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

type DoseLogEntry = {
  id: number;
  name: string;
  xp: number;
  time: string;
};

type UnlockItem = {
  key: string;
  category: string;
  displayName: string;
  levelRequired: number;
  unlockedAt: string | null;
};

type PanelKey = "home" | "dashboard" | "meds" | "party" | "themes" | "profile";

const copyMap: Record<PanelKey, string> = {
  home: "Welcome screen",
  dashboard: "Daily quests",
  party: "Party progress",
  meds: "Medication roster",
  themes: "Cosmetics",
  profile: "Player stats",
};


function formatTime(date: Date) {
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function extractLevel(status: string) {
  const match = status.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function normalizePartyRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase();
  if (normalized === "owner" || normalized === "parent" || normalized === "guardian") return "Owner";
  if (normalized === "admin") return "Admin";
  return "Child";
}

function normalizeClaimStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) return "Approved";
    if (value === 2) return "Denied";
    return "Pending";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "Pending";
    if (["0", "1", "2"].includes(trimmed)) {
      return normalizeClaimStatus(Number(trimmed));
    }
    return trimmed;
  }

  return "Pending";
}

function normalizeClaimActivityType(value: unknown): "Medication" | "PhysicalTherapy" {
  if (value === 1 || String(value).toLowerCase().includes("physical")) {
    return "PhysicalTherapy";
  }
  return "Medication";
}

function isLikelyMemberCode(input: string) {
  const normalized = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^MQ[A-Z0-9]{6}$/.test(normalized);
}

function parseNotificationMeta(metaJson?: string | null): NotificationMeta {
  if (!metaJson) return {};
  try {
    const parsed = JSON.parse(metaJson) as NotificationMeta;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function normalizeRefillStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) return "Requested / Pending";
    if (value === 2) return "In Progress";
    if (value === 3) return "Resolved";
    if (value === 4) return "Approved";
    if (value === 5) return "Denied";
    return "None";
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "2", "3", "4", "5"].includes(normalized)) {
    return normalizeRefillStatus(Number(normalized));
  }
  if (normalized.includes("approved")) return "Approved";
  if (normalized.includes("denied")) return "Denied";
  if (normalized.includes("inprogress") || normalized.includes("in progress")) return "In Progress";
  if (normalized.includes("resolved")) return "Resolved";
  if (normalized.includes("refillneeded") || normalized.includes("requested") || normalized.includes("pending")) return "Requested / Pending";
  return "None";
}

export default function Home() {
  const session = useMemo(() => getSession(), []);
  const [activePanel, setActivePanel] = useState<PanelKey>("home");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [xpIntoLevel, setXpIntoLevel] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState(0);
  const [xpGoal, setXpGoal] = useState(500);
  const [rank, setRank] = useState("Bronze");
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);
  const [selectedThemeKey, setSelectedThemeKey] = useState("theme_clinic_blue");
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(DEFAULT_AVATAR_KEY);
  const [selectedAvatarByUserId, setSelectedAvatarByUserId] = useState<Record<string, string>>(() => parseStoredAvatarByUserId());

  const [party, setParty] = useState<PartyMember[]>([
    { id: "loading", name: "Loading...", role: "Party", status: "Syncing" },
  ]);
  const [selectedPartyMember, setSelectedPartyMember] = useState<PartyMember | null>(null);

  const [meds, setMeds] = useState<Med[]>([
    {
      id: 1,
      name: "Loading...",
      schedule: "Syncing",
      strengthText: "",
      directionsText: "Syncing",
      isActive: true,
      nextRefillDate: null,
      quantityOnHand: null,
      dosesRemaining: null,
      lowSupplyThreshold: 3,
      refillStatus: "None",
      isLowSupply: false,
      xp: 0,
    },
  ]);

  const [history, setHistory] = useState<DoseLogEntry[]>([]);

  // forms
  const [partyInviteUsername, setPartyInviteUsername] = useState("");

  const [medName, setMedName] = useState("");
  const [medStrength, setMedStrength] = useState("");
  const [medDirections, setMedDirections] = useState("");
  const [medNextRefillDate, setMedNextRefillDate] = useState("");
  const [medQuantityOnHand, setMedQuantityOnHand] = useState("");
  const [medDosesRemaining, setMedDosesRemaining] = useState("");
  const [medLowSupplyThreshold, setMedLowSupplyThreshold] = useState("3");
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [editMedName, setEditMedName] = useState("");
  const [editMedStrength, setEditMedStrength] = useState("");
  const [editMedDirections, setEditMedDirections] = useState("");
  const [editMedIsActive, setEditMedIsActive] = useState(true);
  const [editMedQuantityOnHand, setEditMedQuantityOnHand] = useState("");
  const [editMedDosesRemaining, setEditMedDosesRemaining] = useState("");
  const [editMedLowSupplyThreshold, setEditMedLowSupplyThreshold] = useState("3");

  const [profileName, setProfileName] = useState(session?.fullName ?? "");
  const [profileHandle, setProfileHandle] = useState(session?.username ?? "");
  const [profileEmail, setProfileEmail] = useState(
    `${(session?.username ?? "demo").replace(/^@/, "")}@mediquest.app`
  );
  const [profileBio, setProfileBio] = useState("Leveling up healthy habits one quest at a time.");
  const [profileJoined, setProfileJoined] = useState("Jan 2026");
  const [grantAmount, setGrantAmount] = useState("250");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [claimsMine, setClaimsMine] = useState<Claim[]>([]);
  const [claimsPending, setClaimsPending] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [ptTasks, setPtTasks] = useState<PhysicalTherapyTask[]>([]);
  const [newPtTitle, setNewPtTitle] = useState("");
  const [newPtInstructions, setNewPtInstructions] = useState("");
  const [editingPtTaskId, setEditingPtTaskId] = useState<number | null>(null);
  const [editPtTitle, setEditPtTitle] = useState("");
  const [editPtInstructions, setEditPtInstructions] = useState("");
  const [editPtIsActive, setEditPtIsActive] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ previousLevel: number; newLevel: number } | null>(null);
  const [selectedCareMemberId, setSelectedCareMemberId] = useState<string>(String(session?.userId ?? ""));
  const [recentClaimDecisions, setRecentClaimDecisions] = useState<Claim[]>([]);
  const [isClaimHistoryExpanded, setIsClaimHistoryExpanded] = useState(false);
  const [isRefillHistoryExpanded, setIsRefillHistoryExpanded] = useState(false);
  const lastKnownLevelRef = useRef<number | null>(null);
  const token = getAccessToken();
  const role = session?.role ?? "member";
  const normalizedRole = role.toLowerCase();
  const isAdminAccount = normalizedRole === "admin";
  const isParentAccount = ["parent", "owner", "guardian"].includes(normalizedRole);
  const isChildAccount = ["child", "member", "player", "sibling"].includes(normalizedRole) && !isParentAccount;
  const canManageMeds = isAdminAccount || !isChildAccount;
  const canManageParty = isAdminAccount || isParentAccount;
  const canFullyManageRefill = isAdminAccount || !isChildAccount;
  const levelStorageKey = `${LAST_SEEN_LEVEL_STORAGE_KEY_PREFIX}:${session?.userId ?? "unknown"}`;

  // NEW: right medication sidebar state (controls push layout)
  const [isMedSidebarCollapsed, setIsMedSidebarCollapsed] = useState(false);

  const showStatus = (message: string, error = false) => {
    setStatusMessage(message);
    setStatusError(error);
  };

  const userIsPartyOwner = () =>
    party.some(
      (member) =>
        member.role.toLowerCase() === "owner" &&
        String(member.id) === String(session?.userId ?? "")
    );
  const canCompleteMedicationDirectly = () => isAdminAccount || !isChildAccount || userIsPartyOwner();

  const canManagePartyMembers = () => canManageParty || userIsPartyOwner();
  const myMemberCode = useMemo(() => session?.memberCode || "Unavailable", [session?.memberCode]);
  const isViewingAnotherPartyMember =
    Boolean(selectedPartyMember) && String(selectedPartyMember?.id) !== String(session?.userId ?? "");
  const displayedProfileMember = isViewingAnotherPartyMember ? selectedPartyMember : null;
  const displayedProfileName = displayedProfileMember?.name ?? profileName;
  const displayedProfileHandle = displayedProfileMember?.email
    ? displayedProfileMember.email.split("@")[0]
    : profileHandle;
  const displayedProfileEmail = displayedProfileMember?.email ?? profileEmail;
  const displayedProfileBio = displayedProfileMember
    ? `${displayedProfileMember.role} · ${displayedProfileMember.status}`
    : profileBio;
  const displayedProfileJoined = displayedProfileMember ? "Party member" : profileJoined;
  const displayedMemberCode = displayedProfileMember?.memberCode ?? myMemberCode;
  const resolveAvatarKey = (userId?: string | number | null, explicitAvatarKey?: string | null) => {
    if (userId !== null && userId !== undefined) {
      const storedKey = normalizeAvatarKey(selectedAvatarByUserId[String(userId)]);
      if (storedKey) return storedKey;
    }
    const directKey = normalizeAvatarKey(explicitAvatarKey);
    if (directKey) return directKey;
    return DEFAULT_AVATAR_KEY;
  };
  const displayedProfileAvatarKey = displayedProfileMember
    ? resolveAvatarKey(displayedProfileMember.id, displayedProfileMember.avatarKey)
    : resolveAvatarKey(session?.userId, selectedAvatarKey);
  const managedMemberOptions = useMemo(() => {
    const myId = String(session?.userId ?? "");
    const children = party
      .filter((member) => String(member.id) !== myId && normalizePartyRoleLabel(member.role) === "Child")
      .map((member) => ({ id: String(member.id), label: `${member.name} (Child)` }));
    return [{ id: myId, label: "My Medications" }, ...children];
  }, [party, session?.userId]);
  const selectedCareMemberOption = managedMemberOptions.find((member) => member.id === selectedCareMemberId) ?? managedMemberOptions[0];
  const selectedCareTargetUserId = selectedCareMemberOption?.id ?? String(session?.userId ?? "");

  const loadDashboardData = async () => {
    if (!token) return;

    try {
      const medsPath = selectedCareTargetUserId !== String(session?.userId ?? "")
        ? `/api/medications?ownerUserId=${encodeURIComponent(selectedCareTargetUserId)}`
        : "/api/medications";
      const ptPath = selectedCareTargetUserId !== String(session?.userId ?? "")
        ? `/api/pt-tasks?ownerUserId=${encodeURIComponent(selectedCareTargetUserId)}`
        : "/api/pt-tasks";
      const [progression, medications, myParties, myClaims, pendingClaims, board, notificationsData, ptTaskData] = await Promise.all([
        apiRequest<any>("/api/progression/me", { method: "GET" }, token),
        apiRequest<any[]>(medsPath, { method: "GET" }, token),
        apiRequest<any[]>("/api/parties/me", { method: "GET" }, token),
        apiRequest<any[]>("/api/claims/mine", { method: "GET" }, token),
        apiRequest<any[]>("/api/claims/pending", { method: "GET" }, token).catch(() => []),
        apiRequest<any[]>("/api/leaderboard", { method: "GET" }, token),
        apiRequest<any[]>("/api/notifications", { method: "GET" }, token).catch(() => []),
        apiRequest<any[]>(ptPath, { method: "GET" }, token).catch(() => []),
      ]);

      const nextLevel = Number(progression?.level ?? 0);
      const previousKnownLevel = lastKnownLevelRef.current;
      let lastSeenLevel = Number.NaN;
      try {
        const raw = localStorage.getItem(levelStorageKey);
        if (raw !== null) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            lastSeenLevel = parsed;
          }
        }
      } catch {
        // no-op
      }
      const levelBaseline = Number.isFinite(lastSeenLevel)
        ? Number(lastSeenLevel)
        : previousKnownLevel;
      if (levelBaseline !== null && levelBaseline !== undefined && nextLevel > levelBaseline) {
        setLevelUpCelebration({
          previousLevel: levelBaseline,
          newLevel: nextLevel,
        });
      }
      lastKnownLevelRef.current = nextLevel;
      localStorage.setItem(levelStorageKey, String(nextLevel));

      setTotalXp(Number(progression?.totalXp ?? 0));
      setXpIntoLevel(Number(progression?.xpIntoLevel ?? 0));
      setLevel(nextLevel);
      setXpGoal(Number(progression?.nextLevelRequirement ?? 0));
      setRank(String(progression?.rank ?? "Bronze"));
      const unlockItems = Array.isArray(progression?.unlocks) ? progression.unlocks : [];
      setUnlocks(unlockItems);

      const backendThemeKey = typeof progression?.selectedThemeKey === "string" ? progression.selectedThemeKey : null;
      const backendAvatarKey = normalizeAvatarKey(typeof progression?.selectedAvatarKey === "string" ? progression.selectedAvatarKey : null);
      const cachedThemeKey = localStorage.getItem("selectedThemeKey");
      const cachedAvatarKey = normalizeAvatarKey(localStorage.getItem("selectedAvatarKey"));
      setSelectedThemeKey(backendThemeKey || cachedThemeKey || "theme_clinic_blue");
      setSelectedAvatarKey(backendAvatarKey || cachedAvatarKey || DEFAULT_AVATAR_KEY);

      const normalizedMeds = medications.map((m, index) => ({
        id: Number(m.id ?? index + 1),
        name: String(m.name ?? m.medicationName ?? "Medication"),
        schedule: String(m.directionsText ?? m.schedule ?? m.time ?? m.frequency ?? "Flexible schedule"),
        strengthText: String(m.strengthText ?? ""),
        directionsText: String(m.directionsText ?? "Flexible schedule"),
        isActive: Boolean(m.isActive ?? true),
        nextRefillDate:
          typeof m.nextRefillDate === "string"
            ? m.nextRefillDate
            : typeof m.nextRefillAt === "string"
              ? m.nextRefillAt
              : null,
        quantityOnHand: typeof m.quantityOnHand === "number" ? m.quantityOnHand : null,
        dosesRemaining: typeof m.dosesRemaining === "number" ? m.dosesRemaining : null,
        lowSupplyThreshold: Number(m.lowSupplyThreshold ?? 3) || 3,
        refillStatus: String(m.refillStatus ?? "None"),
        isLowSupply: Boolean(m.isLowSupply ?? false),
        ownerUserId: typeof m.ownerUserId === "string" ? m.ownerUserId : undefined,
      }));
      const storedRefillsById = parseStoredRefillDates();
      const mergedRefillsById = { ...storedRefillsById };
      const activeQuestCount = Math.max(1, normalizedMeds.filter((med) => med.isActive).length);
      const questXpPerDose = Math.floor(500 / activeQuestCount);

      setMeds(
        normalizedMeds.map((med) => ({
          ...med,
          nextRefillDate: med.nextRefillDate ?? storedRefillsById[String(med.id)] ?? null,
          xp: med.isActive ? questXpPerDose : 0,
        }))
      );

      normalizedMeds.forEach((med) => {
        if (med.nextRefillDate) {
          mergedRefillsById[String(med.id)] = med.nextRefillDate;
        }
      });
      saveStoredRefillDates(mergedRefillsById);

      const boardEntries = board.map((u, idx) => ({
        userId: String(u.userId ?? u.appUserId ?? u.memberId ?? u.id ?? "").trim(),
        displayName: String(u.displayName ?? u.name ?? `Player ${idx + 1}`),
        email: typeof u.email === "string" ? u.email : null,
        xp: Number(u.totalXp ?? u.xp ?? 0),
        level: Number(u.level ?? 0),
        avatarKey: normalizeAvatarKey(typeof u.avatarKey === "string" ? u.avatarKey : null),
      }));

      const boardByName = new Map(boardEntries.map((entry) => [entry.displayName.trim().toLowerCase(), entry]));
      const firstParty = Array.isArray(myParties) && myParties.length > 0 ? myParties[0] : null;
      const resolvedPartyId = Number(firstParty?.partyId ?? firstParty?.id ?? 0) || null;
      setPartyId(resolvedPartyId);

      const partyDetails = resolvedPartyId
        ? await apiRequest<any>(`/api/parties/${resolvedPartyId}`, { method: "GET" }, token)
        : null;
      const members = Array.isArray(partyDetails?.members) ? partyDetails.members : [];
      const memberUserIdByName = new Map<string, string>(
        members.map((m: any) => {
          const memberName = String(m.displayName ?? m.name ?? "").trim().toLowerCase();
          const memberUserId = String(m.userId ?? m.id ?? "").trim();
          return [memberName, memberUserId];
        })
      );
      const memberUserIdByEmail = new Map<string, string>(
        members.map((m: any) => {
          const memberEmail = String(m.email ?? "").trim().toLowerCase();
          const memberUserId = String(m.userId ?? m.id ?? "").trim();
          return [memberEmail, memberUserId];
        })
      );
      const sessionIdentifierCandidates = new Map<string, string>();
      const sessionUserId = String(session?.userId ?? "").trim();
      if (sessionUserId) {
        const sessionUsername = String(session?.username ?? "").trim().toLowerCase();
        const sessionFullName = String(session?.fullName ?? "").trim().toLowerCase();
        const sessionEmail = `${sessionUsername.replace(/^@/, "")}@mediquest.app`.trim().toLowerCase();
        if (sessionUsername) sessionIdentifierCandidates.set(sessionUsername, sessionUserId);
        if (sessionFullName) sessionIdentifierCandidates.set(sessionFullName, sessionUserId);
        if (sessionEmail && sessionEmail !== "@mediquest.app") sessionIdentifierCandidates.set(sessionEmail, sessionUserId);
      }

      const resolveLeaderboardUserId = (entry: { userId: string; displayName: string; email?: string | null }) => {
        const directUserId = entry.userId.trim();
        if (directUserId) return directUserId;
        const normalizedEmail = String(entry.email ?? "").trim().toLowerCase();
        if (normalizedEmail) {
          const matchByEmail = memberUserIdByEmail.get(normalizedEmail) ?? sessionIdentifierCandidates.get(normalizedEmail);
          if (matchByEmail) return matchByEmail;
          const emailLocalPart = normalizedEmail.split("@")[0]?.trim();
          if (emailLocalPart) {
            const matchByUsername = memberUserIdByName.get(emailLocalPart) ?? sessionIdentifierCandidates.get(emailLocalPart);
            if (matchByUsername) return matchByUsername;
          }
        }
        const normalizedName = entry.displayName.trim().toLowerCase();
        if (!normalizedName) return null;
        return (
          memberUserIdByName.get(normalizedName) ??
          sessionIdentifierCandidates.get(normalizedName) ??
          null
        );
      };
      const storedAvatarByUserId = parseStoredAvatarByUserId();
      setSelectedAvatarByUserId(storedAvatarByUserId);
      setParty(
        members.length > 0
          ? members
            .map((m: any, index: number) => {
              const name = String(m.displayName ?? m.name ?? `Member ${index + 1}`);
              const email = String(m.email ?? "");
              const username = email.includes("@") ? email.split("@")[0] : email;
              const boardEntry =
                boardByName.get(name.trim().toLowerCase()) ??
                boardByName.get(username.trim().toLowerCase());
              const memberLevel = Number(boardEntry?.level ?? m.level ?? 1);
              const memberUserId = String(m.userId ?? m.id ?? `member-${index + 1}`);
              return {
                id: memberUserId,
                name,
                email,
                memberCode: typeof m.memberCode === "string" ? m.memberCode : undefined,
                role: String(m.role ?? "Member"),
                status: `Level ${memberLevel}`,
                xp: Number(boardEntry?.xp ?? 0),
                avatarKey: resolveAvatarKey(memberUserId, storedAvatarByUserId[memberUserId] ?? null),
              };
            })
            .sort((a: PartyMember, b: PartyMember) => {
              const aIsOwner = a.role.toLowerCase() === "owner";
              const bIsOwner = b.role.toLowerCase() === "owner";
              if (aIsOwner !== bIsOwner) return aIsOwner ? -1 : 1;

              const levelDiff = extractLevel(b.status) - extractLevel(a.status);
              if (levelDiff !== 0) return levelDiff;

              return a.name.localeCompare(b.name);
            })
          : [{ id: "0", name: "No party yet", role: "Party", status: "Create or add members" }]
      );

      setClaimsMine(
        myClaims.map((c, idx) => ({
          id: Number(c.id ?? idx),
          activityType: normalizeClaimActivityType(c.activityType),
          medicationId: c.medicationId ? Number(c.medicationId) : undefined,
          physicalTherapyTaskId: c.physicalTherapyTaskId ? Number(c.physicalTherapyTaskId) : undefined,
          activityLabel: String(c.activityLabel ?? c.medicationName ?? c.medName ?? `Claim ${idx + 1}`),
          memberName: String(c.memberName ?? c.submittedByName ?? c.actorName ?? "You"),
          status: normalizeClaimStatus(c.status),
          createdAt: c.createdAt,
          deniedReason: c.decisionNote ?? c.deniedReason,
        }))
      );

      setClaimsPending(
        pendingClaims.map((c, idx) => ({
          id: Number(c.id ?? idx),
          activityType: normalizeClaimActivityType(c.activityType),
          medicationId: c.medicationId ? Number(c.medicationId) : undefined,
          physicalTherapyTaskId: c.physicalTherapyTaskId ? Number(c.physicalTherapyTaskId) : undefined,
          activityLabel: String(c.activityLabel ?? c.medicationName ?? c.medName ?? `Claim ${idx + 1}`),
          memberName: String(c.memberName ?? c.submittedByName ?? c.actorName ?? "Party member"),
          status: normalizeClaimStatus(c.status),
          createdAt: c.createdAt,
          deniedReason: c.decisionNote ?? c.deniedReason,
        }))
      );

      setNotifications(
        notificationsData.map((n, idx) => ({
          id: Number(n.id ?? idx + 1),
          type: String(n.type ?? "Info"),
          category: typeof n.category === "string" ? n.category : null,
          title: String(n.title ?? "Notification"),
          message: typeof n.message === "string" ? n.message : null,
          body: String(n.body ?? ""),
          createdAt: String(n.createdAt ?? new Date().toISOString()),
          readAt: n.readAt ?? null,
          metaJson: typeof n.metaJson === "string" ? n.metaJson : null,
          metadata: typeof n.metadata === "object" && n.metadata !== null
            ? n.metadata as Record<string, unknown>
            : null,
        }))
      );

      setPtTasks(
        ptTaskData.map((task, idx) => ({
          id: Number(task.id ?? idx + 1),
          title: String(task.title ?? `PT Task ${idx + 1}`),
          instructions: typeof task.instructions === "string" ? task.instructions : null,
          isActive: Boolean(task.isActive ?? true),
        }))
      );

      setLeaderboard(
        boardEntries.map((entry, idx) => {
          const avatarUserId = resolveLeaderboardUserId(entry);
          return {
            ...entry,
            userId: entry.userId || `leaderboard-${idx + 1}`,
            avatarUserId,
            avatarKey: resolveAvatarKey(avatarUserId, entry.avatarKey ?? null),
          };
        })
      );
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Failed to load dashboard.", true);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, [token, selectedCareTargetUserId]);

  useEffect(() => {
    if (managedMemberOptions.length === 0) return;
    if (!managedMemberOptions.some((member) => member.id === selectedCareMemberId)) {
      setSelectedCareMemberId(managedMemberOptions[0].id);
    }
  }, [managedMemberOptions, selectedCareMemberId]);

  useEffect(() => {
    if (!levelUpCelebration) return;
    const timeoutId = window.setTimeout(() => {
      setLevelUpCelebration(null);
    }, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [levelUpCelebration]);

  useEffect(() => {
    setParty((current) =>
      current.map((member) => ({
        ...member,
        avatarKey: resolveAvatarKey(member.id, member.avatarKey),
      }))
    );
    setLeaderboard((current) =>
      current.map((entry) => ({
        ...entry,
        avatarKey: resolveAvatarKey(entry.avatarUserId ?? entry.userId, entry.avatarKey),
      }))
    );
  }, [selectedAvatarByUserId]);

  const accountRoleLabel = isAdminAccount
    ? "Admin account"
    : canManagePartyMembers()
      ? "Owner account"
      : "Child account";

  const panelTitle =
    activePanel === "dashboard"
      ? "Quests"
      : activePanel.slice(0, 1).toUpperCase() + activePanel.slice(1);

  const progressPercent = Math.max(0, Math.min((xpIntoLevel / (xpGoal || 1)) * 100, 100));

  const unlockedThemeItems = unlocks.filter((u) => u.category === "theme");
  const unlockedAvatarItems = unlocks.filter((u) => u.category === "avatar");
  const groupedAvatarItems = useMemo(() => {
    const dedupedByCanonicalKey = new Map<string, UnlockItem>();
    unlockedAvatarItems.forEach((item) => {
      const canonicalKey = normalizeAvatarKey(item.key) ?? item.key;
      const current = dedupedByCanonicalKey.get(canonicalKey);
      if (!current) {
        dedupedByCanonicalKey.set(canonicalKey, item);
        return;
      }
      if (!current.unlockedAt && item.unlockedAt) {
        dedupedByCanonicalKey.set(canonicalKey, item);
      }
    });

    const medi: Array<UnlockItem & { avatarKey: string; finalLabel: string }> = [];
    const pt: Array<UnlockItem & { avatarKey: string; finalLabel: string }> = [];

    dedupedByCanonicalKey.forEach((item, avatarKey) => {
      const avatar = AVATARS[avatarKey];
      if (!avatar) return;
      const finalLabel = avatar.label || item.displayName;
      const normalizedEntry = { ...item, avatarKey, finalLabel };
      if (avatar.src.includes("mediavatar")) {
        medi.push(normalizedEntry);
      } else if (avatar.src.includes("PTavatar")) {
        pt.push(normalizedEntry);
      }
    });

    return { medi, pt };
  }, [unlockedAvatarItems]);

  const isUnlocked = (key: string) => {
    if (isAdminAccount) return true;
    const normalizedKey = normalizeAvatarKey(key) ?? key;
    return unlocks.some((u) => (normalizeAvatarKey(u.key) ?? u.key) === normalizedKey && Boolean(u.unlockedAt));
  };

  useEffect(() => {
    const fallbackTheme = "theme_clinic_blue";
    const nextThemeKey = isUnlocked(selectedThemeKey) ? selectedThemeKey : fallbackTheme;
    if (nextThemeKey !== selectedThemeKey) {
      setSelectedThemeKey(nextThemeKey);
      return;
    }
    applyTheme(THEMES[nextThemeKey]?.vars ?? THEMES[fallbackTheme].vars);
  }, [isAdminAccount, selectedThemeKey, unlocks]);

  useEffect(() => {
    const fallbackAvatar = DEFAULT_AVATAR_KEY;
    const canonicalSelectedAvatarKey = normalizeAvatarKey(selectedAvatarKey) ?? selectedAvatarKey;
    const nextAvatar = isUnlocked(canonicalSelectedAvatarKey) ? canonicalSelectedAvatarKey : fallbackAvatar;
    if (nextAvatar !== selectedAvatarKey) {
      setSelectedAvatarKey(nextAvatar);
      return;
    }
    if (session?.userId) {
      setSelectedAvatarByUserId((current) => {
        const userId = String(session.userId);
        if (current[userId] === nextAvatar) return current;
        return { ...current, [userId]: nextAvatar };
      });
    }
  }, [isAdminAccount, selectedAvatarKey, session?.userId, unlocks]);

  const handleAdminGrantXp = async () => {
    if (!token) return;
    try {
      await apiRequest("/api/admin/grant-xp", { method: "POST", body: JSON.stringify({ amount: Number(grantAmount) || 250 }) }, token);
      showStatus("XP granted.");
      await loadDashboardData();
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to grant XP.", true);
    }
  };

  const handleSelectTheme = async (key: string) => {
    if (!token || !isUnlocked(key)) return;
    try {
      const response = await apiRequest<{ selectedThemeKey?: string | null; selectedAvatarKey?: string | null }>(
        "/api/progression/cosmetics",
        { method: "PUT", body: JSON.stringify({ selectedThemeKey: key }) },
        token
      );
      const nextTheme = typeof response.selectedThemeKey === "string" ? response.selectedThemeKey : key;
      setSelectedThemeKey(nextTheme);
      localStorage.setItem("selectedThemeKey", nextTheme);
      applyTheme(THEMES[nextTheme]?.vars ?? THEMES.theme_clinic_blue.vars);
      showStatus(`Theme updated to ${THEMES[nextTheme]?.name ?? nextTheme}.`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to save theme selection.", true);
    }
  };

  const handleAvatarImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    if (img.src.endsWith(DEFAULT_AVATAR_SRC)) {
      img.style.display = "none";
      return;
    }
    img.src = DEFAULT_AVATAR_SRC;
  };

  const handleSelectAvatar = async (key: string) => {
    if (!token) return;
    const canonicalKey = normalizeAvatarKey(key) ?? key;
    if (!isUnlocked(canonicalKey)) return;
    try {
      const response = await apiRequest<{ selectedThemeKey?: string | null; selectedAvatarKey?: string | null }>(
        "/api/progression/cosmetics",
        { method: "PUT", body: JSON.stringify({ selectedAvatarKey: canonicalKey }) },
        token
      );
      const nextAvatar = normalizeAvatarKey(response.selectedAvatarKey ?? canonicalKey) ?? canonicalKey;
      setSelectedAvatarKey(nextAvatar);
      localStorage.setItem("selectedAvatarKey", nextAvatar);
      if (session?.userId) {
        const userId = String(session.userId);
        setSelectedAvatarByUserId((current) => {
          const updated = { ...current, [userId]: nextAvatar };
          localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
      showStatus(`Avatar updated to ${AVATARS[nextAvatar]?.label ?? nextAvatar}.`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to save avatar selection.", true);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  const handlePartyUsernameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addPartyMember();
  };

  const addPartyMember = () => {
    void (async () => {
      if (!token) return;
      if (!canManagePartyMembers()) {
        showStatus("Only parent/owner or admin accounts can add party members.", true);
        return;
      }
      try {
        const normalizedInvite = partyInviteUsername.trim();
        if (!normalizedInvite) {
          showStatus("Enter a username to add a member.", true);
          return;
        }

        let resolvedPartyId = partyId;
        if (!resolvedPartyId) {
          const created = await apiRequest<any>(
            "/api/parties",
            {
              method: "POST",
              body: JSON.stringify({ name: "My Party" }),
            },
            token
          );
          resolvedPartyId = Number(created?.id);
          setPartyId(resolvedPartyId);
        }

        const shouldUseMemberCode = isLikelyMemberCode(normalizedInvite);
        const email = !shouldUseMemberCode
          ? (normalizedInvite.includes("@")
            ? normalizedInvite
            : `${normalizedInvite}@mediquest.app`)
          : null;
        const memberCode = shouldUseMemberCode
          ? normalizedInvite.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
          : null;

        await apiRequest(
          `/api/parties/${resolvedPartyId}/members`,
          { method: "POST", body: JSON.stringify({ email, memberCode }) },
          token
        );

        showStatus("Member added to party.");
        setPartyInviteUsername("");
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to update party.", true);
      }
    })();
  };

  const addMedication = () => {
    const name = medName.trim();
    if (!name) return;

    void (async () => {
      if (!token) return;
      if (!canManageMeds) {
        showStatus("Child/member accounts cannot add medications.", true);
        return;
      }
      try {
        const createdMedication = await apiRequest<any>(
          "/api/medications",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              strengthText: medStrength.trim() || null,
              directionsText: medDirections.trim() || "Flexible schedule",
              isActive: true,
              quantityOnHand: medQuantityOnHand.trim() ? Number(medQuantityOnHand) : null,
              dosesRemaining: medDosesRemaining.trim() ? Number(medDosesRemaining) : null,
              lowSupplyThreshold: Number(medLowSupplyThreshold) || 3,
              targetUserId: selectedCareTargetUserId,
            }),
          },
          token
        );

        if (medNextRefillDate) {
          const refillById = parseStoredRefillDates();
          refillById[String(createdMedication?.id)] = medNextRefillDate;
          saveStoredRefillDates(refillById);
        }
        setMedName("");
        setMedStrength("");
        setMedDirections("");
        setMedNextRefillDate("");
        setMedQuantityOnHand("");
        setMedDosesRemaining("");
        setMedLowSupplyThreshold("3");
        showStatus(`${name} added.`);
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to add medication.", true);
      }
    })();
  };

  const beginMedicationEdit = (med: Med) => {
    if (!canManageMeds) {
      showStatus("Child/member accounts cannot edit medications.", true);
      return;
    }
    setEditingMedId(med.id);
    setEditMedName(med.name);
    setEditMedStrength(med.strengthText);
    setEditMedDirections(med.directionsText);
    setEditMedIsActive(med.isActive);
    setEditMedQuantityOnHand(med.quantityOnHand?.toString() ?? "");
    setEditMedDosesRemaining(med.dosesRemaining?.toString() ?? "");
    setEditMedLowSupplyThreshold(med.lowSupplyThreshold?.toString() ?? "3");
  };

  const saveMedicationEdit = (id: number) => {
    if (!canManageMeds) {
      showStatus("Child/member accounts cannot edit medications.", true);
      return;
    }
    const name = editMedName.trim();
    if (!name) {
      showStatus("Medication name is required.", true);
      return;
    }

    void (async () => {
      if (!token) return;
      try {
        await apiRequest(
          `/api/medications/${id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name,
              strengthText: editMedStrength.trim() || null,
              directionsText: editMedDirections.trim() || "Flexible schedule",
              isActive: editMedIsActive,
              quantityOnHand: editMedQuantityOnHand.trim() ? Number(editMedQuantityOnHand) : null,
              dosesRemaining: editMedDosesRemaining.trim() ? Number(editMedDosesRemaining) : null,
              lowSupplyThreshold: Number(editMedLowSupplyThreshold) || 3,
            }),
          },
          token
        );
        setEditingMedId(null);
        showStatus(`${name} updated.`);
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to update medication.", true);
      }
    })();
  };

  const cancelMedicationEdit = () => {
    setEditingMedId(null);
  };

  const confirmMedication = (id: number) => {
    const med = meds.find((m) => m.id === id);
    if (!med) return;
    if (!partyId) {
      showStatus("Create or join a party before submitting a claim.", true);
      return;
    }

    void (async () => {
      if (!token) return;
      try {
        const claim = await apiRequest<any>(
          "/api/claims",
          {
            method: "POST",
            body: JSON.stringify({
              partyId,
              medicationId: id,
              physicalTherapyTaskId: null,
              activityType: 0,
            }),
          },
          token
        );

        if (canCompleteMedicationDirectly() && claim?.id) {
          await apiRequest(`/api/claims/${claim.id}/approve`, { method: "POST" }, token);
        }

        const entry: DoseLogEntry = {
          id: Date.now(),
          name: med.name,
          xp: med.xp,
          time: formatTime(new Date()),
        };
        setHistory((prev) => [entry, ...prev]);
        showStatus(
          canCompleteMedicationDirectly()
            ? `${med.name} completed for the day. XP awarded.`
            : `Approval requested for ${med.name}.`
        );
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to submit claim.", true);
      }
    })();
  };

  const completedMedicationIds = new Set(
    claimsMine
      .filter((claim) => claim.activityType === "Medication" && ["approved", "completed"].includes(claim.status.toLowerCase()))
      .map((claim) => claim.medicationId)
      .filter((id): id is number => typeof id === "number")
  );
  const pendingMedicationIds = new Set(
    claimsMine
      .filter((claim) => claim.activityType === "Medication" && claim.status.toLowerCase().includes("pending"))
      .map((claim) => claim.medicationId)
      .filter((id): id is number => typeof id === "number")
  );
  const completedPtTaskIds = new Set(
    claimsMine
      .filter((claim) => claim.activityType === "PhysicalTherapy" && ["approved", "completed"].includes(claim.status.toLowerCase()))
      .map((claim) => claim.physicalTherapyTaskId)
      .filter((id): id is number => typeof id === "number")
  );
  const pendingPtTaskIds = new Set(
    claimsMine
      .filter((claim) => claim.activityType === "PhysicalTherapy" && claim.status.toLowerCase().includes("pending"))
      .map((claim) => claim.physicalTherapyTaskId)
      .filter((id): id is number => typeof id === "number")
  );
  const completedQuestCount = meds.filter((med) => completedMedicationIds.has(med.id)).length;
  const totalQuestXp = meds.reduce((sum, med) => sum + med.xp, 0);
  const completedQuestXp = meds
    .filter((med) => completedMedicationIds.has(med.id))
    .reduce((sum, med) => sum + med.xp, 0);

  const deleteMedication = (id: number) => {
    void (async () => {
      if (!token) return;
      if (!canManageMeds) {
        showStatus("Child/member accounts cannot delete medications.", true);
        return;
      }
      try {
        await apiRequest(`/api/medications/${id}`, { method: "DELETE" }, token);
        const refillById = parseStoredRefillDates();
        delete refillById[String(id)];
        saveStoredRefillDates(refillById);
        showStatus("Medication deleted.");
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to delete medication.", true);
      }
    })();
  };

  const updateRefillStatus = async (id: number, refillStatus: number, options?: { skipReload?: boolean }) => {
    if (!token) return;
    if (!canFullyManageRefill && refillStatus !== 1) {
      showStatus("Child/member accounts can only request refill needed.", true);
      return;
    }
    try {
      await apiRequest(`/api/medications/${id}/refill-status`, {
        method: "POST",
        body: JSON.stringify({ refillStatus }),
      }, token);
      if (!options?.skipReload) {
        await loadDashboardData();
      }
      const statusLabel =
        refillStatus === 1
          ? "Refill requested and waiting for owner."
          : refillStatus === 2
            ? "Refill marked in progress."
            : refillStatus === 3
              ? "Refill marked resolved."
              : refillStatus === 4
                ? "Refill approved."
                : "Refill denied.";
      showStatus(statusLabel);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to update refill status.", true);
    }
  };

  const markNotificationRead = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "POST" }, token);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to mark notification as read.", true);
    }
  };

  const runNotificationAction = async (
    runBackendAction: () => Promise<void>,
    notificationId: number
  ) => {
    await runBackendAction();
    await markNotificationRead(notificationId);
    await loadDashboardData();
  };

  const getNotificationActions = (notification: NotificationItem): NotificationActionButton[] | null => {
    const meta = parseNotificationMeta(notification.metaJson);
    const toNumber = (...values: unknown[]) => {
      for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return null;
    };
    const normalizedType = String(notification.type ?? "").toLowerCase();
    const normalizedCategory = String(notification.category ?? "").toLowerCase();
    const message = notification.message ?? notification.body ?? "";
    const normalizedTitle = notification.title.toLowerCase();
    const normalizedBody = message.toLowerCase();
    const normalizedCombined = `${normalizedType} ${normalizedCategory} ${normalizedTitle} ${normalizedBody}`;
    const claimId = toNumber(meta.claimId, meta.claimRequestId, notification.metadata?.claimId, notification.metadata?.claimRequestId);
    const medicationId = toNumber(meta.medicationId, notification.metadata?.medicationId);
    const normalizedRefillStatus = normalizeRefillStatus(meta.status ?? meta.refillStatus ?? notification.type).toLowerCase();
    const isClaimRequest = canManagePartyMembers()
      && typeof claimId === "number"
      && (
        normalizedType === "claimapprovalrequested"
        || normalizedCombined.includes("claim approval")
        || (normalizedCombined.includes("claim") && normalizedCombined.includes("requested"))
      );
    if (isClaimRequest) {
      return [
        {
          label: "Approve",
          run: async () => {
            await runNotificationAction(
              () => handleClaimReview(claimId!, "approve", { skipReload: true }),
              notification.id
            );
          },
        },
        {
          label: "Deny",
          danger: true,
          run: async () => {
            await runNotificationAction(
              () => handleClaimReview(claimId!, "deny", { skipReload: true }),
              notification.id
            );
          },
        },
      ];
    }

    const isRefillCategory = normalizedCombined.includes("refill")
      || normalizedCombined.includes("low supply")
      || normalizedCombined.includes("lowsupply");
    const hasPendingRefillSignal = normalizedRefillStatus.includes("requested")
      || normalizedRefillStatus === "none"
      || normalizedCombined.includes("low supply")
      || normalizedCombined.includes("lowsupply");
    const isRefillActionable = canFullyManageRefill
      && typeof medicationId === "number"
      && isRefillCategory
      && hasPendingRefillSignal;
    if (isRefillActionable) {
      return [
        {
          label: "Approve",
          run: async () => {
            await runNotificationAction(() => updateRefillStatus(medicationId!, 4, { skipReload: true }), notification.id);
          },
        },
        {
          label: "Deny",
          danger: true,
          run: async () => {
            await runNotificationAction(() => updateRefillStatus(medicationId!, 5, { skipReload: true }), notification.id);
          },
        },
        {
          label: "In Progress",
          run: async () => {
            await runNotificationAction(() => updateRefillStatus(medicationId!, 2, { skipReload: true }), notification.id);
          },
        },
        {
          label: "Resolved",
          run: async () => {
            await runNotificationAction(() => updateRefillStatus(medicationId!, 3, { skipReload: true }), notification.id);
          },
        },
      ];
    }

    return null;
  };

  const createPtTask = async () => {
    if (!token) return;
    if (!canManageMeds) {
      showStatus("Child/member accounts cannot create PT tasks.", true);
      return;
    }
    const title = newPtTitle.trim();
    if (!title) {
      showStatus("PT task title is required.", true);
      return;
    }

    try {
      await apiRequest("/api/pt-tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          instructions: newPtInstructions.trim() || null,
          targetUserId: selectedCareTargetUserId,
        }),
      }, token);
      setNewPtTitle("");
      setNewPtInstructions("");
      await loadDashboardData();
      showStatus("PT task added.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to add PT task.", true);
    }
  };

  const beginPtTaskEdit = (task: PhysicalTherapyTask) => {
    setEditingPtTaskId(task.id);
    setEditPtTitle(task.title);
    setEditPtInstructions(task.instructions ?? "");
    setEditPtIsActive(task.isActive);
  };

  const cancelPtTaskEdit = () => {
    setEditingPtTaskId(null);
    setEditPtTitle("");
    setEditPtInstructions("");
    setEditPtIsActive(true);
  };

  const savePtTaskEdit = async (taskId: number) => {
    if (!token) return;
    if (!canManageMeds) {
      showStatus("Child/member accounts cannot edit PT tasks.", true);
      return;
    }
    const title = editPtTitle.trim();
    if (!title) {
      showStatus("PT task title is required.", true);
      return;
    }
    try {
      await apiRequest(`/api/pt-tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          instructions: editPtInstructions.trim() || null,
          isActive: editPtIsActive,
        }),
      }, token);
      cancelPtTaskEdit();
      await loadDashboardData();
      showStatus("PT task updated.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to update PT task.", true);
    }
  };

  const deletePtTask = async (taskId: number) => {
    if (!token) return;
    if (!canManageMeds) {
      showStatus("Child/member accounts cannot delete PT tasks.", true);
      return;
    }
    try {
      await apiRequest(`/api/pt-tasks/${taskId}`, { method: "DELETE" }, token);
      if (editingPtTaskId === taskId) {
        cancelPtTaskEdit();
      }
      await loadDashboardData();
      showStatus("PT task removed.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to remove PT task.", true);
    }
  };

  const submitPtClaim = async (taskId: number) => {
    if (!token || !partyId) {
      showStatus("Create or join a party before submitting PT claims.", true);
      return;
    }
    try {
      await apiRequest("/api/claims", {
        method: "POST",
         body: JSON.stringify({
          partyId,
          medicationId: null,
          physicalTherapyTaskId: taskId,
          activityType: 1,
        }),
      }, token);
      await loadDashboardData();
      showStatus("PT completion claim submitted.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Unable to submit PT claim.", true);
    }
  };

  const activeMedicationCount = meds.filter((med) => med.isActive).length;
  const shouldShowChildModeBanner = !isAdminAccount && !canManagePartyMembers();
  const isManagingAnotherMember = canManagePartyMembers() && selectedCareTargetUserId !== String(session?.userId ?? "");
  const unreadNotifications = notifications
    .filter((notification) => !notification.readAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadActionableNotificationCount = unreadNotifications.reduce((count, notification) => {
    const actions = getNotificationActions(notification);
    return count + (actions && actions.length > 0 ? 1 : 0);
  }, 0);
  const refillHistoryItems = useMemo<RefillHistoryItem[]>(() => {
    const historyFromNotifications = notifications
      .filter((notification) => {
        const type = notification.type.toLowerCase();
        return type.includes("refill") || type === "lowsupply";
      })
      .map((notification) => {
        const meta = parseNotificationMeta(notification.metaJson);
        const memberName = managedMemberOptions.find((member) => member.id === String(meta.ownerUserId ?? ""))?.label
          ?? (meta.ownerUserId === String(session?.userId ?? "") ? "My Medications" : "Child member");
        const medicationName = (
          meta.medicationName
          ?? notification.title.replace(/^Refill (requested|needed|update):\s*/i, "").trim()
        ) || "Medication";
        return {
          id: `notification-${notification.id}`,
          medicationId: meta.medicationId,
          medicationName,
          memberName,
          status: normalizeRefillStatus(meta.status ?? notification.type),
          createdAt: notification.createdAt,
        };
      });

    const pendingFromMeds = meds
      .filter((med) => normalizeRefillStatus(med.refillStatus) === "Requested / Pending")
      .map((med) => ({
        id: `med-${med.id}-pending`,
        medicationId: med.id,
        medicationName: med.name,
        memberName: selectedCareMemberOption?.label ?? "My Medications",
        status: "Requested / Pending",
        createdAt: new Date().toISOString(),
      }));

    return [...historyFromNotifications, ...pendingFromMeds]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [managedMemberOptions, meds, notifications, selectedCareMemberOption?.label, session?.userId]);
  const dailyDoseCount = meds.reduce((count, med) => {
    const doses = med.directionsText
      .split(",")
      .map((dose) => dose.trim())
      .filter(Boolean).length;
    return count + Math.max(doses, 1);
  }, 0);
  const nextRefillDateLabel = useMemo(() => {
    const refillTimestamps = meds
      .map((med) => med.nextRefillDate)
      .filter((date): date is string => Boolean(date))
      .map((date) => {
        const parsed = new Date(date);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
      })
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    if (refillTimestamps.length === 0) {
      return "Not set";
    }

    return new Date(refillTimestamps[0]).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [meds]);
  const refillStatusLabel = (status: string, isChildView: boolean) => {
    const normalized = normalizeRefillStatus(status).toLowerCase();
    if (normalized.includes("requested")) return isChildView ? "Refill requested · waiting for owner" : "Refill requested";
    if (normalized.includes("approved")) return isChildView ? "Refill approved · owner confirmed" : "Refill approved";
    if (normalized.includes("denied")) return isChildView ? "Refill denied · check with owner" : "Refill denied";
    if (normalized.includes("in progress")) return isChildView ? "Refill in progress · owner reviewing" : "Refill in progress";
    if (normalized.includes("resolved")) return isChildView ? "Refill resolved · continue meds" : "Refill resolved";
    return "No refill requested";
  };

  const getClaimOutcomeClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("approved") || normalized.includes("complete")) return "is-positive";
    if (normalized.includes("denied") || normalized.includes("reject")) return "is-negative";
    return "";
  };
  const getRefillOutcomeClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("approved") || normalized.includes("resolved")) return "is-positive";
    if (normalized.includes("denied")) return "is-negative";
    if (normalized.includes("pending") || normalized.includes("progress")) return "is-pending";
    return "";
  };
  const claimHistoryVisibleItems = isClaimHistoryExpanded ? claimsMine : claimsMine.slice(0, 3);
  const refillHistoryVisibleItems = isRefillHistoryExpanded ? refillHistoryItems : refillHistoryItems.slice(0, 3);

  const partySummary = useMemo(() => {
    const members = party.filter((member) => member.id !== "0");
    const averageLevel =
      members.length > 0
        ? Math.round(
            members.reduce((sum, member) => sum + extractLevel(member.status), 0) / members.length
          )
        : 0;
    const totalPartyXp = members.reduce((sum, member) => sum + Number(member.xp ?? extractLevel(member.status) * 450), 0);

    return {
      members,
      averageLevel,
      totalPartyXp,
      onlineNow: members.length,
    };
  }, [party]);

  const deletePartyMember = (id: string) => {
    void (async () => {
      if (!token || !partyId || id === "0") return;
      if (!canManagePartyMembers()) {
        showStatus("Only parent/owner or admin accounts can remove party members.", true);
        return;
      }
      try {
        await apiRequest(`/api/parties/${partyId}/members/${id}`, { method: "DELETE" }, token);
        await loadDashboardData();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "Unable to remove member.", true);
      }
    })();
  };

  const handleClaimReview = async (id: number, action: "approve" | "deny", options?: { skipReload?: boolean }) => {
    if (!token) return;
    const reviewedClaim = claimsPending.find((claim) => claim.id === id);
    try {
      await apiRequest(
        `/api/claims/${id}/${action}`,
        action === "deny" ? { method: "POST", body: JSON.stringify({ note: null }) } : { method: "POST" },
        token
      );
      setClaimsPending((prev) => prev.filter((claim) => claim.id !== id));
      if (reviewedClaim) {
        const nextStatus = action === "approve" ? "Approved" : "Denied";
        setRecentClaimDecisions((prev) => [{ ...reviewedClaim, status: nextStatus }, ...prev].slice(0, 10));
        setClaimsMine((prev) => [
          {
            ...reviewedClaim,
            status: nextStatus,
            deniedReason: action === "deny" ? reviewedClaim.deniedReason ?? "Denied by reviewer." : reviewedClaim.deniedReason,
          },
          ...prev,
        ]);
      }
      showStatus(`Claim ${action === "approve" ? "approved" : "denied"}.`);
      if (!options?.skipReload) {
        await loadDashboardData();
      }
    } catch (error) {
      showStatus(error instanceof Error ? error.message : `Unable to ${action} claim.`, true);
    }
  };

  if (!session) return <Navigate to="/" replace />;

  return (
    <>
      {levelUpCelebration && (
        <div className="level-up-overlay" role="status" aria-live="polite" aria-atomic="true">
          <div className="level-up-confetti" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={`confetti-${index}`}
                className="level-up-confetti-piece"
                style={
                  {
                    "--delay": `${(index % 6) * 0.09}s`,
                    "--x-origin": `${8 + (index % 9) * 10}%`,
                    "--rotation": `${index % 2 === 0 ? 1 : -1}`,
                    "--hue": `${205 + index * 8}`,
                  } as CSSProperties
                }
              ></span>
            ))}
          </div>
          <div className="level-up-card">
            <p className="level-up-eyebrow">Quest Reward Unlocked</p>
            <h2>🎉 Level Up!</h2>
            <p className="level-up-level-line">
              Level <strong>{levelUpCelebration.previousLevel}</strong>
              <span aria-hidden="true">→</span>
              <strong>{levelUpCelebration.newLevel}</strong>
            </p>
            <button
              type="button"
              className="level-up-close"
              onClick={() => setLevelUpCelebration(null)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="background">
        <div className="glow glow-a"></div>
        <div className="glow glow-b"></div>
        <div className="glow glow-c"></div>
        <div className="noise"></div>
      </div>

      {/* PUSH LAYOUT LEFT WHEN RIGHT SIDEBAR IS OPEN */}
      <div className={`app-shell ${isMedSidebarCollapsed ? "" : "with-quick-drawer"}`}>
        <main className="layout">
          <aside className={`command-menu ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <div className="logo">
              <div>
                <p className="logo-title">MediQuest</p>
                <p className="logo-sub">Medication quest tracker</p>
              </div>
            </div>

            <div className="menu-title"></div>

            <nav className="menu">
              <button
                className={`menu-item ${activePanel === "home" ? "active" : ""}`}
                onClick={() => {
                  setActivePanel("home");
                  setIsMobileMenuOpen(false);
                }}
              >
                Main Menu
              </button>

              <button
                className={`menu-item ${activePanel === "dashboard" ? "active" : ""}`}
               onClick={() => {
                  setActivePanel("dashboard");
                  setIsMobileMenuOpen(false);
                }}
              >
                Quests
              </button>

              <button
                className={`menu-item ${activePanel === "meds" ? "active" : ""}`}
                onClick={() => {
                  setActivePanel("meds");
                  setIsMobileMenuOpen(false);
                }}
              >
                Meds
              </button>

              <button
                className={`menu-item ${activePanel === "party" ? "active" : ""}`}
                                onClick={() => {
                  setActivePanel("party");
                  setIsMobileMenuOpen(false);
                }}
              >
                Party
              </button>

              <button
                className={`menu-item ${activePanel === "themes" ? "active" : ""}`}
                onClick={() => {
                  setActivePanel("themes");
                  setIsMobileMenuOpen(false);
                }}
              >
                Themes
              </button>

              <button
                className={`menu-item ${activePanel === "profile" ? "active" : ""}`}
                onClick={() => {
                  setSelectedPartyMember(null);
                  setActivePanel("profile");
                  setIsMobileMenuOpen(false);
                }}
                type="button"
              >
                Profile
              </button>
            </nav>

          </aside>

          <section className="panel">
            <header className="panel-header">

                                  <button
                    className={`mobile-menu-button ${isMobileMenuOpen ? "is-open" : ""}`}
                    type="button"
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  >
                    ☰
                  </button>

              <div>
                <p className="panel-eyebrow">{copyMap[activePanel]}</p>
                <h1 className="panel-title" id="panel-title">
                  {panelTitle}
                </h1>
                <p className="muted">Level {level} · {rank}</p>
              </div>
              <div className="panel-actions">
                <div className="menu-account panel-account">
                  <p className="menu-account-label">Signed in as</p>
                  <p className="menu-account-value" id="account-role">
                    {session?.fullName ?? "User"} · {accountRoleLabel}
                  </p>
                  <button
                    className="ghost-button menu-account-logout"
                    id="logout-account"
                    type="button"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
                {session?.role === "admin" && (<>
                  <input className="mini-input" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} />
                  <button className="primary-button" type="button" onClick={() => void handleAdminGrantXp()}>
                    Claim XP
                  </button>
                </>)}
              </div>
            </header>

            {statusMessage && (
              <p className={`auth-status ${statusError ? "is-error" : ""}`}>{statusMessage}</p>
            )}

            <div className="panel-content">
              {/* HOME */}
              <section
                className={`panel-section ${activePanel === "home" ? "is-active" : ""}`}
                data-panel-section="home"
              >
                <div className="hero-card">
                  <div className="hero-copy">
                    <p className="hero-eyebrow">MediQuest</p>
                    <h2>Ready to start today&apos;s quests?</h2>
                    <p className="muted">
                      Track doses, rally your party, and keep your streak alive with every
                      confirmed med.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => setActivePanel("dashboard")}
                      >
                        View Quests
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setActivePanel("party")}
                      >
                        View Party
                      </button>
                    </div>
                  </div>

                  <div className="hero-panel">
                    <div>
                      <p className="muted">Today&apos;s XP target</p>
                      <h3>
                        {xpGoal} / {xpGoal} XP
                      </h3>
                    </div>
                    <div className="progress">
                      <span style={{ width: "64%" }}></span>
                    </div>
                    <div className="hero-stats">
                      <div>
                        <p>Streak</p>
                        <strong>4 days</strong>
                      </div>
                      <div>
                        <p>Party rank</p>
                        <strong>Level 12</strong>
                      </div>
                      <div>
                        <p>Next reward</p>
                        <strong>+250 XP</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-grid">
                  <button
                    className="hero-tile"
                    type="button"
                    onClick={() => setActivePanel("meds")}
                  >
                    <span>Meds</span>
                    <p>Manage today&apos;s medication list.</p>
                  </button>

                  <button
                    className="hero-tile"
                    type="button"
                    onClick={() => setActivePanel("themes")}
                  >
                    <span>Unlocks</span>
                    <p>See what rewards you earn each level.</p>
                  </button>

                  <button
                    className="hero-tile"
                    type="button"
                    onClick={() => {
                      setSelectedPartyMember(null);
                      setActivePanel("profile");
                    }}
                  >
                    <span>Profile</span>
                    <p>Customize how your party sees you.</p>
                  </button>
                </div>

                <div className="list-section">
                  <h3>Leaderboard</h3>
                  <div className="data-list">
                    {leaderboard.slice(0, 5).map((entry) => (
                      <div className="data-row" key={entry.userId}>
                        <div className="leaderboard-member">
                          <div className="leaderboard-avatar">
                            <img
                              src={AVATARS[resolveAvatarKey(entry.avatarUserId ?? entry.userId, entry.avatarKey)]?.src ?? DEFAULT_AVATAR_SRC}
                              alt={`${entry.displayName} avatar`}
                              className="leaderboard-avatar-image"
                              onError={handleAvatarImageError}
                            />
                          </div>
                          <div>
                            <strong>{entry.displayName}</strong>
                            <div className="meta">
                              {getRankByLevel(entry.level).name} · Level {entry.level}
                            </div>
                          </div>
                        </div>
                        <span className="xp-pill">{entry.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* QUESTS */}
              <section
                className={`panel-section ${activePanel === "dashboard" ? "is-active" : ""}`}
                data-panel-section="dashboard"
              >
                <div className="section-header">
                  <div>
                    <h2>Today&apos;s Quests</h2>
                    <p>Your medication quests show what to take, when to take it, and XP rewards.</p>
                  </div>
                  <div className="quest-progress-card">
                    <p>Today&apos;s Progress</p>
                    <strong>{completedQuestCount} / {meds.length} Completed</strong>
                    <div className="quest-progress-track">
                      <span style={{ width: `${meds.length ? (completedQuestCount / meds.length) * 100 : 0}%` }}></span>
                    </div>
                    <em>{completedQuestXp} / {totalQuestXp} XP Earned</em>
                  </div>
                </div>

                {shouldShowChildModeBanner && (
                  <div className="quest-child-banner">
                    <strong>Child Account Mode</strong>
                    <p>Quest completions require parent approval. Click &quot;Request Approval&quot; after taking your medication.</p>
                  </div>
                )}

                <div className="list-section pending-approvals-section">
                  <h3>Pending Claim Approvals</h3>
                  <div className="data-list">
                    {claimsPending.length === 0 ? (
                      <div className="data-row">
                        <div><strong>No pending approvals.</strong></div>
                      </div>
                    ) : (
                      claimsPending.map((claim) => (
                        <div className="data-row" key={claim.id}>
                          <div>
                            <strong>{claim.activityLabel}</strong>
                            <div className="meta">Claim #{claim.id} · {claim.activityType}</div>
                          </div>
                          <div className="data-actions">
                            <button type="button" onClick={() => void handleClaimReview(claim.id, "approve")}>Approve</button>
                            <button className="danger" type="button" onClick={() => void handleClaimReview(claim.id, "deny")}>Deny</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="list-section">
                  <h3>Notifications</h3>
                  <p className="meta">Action-required alerts stay at the top and can be handled directly here.</p>
                  <div className="data-list notifications-list">
                    {unreadNotifications.length === 0 ? (
                      <div className="data-row"><div><strong>No unread notifications.</strong></div></div>
                    ) : (
                      unreadNotifications.slice(0, 8).map((notification) => (
                        <div className="data-row notification-row" key={notification.id}>
                          <div>
                            <strong>{notification.title}</strong>
                            <div className="meta">{notification.body}</div>
                            <div className="meta">{new Date(notification.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="data-actions">
                            {(() => {
                              const action = getNotificationActions(notification);
                              if (!action) {
                                return <button type="button" onClick={() => void markNotificationRead(notification.id)}>Mark Read</button>;
                              }
                              return (
                                <>
                                  {action.map((buttonAction) => (
                                    <button
                                      key={`${notification.id}-${buttonAction.label}`}
                                      className={buttonAction.danger ? "danger" : ""}
                                      type="button"
                                      onClick={() => void buttonAction.run()}
                                    >
                                      {buttonAction.label}
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="data-list quest-list" id="quest-list">
                  {meds.length === 0 ? (
                    <div className="data-row">
                      <div>
                        <strong>No quests yet</strong>
                        <div className="meta">Add a medication in Meds to create quests.</div>
                      </div>
                    </div>
                  ) : (
                    meds.map((med) => {
                      const isCompleted = completedMedicationIds.has(med.id);
                      const isPending = !canCompleteMedicationDirectly() && pendingMedicationIds.has(med.id);

                      return (
                      <div className={`data-row quest-row ${isCompleted ? "quest-row-complete" : ""}`} key={med.id}>
                        <div>
                          <strong>{med.name}</strong>
                          <div className="meta">Take at: {med.schedule}</div>
                        </div>
                        <div className="data-actions">
                          <span className="xp-pill">+{med.xp} XP</span>
                          {isManagingAnotherMember ? (
                            <span className="quest-pill pending">Managed medication</span>
                          ) : isCompleted ? (
                            <span className="quest-pill success">Completed for today</span>
                          ) : isPending ? (
                            <span className="quest-pill pending">Approval requested</span>
                          ) : (
                            <button type="button" onClick={() => confirmMedication(med.id)}>
                              {canCompleteMedicationDirectly() ? "Done" : "Request Approval"}
                            </button>
                          )}
                        </div>
                      </div>
                    )})
                  )}
                </div>

                <div className="list-section">
                  <h3>Claim History</h3>
                  <div className="data-list">
                    {claimsMine.length === 0 ? (
                      <div className="data-row">
                        <div><strong>No claims yet.</strong></div>
                      </div>
                    ) : (
                      claimHistoryVisibleItems.map((claim) => (
                        <div className={`data-row history-row ${getClaimOutcomeClass(claim.status)}`} key={claim.id}>
                          <div>
                            <strong>{claim.activityLabel}</strong>
                            <div className="meta">
                              {claim.status} · {claim.memberName ?? "You"}
                              {claim.createdAt ? ` · ${new Date(claim.createdAt).toLocaleString()}` : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {claimsMine.length > 3 && (
                    <button
                      type="button"
                      className="ghost-button history-toggle"
                      onClick={() => setIsClaimHistoryExpanded((prev) => !prev)}
                    >
                      {isClaimHistoryExpanded ? "Show Less" : "Show More"}
                    </button>
                  )}
                </div>

                <div className="list-section">
                  <h3>Refill History</h3>
                  <div className="data-list">
                    {refillHistoryItems.length === 0 ? (
                      <div className="data-row">
                        <div><strong>No refill activity yet.</strong></div>
                      </div>
                    ) : (
                      refillHistoryVisibleItems.map((item) => (
                        <div className={`data-row history-row ${getRefillOutcomeClass(item.status)}`} key={item.id}>
                          <div>
                            <strong>{item.medicationName}</strong>
                            <div className="meta">
                              {item.status} · {item.memberName} · {new Date(item.createdAt).toLocaleString("en-US")}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {refillHistoryItems.length > 3 && (
                    <button
                      type="button"
                      className="ghost-button history-toggle"
                      onClick={() => setIsRefillHistoryExpanded((prev) => !prev)}
                    >
                      {isRefillHistoryExpanded ? "Show Less" : "Show More"}
                    </button>
                  )}
                </div>

                {canManagePartyMembers() && (
                  <div className="list-section">
                    <h3>Recently Reviewed</h3>
                    <div className="data-list">
                      {recentClaimDecisions.length === 0 ? (
                        <div className="data-row"><div><strong>No recent approvals or denials this session.</strong></div></div>
                      ) : (
                        recentClaimDecisions.map((claim) => (
                          <div className={`data-row history-row ${getClaimOutcomeClass(claim.status)}`} key={`decision-${claim.id}`}>
                            <div>
                              <strong>{claim.activityLabel}</strong>
                              <div className="meta">{claim.status} · Claim #{claim.id}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="list-section">
                  <h3>Physical Therapy Quests</h3>
                  <p className="meta">Manage PT tasks from the Meds panel so medications and PT stay in one workflow.</p>
                </div>

              </section>

              {/* PARTY */}
              <section
                className={`panel-section ${activePanel === "party" ? "is-active" : ""}`}
                data-panel-section="party"
              >
                <div className="party-header">
                  <div>
                    <p className="party-eyebrow">Family Health Tracking</p>
                    <h2>Party</h2>
                  </div>
                  {canManagePartyMembers() ? (
                    <button className="primary-button party-invite-button" type="button" onClick={addPartyMember}>
                      Add Member
                    </button>
                  ) : (
                    <span className="meta">Child/member accounts cannot manage party members.</span>
                  )}
                </div>

                <div className="party-stat-strip">
                  <article className="party-stat-card">
                    <p>Party Level</p>
                    <strong>{level}</strong>
                  </article>
                  <article className="party-stat-card">
                    <p>Total Party XP</p>
                    <strong>{partySummary.totalPartyXp.toLocaleString()}</strong>
                  </article>
                  <article className="party-stat-card">
                    <p>Average Level</p>
                    <strong>{partySummary.averageLevel}</strong>
                  </article>
                  <article className="party-stat-card">
                    <p>Party Members</p>
                    <strong>{partySummary.members.length}</strong>
                  </article>
                  <article className="party-stat-card">
                    <p>Online Now</p>
                    <strong>{partySummary.onlineNow}</strong>
                  </article>
                </div>

                {canManagePartyMembers() && (
                  <div className="party-add-member-grid">
                    <input
                      type="text"
                      placeholder="Username, email, or member code"
                      value={partyInviteUsername}
                      onChange={(e) => setPartyInviteUsername(e.target.value)}
                      onKeyDown={handlePartyUsernameKeyDown}
                    />
                    <p className="party-auto-add-note">Use username/email, or enter a member code starting with MQ (example: MQABC123), then press Enter.</p>
                  </div>
                )}

                <h3 className="party-members-title">Party Members</h3>
                <div className="party-member-list" id="party-list">
                  {partySummary.members.map((member) => (
                    <article className="party-member-card" key={member.id}>
                      <div className="party-member-main">
                        <div className="party-avatar">
                          <img
                            src={AVATARS[resolveAvatarKey(member.id, member.avatarKey)]?.src ?? DEFAULT_AVATAR_SRC}
                            alt={`${member.name} avatar`}
                            className="party-avatar-image"
                            onError={handleAvatarImageError}
                          />
                        </div>
                        <div>
                          <div className="party-member-heading-row">
                            <strong>{member.name}</strong>
                            <span className="party-role-pill">{normalizePartyRoleLabel(member.role)}</span>
                            <span className="party-online-pill">Online</span>
                          </div>
                          <div className="meta">{member.status}</div>
                        </div>
                      </div>

                      <div className="party-member-stats">
                        <div>
                          <p>Level</p>
                          <strong>{extractLevel(member.status)}</strong>
                        </div>
                        <div>
                          <p>Total XP</p>
                          <strong>{Number(member.xp ?? extractLevel(member.status) * 450).toLocaleString()}</strong>
                        </div>
                        <div>
                          <p>Streak</p>
                          <strong>{Math.max(1, extractLevel(member.status) % 7)} days</strong>
                        </div>
                      </div>

                      <div className="party-member-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => {
                            setSelectedPartyMember(member);
                            setActivePanel("profile");
                          }}
                        >
                          View Profile
                        </button>
                        {canManagePartyMembers() && member.role.toLowerCase() !== "owner" && (
                          <button
                            className="danger"
                            type="button"
                            onClick={() => deletePartyMember(member.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* MEDS */}
              <section
                className={`panel-section ${activePanel === "meds" ? "is-active" : ""}`}
                data-panel-section="meds"
              >
                <div className="section-header">
                  <div>
                    <p className="meds-eyebrow">Medication Management</p>
                    <h2>{selectedCareMemberOption?.label ?? "My Medications"}</h2>
                    <p className="meta">Medications and PT tasks shown below apply to the selected person.</p>
                  </div>
                  {canManageMeds ? (
                    <button className="primary-button meds-add-button" type="button" onClick={addMedication}>
                      + Add Medication
                    </button>
                  ) : (
                    <span className="meta">Child/member accounts can request refills and submit claims, but cannot manage medication setup.</span>
                  )}
                </div>

                {canManagePartyMembers() && (
                  <div className="med-owner-selector">
                    <label>
                      Managing medications/tasks for
                      <select value={selectedCareMemberId} onChange={(e) => setSelectedCareMemberId(e.target.value)}>
                        {managedMemberOptions.map((member) => (
                          <option key={member.id} value={member.id}>{member.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <div className="meds-stat-grid">
                  <article className="meds-stat-card">
                    <p>Active Medications</p>
                    <strong>{activeMedicationCount}</strong>
                  </article>
                  <article className="meds-stat-card">
                    <p>Daily Doses</p>
                    <strong>{dailyDoseCount}</strong>
                  </article>
                  <article className="meds-stat-card">
                    <p>Next Refill</p>
                    <strong>
                      {nextRefillDateLabel}
                    </strong>
                  </article>
                </div>

                {canManageMeds && (
                  <div className="form-grid">
                  <label>
                    Medication name
                    <input
                      type="text"
                      placeholder="e.g. Metformin 500mg"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                    />
                  </label>
                  <label>
                    Dosage
                    <input
                      type="text"
                      placeholder="e.g. 81mg"
                      value={medStrength}
                      onChange={(e) => setMedStrength(e.target.value)}
                    />
                  </label>
                  <label>
                    Daily schedule / purpose
                    <input
                      type="text"
                      placeholder="e.g. 8:00 AM, Blood thinner"
                      value={medDirections}
                      onChange={(e) => setMedDirections(e.target.value)}
                    />
                  </label>
                  <label>
                    Next refill
                    <input
                      type="date"
                      value={medNextRefillDate}
                      onChange={(e) => setMedNextRefillDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Quantity on hand
                    <input
                      type="number"
                      min={0}
                      value={medQuantityOnHand}
                      onChange={(e) => setMedQuantityOnHand(e.target.value)}
                    />
                  </label>
                  <label>
                    Doses remaining
                    <input
                      type="number"
                      min={0}
                      value={medDosesRemaining}
                      onChange={(e) => setMedDosesRemaining(e.target.value)}
                    />
                  </label>
                  <label>
                    Low supply threshold
                    <input
                      type="number"
                      min={1}
                      value={medLowSupplyThreshold}
                      onChange={(e) => setMedLowSupplyThreshold(e.target.value)}
                    />
                  </label>
                  </div>
                )}

                <div className="data-list" id="med-list">
                  {meds.map((med) => (
                    <article className="medication-card" key={med.id}>
                      {(() => {
                        const medRefillState = normalizeRefillStatus(med.refillStatus);
                        return (
                        <>
                      {editingMedId === med.id ? (
                        <div className="medication-edit-grid">
                          <label>
                            Name
                            <input value={editMedName} onChange={(e) => setEditMedName(e.target.value)} />
                          </label>
                          <label>
                            Dosage
                            <input value={editMedStrength} onChange={(e) => setEditMedStrength(e.target.value)} />
                          </label>
                          <label>
                            Schedule / Purpose
                            <input value={editMedDirections} onChange={(e) => setEditMedDirections(e.target.value)} />
                          </label>
                          <label className="medication-edit-toggle">
                            <input
                              type="checkbox"
                              checked={editMedIsActive}
                              onChange={(e) => setEditMedIsActive(e.target.checked)}
                            />
                            Active medication
                          </label>
                          <label>
                            Quantity on hand
                            <input value={editMedQuantityOnHand} onChange={(e) => setEditMedQuantityOnHand(e.target.value)} />
                          </label>
                          <label>
                            Doses remaining
                            <input value={editMedDosesRemaining} onChange={(e) => setEditMedDosesRemaining(e.target.value)} />
                          </label>
                          <label>
                            Low supply threshold
                            <input value={editMedLowSupplyThreshold} onChange={(e) => setEditMedLowSupplyThreshold(e.target.value)} />
                          </label>
                        </div>
                      ) : (
                        <div className="medication-card-main">
                          <div className="medication-card-header">
                            <strong>{med.name}</strong>
                            <span className={`quest-pill ${getRefillOutcomeClass(medRefillState)}`}>
                              {refillStatusLabel(med.refillStatus, isChildAccount)}
                            </span>
                          </div>
                          <div className="meta">Dosage: {med.strengthText || "Not provided"}</div>
                          <div className="meta">Purpose / Schedule: {med.directionsText}</div>
                          <div className="meta">Supply: {med.quantityOnHand ?? "?"} units · {med.dosesRemaining ?? "?"} doses remaining</div>
                          <div className="meta">Next refill: {med.nextRefillDate ? new Date(med.nextRefillDate).toLocaleDateString("en-US") : "Not set"}</div>
                          {med.isLowSupply && <div className="meta med-low-supply">Low supply warning: refill request recommended.</div>}
                        </div>
                      )}
                      <div className="data-actions medication-actions">
                        {editingMedId === med.id ? (
                          <>
                            <button type="button" onClick={() => saveMedicationEdit(med.id)}>
                              Save
                            </button>
                            <button className="danger" type="button" onClick={cancelMedicationEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {canManageMeds && (
                              <>
                                <button type="button" onClick={() => beginMedicationEdit(med)}>
                                  Edit
                                </button>
                                <button className="danger" type="button" onClick={() => deleteMedication(med.id)}>
                                  Delete
                                </button>
                              </>
                            )}
                            {isChildAccount && medRefillState === "Requested / Pending" && (
                              <span className="quest-pill pending">Refill requested · waiting for owner</span>
                            )}
                            {isChildAccount && medRefillState === "In Progress" && (
                              <span className="quest-pill pending">Refill in progress · owner updating</span>
                            )}
                            {isChildAccount && medRefillState === "Approved" && (
                              <span className="quest-pill success">Refill approved · owner confirmed</span>
                            )}
                            {isChildAccount && medRefillState === "Denied" && (
                              <span className="quest-pill is-negative">Refill denied · check with owner</span>
                            )}
                            {!isChildAccount || medRefillState !== "Requested / Pending" ? (
                              <button type="button" onClick={() => void updateRefillStatus(med.id, 1)}>
                                {isChildAccount ? "Request Refill" : "Refill Needed"}
                              </button>
                            ) : null}
                            {canFullyManageRefill && (
                              <>
                                <button type="button" onClick={() => void updateRefillStatus(med.id, 4)}>
                                  Approve
                                </button>
                                <button className="danger" type="button" onClick={() => void updateRefillStatus(med.id, 5)}>
                                  Deny
                                </button>
                                <button type="button" onClick={() => void updateRefillStatus(med.id, 2)}>
                                  Refill In Progress
                                </button>
                                <button type="button" onClick={() => void updateRefillStatus(med.id, 3)}>
                                  Refill Resolved
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                        </>
                        );
                      })()}
                    </article>
                  ))}
                </div>

                <div className="list-section">
                  <h3>Physical Therapy Tasks</h3>
                  {canManageMeds ? (
                    <>
                      <div className="form-grid">
                        <label>
                          PT task title
                          <input
                            type="text"
                            placeholder="e.g. Knee stretch set"
                            value={newPtTitle}
                            onChange={(e) => setNewPtTitle(e.target.value)}
                          />
                        </label>
                        <label>
                          Instructions
                          <input
                            type="text"
                            placeholder="e.g. 2 sets of 10 reps"
                            value={newPtInstructions}
                            onChange={(e) => setNewPtInstructions(e.target.value)}
                          />
                        </label>
                      </div>
                      <button className="primary-button" type="button" onClick={() => void createPtTask()}>
                        + Add PT Task
                      </button>
                    </>
                  ) : (
                    <p className="meta">Child accounts can submit PT completion claims, but cannot add or manage PT tasks.</p>
                  )}
                  <div className="data-list" style={{ marginTop: "0.75rem" }}>
                    {ptTasks.length === 0 ? (
                      <div className="data-row"><div><strong>No PT tasks yet.</strong></div></div>
                    ) : (
                      ptTasks.map((task) => {
                        const isCompleted = completedPtTaskIds.has(task.id);
                        const isPending = pendingPtTaskIds.has(task.id);
                        return (
                          <div className="data-row" key={task.id}>
                            {editingPtTaskId === task.id ? (
                              <div className="medication-edit-grid">
                                <label>
                                  PT task title
                                  <input value={editPtTitle} onChange={(e) => setEditPtTitle(e.target.value)} />
                                </label>
                                <label>
                                  Instructions
                                  <input value={editPtInstructions} onChange={(e) => setEditPtInstructions(e.target.value)} />
                                </label>
                                <label className="medication-edit-toggle">
                                  <input
                                    type="checkbox"
                                    checked={editPtIsActive}
                                    onChange={(e) => setEditPtIsActive(e.target.checked)}
                                  />
                                  Active PT task
                                </label>
                              </div>
                            ) : (
                              <div>
                                <strong>{task.title}</strong>
                                <div className="meta">{task.instructions || "No instructions added."}</div>
                              </div>
                            )}
                            <div className="data-actions">
                              {editingPtTaskId === task.id ? (
                                <>
                                  <button type="button" onClick={() => void savePtTaskEdit(task.id)}>Save</button>
                                  <button type="button" className="danger" onClick={cancelPtTaskEdit}>Cancel</button>
                                </>
                              ) : (
                                <>
                                  {canManageMeds && (
                                    <>
                                      <button type="button" onClick={() => beginPtTaskEdit(task)}>Edit</button>
                                      <button type="button" className="danger" onClick={() => void deletePtTask(task.id)}>Delete</button>
                                    </>
                                  )}
                                  {isManagingAnotherMember ? (
                                    <span className="quest-pill pending">Managed task</span>
                                  ) : isCompleted ? (
                                    <span className="quest-pill success">Completed</span>
                                  ) : isPending ? (
                                    <span className="quest-pill pending">Approval requested</span>
                                  ) : (
                                    <button type="button" onClick={() => void submitPtClaim(task.id)}>Submit Completion</button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {/* THEMES */}
              <section
                className={`panel-section ${activePanel === "themes" ? "is-active" : ""}`}
                data-panel-section="themes"
              >
                <div className="section-header">
                  <div>
                    <h2>Themes & Avatars</h2>
                    <p>Choose unlocked cosmetics. Locked items show required level.</p>
                  </div>
                </div>

                <div className="list-section">
                  <h3>Themes</h3>
                  <div className="appearance-grid">
                    {unlockedThemeItems.map((item) => {
                      const unlocked = Boolean(item.unlockedAt);
                      const themeName = THEMES[item.key]?.name ?? item.displayName;
                      return (
                        <article key={item.key} className={`appearance-item ${unlocked ? "is-unlocked" : "is-locked"}`}>
                          <h3>{themeName}</h3>
                          {unlocked ? (
                            <button type="button" onClick={() => handleSelectTheme(item.key)}>
                              {selectedThemeKey === item.key ? "Selected" : "Select"}
                            </button>
                          ) : (
                            <span className="tag">Unlock at level {item.levelRequired}</span>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>

                    {/* MEDI AVATARS */}
      <div className="list-section">
        <h3>Medi Avatars</h3>
        <div className="appearance-grid">
          {groupedAvatarItems.medi.map((item) => {
              const unlocked = Boolean(item.unlockedAt);
              const avatarKey = item.avatarKey;
              return (
                <article key={item.key} className={`appearance-item ${unlocked ? "is-unlocked" : "is-locked"}`}>
                  <img
                    src={AVATARS[avatarKey]?.src ?? DEFAULT_AVATAR_SRC}
                    alt={`${item.finalLabel} avatar`}
                    className="appearance-preview"
                    onError={handleAvatarImageError}
                  />
                  <h3>{item.finalLabel}</h3>

                  {unlocked ? (
                    <button type="button" onClick={() => handleSelectAvatar(avatarKey)}>
                      {selectedAvatarKey === avatarKey ? "Selected" : "Select"}
                    </button>
                  ) : (
                    <span className="tag">Unlock at level {item.levelRequired}</span>
                  )}
                </article>
              );
            })}
        </div>
      </div>

      {/* PT AVATARS */}
      <div className="list-section">
        <h3>PT Avatars</h3>
        <div className="appearance-grid">
          {groupedAvatarItems.pt.map((item) => {
              const unlocked = Boolean(item.unlockedAt);
              const avatarKey = item.avatarKey;
              return (
                <article key={item.key} className={`appearance-item ${unlocked ? "is-unlocked" : "is-locked"}`}>
                  <img
                    src={AVATARS[avatarKey]?.src ?? DEFAULT_AVATAR_SRC}
                    alt={`${item.finalLabel} avatar`}
                    className="appearance-preview"
                    onError={handleAvatarImageError}
                  />
                  <h3>{item.finalLabel}</h3>

                  {unlocked ? (
                    <button type="button" onClick={() => handleSelectAvatar(avatarKey)}>
                      {selectedAvatarKey === avatarKey ? "Selected" : "Select"}
                    </button>
                  ) : (
                    <span className="tag">Unlock at level {item.levelRequired}</span>
                  )}
                </article>
              );
            })}
        </div>
      </div>
              </section>

              {/* PROFILE */}
              <section
                className={`panel-section ${activePanel === "profile" ? "is-active" : ""}`}
                data-panel-section="profile"
              >
                <div className="section-header">
                  <div>
                    <p className="profile-settings-kicker">User Settings</p>
                    <h2>Profile</h2>
                    <p>Customize your account details and view cosmetics from Themes.</p>
                    {selectedPartyMember && (
                      <p className="muted">
                        Viewing party member: <strong>{selectedPartyMember.name}</strong> ({selectedPartyMember.role})
                      </p>
                    )}
                    {isViewingAnotherPartyMember && (
                      <button type="button" className="ghost-button" onClick={() => setSelectedPartyMember(null)}>
                        Back to My Profile
                      </button>
                    )}
                  </div>
                </div>

                <div className="profile-banner-card">
                  <div className="profile-banner-art" aria-hidden="true"></div>
                  <div className="profile-banner-placeholder">
                    <strong>Profile Banners Coming Soon</strong>
                    <span>Patch 2.1.2</span>
                  </div>
                </div>

                <div className="profile-card profile-shell" id="profile-preview">
                  <h3>Profile Picture &amp; Rank Border</h3>

                  <div className="profile-rank-layout">
                    <div className="profile-icon-stack">
                      <p className="muted">Current Icon</p>
                      <img
                        src={AVATARS[displayedProfileAvatarKey]?.src ?? DEFAULT_AVATAR_SRC}
                        alt="Current profile avatar"
                        className="profile-avatar"
                        id="profile-avatar"
                        onError={handleAvatarImageError}
                      />
                      <span className="profile-rank-chip">{rank}</span>
                    </div>

                    <div className="profile-rank-content">
                      <p>
                        Your profile icon appears in the sidebar and to your party members. Your rank border
                        changes automatically based on level.
                      </p>
                      <p className="muted">
                        <strong>Rank levels:</strong> Bronze (1-5), Silver (6-10), Gold (11-15), Platinum
                        (16-20), Diamond (21-30), Master (31-40), Ascendant (41-50)
                      </p>

                      <p className="meta">Change profile icon from the Themes & Avatars panel.</p>
                    </div>
                  </div>
                </div>

                <div className="profile-card profile-shell">
                  <h3>Account Information</h3>

                  <p className="muted">Doses logged: {history.length}</p>
                  <p className="member-code-line">
                    Member Code: <strong>{displayedMemberCode}</strong>
                    <span className="member-code-share">
                      {isViewingAnotherPartyMember
                        ? "Use this member's code when adding them to a party."
                        : "Share this code with your parent/party owner to be added faster."}
                    </span>
                  </p>

                  <div className="form-grid profile-account-grid">
                    <label>
                      Display name
                      <input
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        value={displayedProfileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        disabled={isViewingAnotherPartyMember}
                      />
                    </label>
                    <label>
                      Username / handle
                      <input
                        type="text"
                        placeholder="e.g. alexr"
                        value={displayedProfileHandle}
                        onChange={(e) => setProfileHandle(e.target.value)}
                        disabled={isViewingAnotherPartyMember}
                      />
                    </label>
                    <label>
                      Email address
                      <input
                        type="email"
                        placeholder="e.g. alex@example.com"
                        value={displayedProfileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        disabled={isViewingAnotherPartyMember}
                      />
                    </label>
                    <label>
                      Bio / short description
                      <input
                        type="text"
                        placeholder="A short profile description"
                        value={displayedProfileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        disabled={isViewingAnotherPartyMember}
                      />
                    </label>
                    <label>
                      Join date
                      <input
                        type="text"
                        placeholder="e.g. Jan 2026"
                        value={displayedProfileJoined}
                        onChange={(e) => setProfileJoined(e.target.value)}
                        disabled={isViewingAnotherPartyMember}
                      />
                    </label>
                    <label>
                      Organization
                      <input type="text" placeholder="e.g. MediQuest" value="MediQuest" readOnly />
                    </label>
                  </div>
                </div>
              </section>

              <footer className="xp-bar">
                <div>
                  <p>Personal XP</p>
                  <strong id="xp-level">
                    Level {level} · {xpIntoLevel} / {xpGoal} XP · Total {totalXp}
                  </strong>
                </div>
                <div className="progress">
                  <span id="xp-progress" style={{ width: `${progressPercent}%` }}></span>
                </div>
              </footer>

            </div>
          </section>
        </main>
      </div>

      {/* RIGHT SIDEBAR (controls push layout) */}
      <MedicationSidebar
        isCollapsed={isMedSidebarCollapsed}
        setIsCollapsed={setIsMedSidebarCollapsed}
        meds={meds}
        ptTasks={ptTasks}
        notifications={notifications}
        unreadActionableNotificationCount={unreadActionableNotificationCount}
        getNotificationActions={getNotificationActions}
        onMarkNotificationRead={markNotificationRead}
      />
    </>
  );
}

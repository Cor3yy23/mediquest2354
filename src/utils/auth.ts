import { apiRequest } from "./api";

export type Role = "admin" | "player" | "parent" | "guardian" | "sibling" | string;

export type Session = {
  userId: string;
  email: string;
  displayName: string;
  username: string;
  fullName: string;
  memberCode: string;
  role: Role;
  token: string;
};

export type Account = {
  username: string;
  password: string;
  fullName: string;
  role: Role;
};

type AuthResponse = {
  accessToken?: string;
  token?: string;
};

type MeResponse = {
  userId: string;
  email: string;
  displayName?: string;
  memberCode?: string;
  role?: string;
};

const SESSION_KEY = "mediquest_session";
const TOKEN_KEY = "mediquest_access_token";
const ROLE_HINTS_KEY = "mediquest_role_hints";

function getRoleHints(): Record<string, Role> {
  try {
    const raw = localStorage.getItem(ROLE_HINTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Role>;
  } catch {
    return {};
  }
}

function saveRoleHint(email: string, role: Role) {
  const hints = getRoleHints();
  hints[email.toLowerCase()] = role;
  localStorage.setItem(ROLE_HINTS_KEY, JSON.stringify(hints));
}

function inferRole(email: string, fallback?: string): Role {
  if (fallback) return fallback.toLowerCase();

  const emailLower = email.toLowerCase();
  const hintedRole = getRoleHints()[emailLower];
  if (hintedRole) return hintedRole;

  return emailLower.includes("admin") ? "admin" : "player";
}

function normalizeSession(me: MeResponse, token: string): Session {
  const username = me.email?.split("@")[0] || "player";
  const fullName = me.displayName || username;

  return {
    userId: String(me.userId),
    email: me.email,
    displayName: fullName,
    username,
    fullName,
    memberCode: me.memberCode || "",
    role: inferRole(me.email, me.role),
    token,
  };
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(TOKEN_KEY, session.token);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchMe(token: string): Promise<Session> {
  const me = await apiRequest<MeResponse>("/api/auth/me", { method: "GET" }, token);
  const session = normalizeSession(me, token);
  saveSession(session);
  return session;
}

export async function signIn(
  username: string,
  password: string
): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  const safeUsername = username.trim();
  if (!safeUsername || !password) {
    return { ok: false, message: "Please enter a username and password." };
  }

  const email = safeUsername.includes("@") ? safeUsername : `${safeUsername}@mediquest.app`;

  try {
    const auth = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const token = auth.accessToken || auth.token;
    if (!token) {
      return { ok: false, message: "Login succeeded but token was missing." };
    }

    const session = await fetchMe(token);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to sign in." };
  }
}

export async function registerAccount(input: Account): Promise<{ ok: true } | { ok: false; message: string }> {
  const username = input.username.trim();
  const fullName = input.fullName.trim();

  if (!username || !input.password || !fullName) {
    return { ok: false, message: "Please fill out all fields." };
  }

  const email = username.includes("@") ? username : `${username}@mediquest.app`;

  try {
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: input.password,
        displayName: fullName,
        accountType: input.role,
      }),
    });

    saveRoleHint(email, input.role);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to register account.",
    };
  }
}

export async function refreshSessionFromToken(): Promise<Session | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    return await fetchMe(token);
  } catch {
    clearSession();
    return null;
  }
}

const ACCOUNT_STORAGE_KEY = "mediquest_accounts";
const SESSION_STORAGE_KEY = "mediquest_session";

const defaultAccounts = [
  {
    id: 1,
    fullName: "MediQuest Administrator",
    username: "admin",
    password: "admin123",
    role: "admin",
  },
];

const loadAccounts = () => {
  const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(defaultAccounts));
    return [...defaultAccounts];
  }

  try {
    const parsed = JSON.parse(raw);
    const hasAdmin = parsed.some((account) => account.username === "admin");
    if (!hasAdmin) {
      parsed.unshift(defaultAccounts[0]);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (error) {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(defaultAccounts));
    return [...defaultAccounts];
  }
};

const saveAccounts = (accounts) => {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
};

const getSession = () => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

window.MediQuestAuth = {
  loadAccounts,
  saveAccounts,
  getSession,
  saveSession,
  clearSession,
};

const menuItems = document.querySelectorAll(".menu-item");
const panelTitle = document.getElementById("panel-title");
const panelCopy = document.querySelector(".panel-eyebrow");
const panelSections = document.querySelectorAll(".panel-section");
const jumpButtons = document.querySelectorAll("[data-jump]");

const partyList = document.getElementById("party-list");
const medList = document.getElementById("med-list");
const questList = document.getElementById("quest-list");
const doseLog = document.getElementById("dose-log");

const partyName = document.getElementById("party-name");
const partyRole = document.getElementById("party-role") ?? document.getElementById("party-level");
const partyStatus = document.getElementById("party-status") ?? document.getElementById("party-streak");
const addPartyMember = document.getElementById("add-party-member");

const medName = document.getElementById("med-name");
const medTime = document.getElementById("med-time");
const medXp = document.getElementById("med-xp");
const addMed = document.getElementById("add-med");

const clearLog = document.getElementById("clear-log");
const unlocksList = document.getElementById("unlocks-list");
const unlocksNextUnlock = document.getElementById("unlocks-next-unlock");

const profileName = document.getElementById("profile-name");
const profileHandle = document.getElementById("profile-handle");
const profileEmailInput = document.getElementById("profile-email-input");
const profileBioInput = document.getElementById("profile-bio-input");
const editProfileButton = document.getElementById("edit-profile");
const profileDisplayName = document.getElementById("profile-display-name");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");
const profileBio = document.getElementById("profile-bio");
const profileJoined = document.getElementById("profile-joined");
const profileJoinedInput = document.getElementById("profile-joined-input");
const statLevel = document.getElementById("stat-level");
const statXp = document.getElementById("stat-xp");
const statParty = document.getElementById("stat-party");
const statMeds = document.getElementById("stat-meds");
const statStreak = document.getElementById("stat-streak");
const statQuests = document.getElementById("stat-quests");

const xpLevel = document.getElementById("xp-level");
const xpProgress = document.getElementById("xp-progress");
const accountRoleDisplay = document.getElementById("account-role");
const logoutAccount = document.getElementById("logout-account");


const copyMap = {
  home: "Welcome screen",
  dashboard: "Daily quests",
  party: "Party progress",
  meds: "Medication roster",
  log: "Log a dose",
  unlocks: "Level-up rewards",
  profile: "Player stats",
};

const unlockMilestones = [
  { level: 1, name: "Clinic Cadet", description: "Starter medic outfit unlocked." },
  { level: 2, name: "Care Trainee", description: "Blue trainee uniform unlocked." },
  { level: 3, name: "Green Medic", description: "Forest medic colorway unlocked." },
  { level: 4, name: "Tactical Medic", description: "Tactical gear theme unlocked." },
  { level: 5, name: "Wizard Medic", description: "Arcane healer skin unlocked." },
  { level: 6, name: "Robo Medic", description: "Robotic support suit unlocked." },
  { level: 7, name: "Blaster Medic", description: "Blaster-tech armor unlocked." },
  { level: 8, name: "Cyber Med", description: "Cyberpunk medic visuals unlocked." },
  { level: 9, name: "PulseTech Medic", description: "PulseTech elite style unlocked." },
  { level: 10, name: "Angel Medic", description: "Legendary Angel Medic skin unlocked." },
];


const auth = window.MediQuestAuth;
const session = auth?.getSession?.();

if (!session) {
  window.location.href = "title.html";
}

if (session && accountRoleDisplay) {
  const roleLabel = session.role === "admin" ? "Admin account" : `${session.role[0].toUpperCase()}${session.role.slice(1)} account`;
  accountRoleDisplay.textContent = `${session.fullName} · ${roleLabel}`;
}

if (logoutAccount) {
  logoutAccount.addEventListener("click", () => {
    auth.clearSession();
    window.location.href = "title.html";
  });
}

const state = {
  authMode: "signin",
  accountRole: null,
  xp: 0,
  level: 0,
  xpGoal: 500,
  party: [
    { id: 1, name: "Alex (You)", role: "Guardian", status: "Streak 4" },
    { id: 2, name: "Riley", role: "Sibling", status: "Streak 3" },
    { id: 3, name: "Jordan", role: "Parent", status: "Streak 5" },
  ],
  meds: [
    { id: 1, name: "Metformin 500mg", schedule: "8:00 AM", xp: 10 },
    { id: 2, name: "Vitamin D3", schedule: "12:30 PM", xp: 5 },
    { id: 3, name: "Lisinopril 10mg", schedule: "7:00 PM", xp: 10 },
  ],
  history: [],
};


const profileState = {
  displayName: session?.fullName || "Demo User",
  username: session?.username || "demouser",
  email: `${session?.username || "demo"}@mediquest.app`,
  bio: "Building healthy habits and leveling up every day.",
  joined: "Jan 2026",
};

const setActivePanel = (panel) => {
  menuItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === panel);
  });
  const activeMenu = Array.from(menuItems).find((button) => button.dataset.panel === panel);
  if (activeMenu) {
    panelTitle.textContent = activeMenu.textContent;
  }
  panelCopy.textContent = copyMap[panel] ?? "";
  panelSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.panelSection === panel);
  });
};

const formatTime = (date) =>
  date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

const updateXp = () => {
  while (state.xp >= state.xpGoal) {
    state.xp -= state.xpGoal;
    state.level += 1;
    state.xpGoal += 50;
  }
  xpLevel.textContent = `Level ${state.level} · ${state.xp} / ${state.xpGoal} XP`;
  const safeGoal = state.xpGoal > 0 ? state.xpGoal : 1;
  const percent = Math.max(0, Math.min((state.xp / safeGoal) * 100, 100));
  xpProgress.style.width = percent === 0 ? "0" : `${percent}%`;
  updateProfilePreview();
  renderUnlockMilestones();
};

const renderUnlockMilestones = () => {
  if (!unlocksList) return;

  unlocksList.innerHTML = "";
  unlockMilestones.forEach((unlock) => {
    const unlocked = state.level >= unlock.level;
    const card = document.createElement("article");
    card.className = `appearance-item ${unlocked ? "is-unlocked" : "is-locked"}`;
    card.innerHTML = `
      <p class="appearance-level">Level ${unlock.level}</p>
      <h3>${unlock.name}</h3>
      <p>${unlock.description}</p>
      <span class="tag">${unlocked ? "Unlocked" : "Locked"}</span>
    `;
    unlocksList.appendChild(card);
  });

  const nextUnlock = unlockMilestones.find((unlock) => state.level < unlock.level);
  if (unlocksNextUnlock) {
    unlocksNextUnlock.textContent = nextUnlock
      ? `Next unlock at level ${nextUnlock.level}: ${nextUnlock.name}.`
      : "All unlock rewards claimed. Great work!";
  }
};

const renderParty = () => {
  partyList.innerHTML = "";
  state.party.forEach((member) => {
    const row = document.createElement("div");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${member.name}</strong>
        <div class="meta">${member.role} · ${member.status}</div>
      </div>
      <div class="data-actions">
        <button data-edit-party="${member.id}">Edit</button>
        <button class="danger" data-delete-party="${member.id}">Delete</button>
      </div>
    `;
    partyList.appendChild(row);
  });
};

const renderMeds = () => {
  medList.innerHTML = "";
  state.meds.forEach((med) => {
    const row = document.createElement("div");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${med.name}</strong>
        <div class="meta">${med.schedule}</div>
      </div>
      <div class="data-actions">
        <span class="xp-pill">${med.xp} XP</span>
        <button data-confirm-med="${med.id}">Confirm</button>
        <button data-edit-med="${med.id}">Edit</button>
        <button class="danger" data-delete-med="${med.id}">Delete</button>
      </div>
    `;
    medList.appendChild(row);
  });
};

const renderQuests = () => {
  questList.innerHTML = "";
  state.meds.forEach((med) => {
    const row = document.createElement("div");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${med.name}</strong>
        <div class="meta">Take at: ${med.schedule}</div>
      </div>
      <div class="data-actions">
        <span class="xp-pill">+${med.xp} XP</span>
      </div>
    `;
    questList.appendChild(row);
  });

  if (state.meds.length === 0) {
    questList.innerHTML = `<div class="data-row"><div><strong>No quests yet</strong><div class="meta">Add a medication in Meds to create quests.</div></div></div>`;
  }
};

const renderLog = () => {
  if (!doseLog) return;
  doseLog.innerHTML = "";
  if (state.history.length === 0) {
    doseLog.innerHTML = `<div class="data-row"><div><strong>No doses logged yet</strong><div class="meta">Confirm a medication to build your history.</div></div></div>`;
    return;
  }
  state.history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "data-row";
    row.innerHTML = `
      <div>
        <strong>${entry.name}</strong>
        <div class="meta">${entry.time}</div>
      </div>
      <div class="data-actions">
        <span class="xp-pill">+${entry.xp} XP</span>
      </div>
    `;
    doseLog.appendChild(row);
  });
};

const updateProfilePreview = () => {
  const displayName = profileName?.value.trim() || session?.fullName || "Alex Rivera";
  const username = profileHandle?.value.trim() || session?.username || "alexr";
  const email =
    profileEmailInput?.value.trim() ||
    `${username.replace(/^@/, "") || "alexr"}@mediquest.app`;
  const bioText =
    profileBioInput?.value.trim() || "Leveling up healthy habits one quest at a time.";
  const joinedText = profileJoinedInput?.value.trim() || profileState.joined;

  if (profileDisplayName) profileDisplayName.textContent = displayName;
  if (profileUsername) profileUsername.textContent = `@${username.replace(/^@/, "")}`;
  if (profileEmail) profileEmail.textContent = email;
  if (profileBio) profileBio.textContent = bioText;
  if (profileJoined) profileJoined.textContent = joinedText;
  if (statLevel) statLevel.textContent = String(state.level);
  if (statXp) statXp.textContent = String(state.xp);
  if (statParty) statParty.textContent = String(state.party.length);
  if (statMeds) statMeds.textContent = String(state.meds.length);
  if (statStreak) statStreak.textContent = "4 days";
  if (statQuests) statQuests.textContent = String(state.history.length);
};

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActivePanel(item.dataset.panel);
  });
});

jumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePanel(button.dataset.jump);
  });
});

addPartyMember?.addEventListener("click", () => {
  if (!partyName.value.trim()) return;
  const member = {
    id: Date.now(),
    name: partyName.value.trim(),
    role: partyRole.value.trim() || "Support",
    status: partyStatus.value.trim() || "New member",
  };
  state.party.push(member);
  partyName.value = "";
  partyRole.value = "";
  partyStatus.value = "";
  renderParty();
  updateProfilePreview();
});

partyList?.addEventListener("click", (event) => {
  const target = event.target;
  const editId = target.dataset.editParty;
  const deleteId = target.dataset.deleteParty;
  if (editId) {
    const member = state.party.find((item) => item.id === Number(editId));
    if (!member) return;
    partyName.value = member.name;
    partyRole.value = member.role;
    partyStatus.value = member.status;
    state.party = state.party.filter((item) => item.id !== Number(editId));
    renderParty();
    updateProfilePreview();
  }
  if (deleteId) {
    state.party = state.party.filter((item) => item.id !== Number(deleteId));
    renderParty();
    updateProfilePreview();
  }
});

addMed?.addEventListener("click", () => {
  if (!medName.value.trim()) return;
  const med = {
    id: Date.now(),
    name: medName.value.trim(),
    schedule: medTime.value.trim() || "Flexible schedule",
    xp: Number(medXp.value) || 5,
  };
  state.meds.push(med);
  medName.value = "";
  medTime.value = "";
  medXp.value = "10";
  renderMeds();
  renderQuests();
  updateProfilePreview();
});

medList?.addEventListener("click", (event) => {
  const target = event.target;
  const confirmId = target.dataset.confirmMed;
  const editId = target.dataset.editMed;
  const deleteId = target.dataset.deleteMed;
  if (confirmId) {
    const med = state.meds.find((item) => item.id === Number(confirmId));
    if (!med) return;
    state.xp += med.xp;
    state.history.unshift({ name: med.name, xp: med.xp, time: formatTime(new Date()) });
    updateXp();
    renderLog();
    updateProfilePreview();
  }
  if (editId) {
    const med = state.meds.find((item) => item.id === Number(editId));
    if (!med) return;
    medName.value = med.name;
    medTime.value = med.schedule;
    medXp.value = String(med.xp);
    state.meds = state.meds.filter((item) => item.id !== Number(editId));
    renderMeds();
    renderQuests();
    updateProfilePreview();
  }
  if (deleteId) {
    state.meds = state.meds.filter((item) => item.id !== Number(deleteId));
    renderMeds();
    renderQuests();
    updateProfilePreview();
  }
});

clearLog?.addEventListener("click", () => {
  state.history = [];
  renderLog();
  updateProfilePreview();
});

editProfileButton?.addEventListener("click", updateProfilePreview);

if (profileName && !profileName.value) {
  profileName.value = session?.fullName || "";
}
if (profileHandle && !profileHandle.value) {
  profileHandle.value = session?.username || "";
}
if (profileJoinedInput && !profileJoinedInput.value) {
  profileJoinedInput.value = profileState.joined;
}

renderParty();
renderMeds();
renderQuests();
renderLog();
updateProfilePreview();
updateXp();
setActivePanel("home");

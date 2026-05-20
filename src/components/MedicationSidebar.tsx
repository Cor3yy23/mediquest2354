// src/components/MedicationSidebar.tsx
import { Pill, Clock3, Bell, ListChecks, ChevronRight, ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";

type Medication = {
  id: number;
  name: string;
  schedule: string;
  xp: number;
  isActive: boolean;
};

type PhysicalTherapyTask = {
  id: number;
  title: string;
  instructions?: string | null;
  isActive: boolean;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  metaJson?: string | null;
};

type NotificationActionButton = {
  label: string;
  danger?: boolean;
  run: () => Promise<void> | void;
};

export function MedicationSidebar({
  isCollapsed,
  setIsCollapsed,
  meds,
  ptTasks,
  notifications,
  unreadActionableNotificationCount,
  getNotificationActions,
  onMarkNotificationRead,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  meds: Medication[];
  ptTasks: PhysicalTherapyTask[];
  notifications: NotificationItem[];
  unreadActionableNotificationCount: number;
  getNotificationActions: (notification: NotificationItem) => NotificationActionButton[] | null;
  onMarkNotificationRead: (id: number) => Promise<void> | void;
}) {
  const [view, setView] = useState<"today" | "all" | "notifications">("today");

  const activeMeds = useMemo(() => meds.filter((m) => m.isActive), [meds]);
  const activePtTasks = useMemo(() => ptTasks.filter((task) => task.isActive), [ptTasks]);

  const sortedNotifications = useMemo(() => {
    const unread = notifications.filter((item) => !item.readAt);
    const isActionable = (item: NotificationItem) => {
      const actions = getNotificationActions(item);
      return Boolean(actions && actions.length > 0);
    };
    const actionable = unread
      .filter(isActionable)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recent = unread
      .filter((item) => !isActionable(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { actionable, recent };
  }, [getNotificationActions, notifications]);

  return (
    <aside className={`quick-drawer-shell ${isCollapsed ? "is-collapsed" : ""}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`quick-drawer-toggle ${isCollapsed && unreadActionableNotificationCount > 0 ? "has-alert" : ""}`}
        type="button"
        aria-label={isCollapsed ? "Expand quick access drawer" : "Collapse quick access drawer"}
      >
        {isCollapsed && unreadActionableNotificationCount > 0 && (
          <span className="quick-drawer-toggle-alert-dot" aria-hidden="true" />
        )}
        {isCollapsed ? (
          <ChevronLeft className="quick-drawer-toggle-icon" />
        ) : (
          <ChevronRight className="quick-drawer-toggle-icon" />
        )}
      </button>

      <div className={`quick-drawer ${isCollapsed ? "is-collapsed" : ""}`} aria-hidden={isCollapsed}>
        <div className="quick-drawer-header">
          <h2>Quick Access Drawer</h2>
          <div className="quick-drawer-tabs">
            <button
              onClick={() => setView("today")}
              className={`quick-drawer-tab ${view === "today" ? "is-active" : ""}`}
              type="button"
            >
              Today
            </button>
            <button
              onClick={() => setView("all")}
              className={`quick-drawer-tab ${view === "all" ? "is-active" : ""}`}
              type="button"
            >
              All
            </button>
            <button
              onClick={() => setView("notifications")}
              className={`quick-drawer-tab ${view === "notifications" ? "is-active" : ""} ${unreadActionableNotificationCount > 0 ? "has-alert" : ""}`}
              type="button"
            >
              Notifications
              {unreadActionableNotificationCount > 0 && (
                <span className="quick-drawer-tab-badge" aria-label={`${unreadActionableNotificationCount} unread actionable notifications`}>
                  {unreadActionableNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="quick-drawer-body">
          {view === "notifications" ? (
            <>
              <section className="quick-drawer-section">
                <h3>Actionable</h3>
                {sortedNotifications.actionable.length === 0 ? (
                  <p className="quick-drawer-empty">No actionable unread notifications.</p>
                ) : (
                  sortedNotifications.actionable.map((item) => (
                    <article key={item.id} className="quick-drawer-item">
                      <div className="quick-drawer-item-icon"><Bell size={16} /></div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                        <span>{new Date(item.createdAt).toLocaleString("en-US")}</span>
                        <div className="quick-drawer-actions">
                          {(() => {
                            const actions = getNotificationActions(item) ?? [];
                            return actions.map((action) => (
                              <button
                                key={`${item.id}-${action.label}`}
                                className={action.danger ? "danger" : ""}
                                type="button"
                                onClick={() => void action.run()}
                              >
                                {action.label}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </section>
              <section className="quick-drawer-section">
                <h3>Recent</h3>
                {sortedNotifications.recent.length === 0 ? (
                  <p className="quick-drawer-empty">No additional unread notifications.</p>
                ) : (
                  sortedNotifications.recent.map((item) => (
                    <article key={item.id} className="quick-drawer-item">
                      <div className="quick-drawer-item-icon"><Bell size={16} /></div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                        <span>{new Date(item.createdAt).toLocaleString("en-US")}</span>
                        <div className="quick-drawer-actions">
                          <button type="button" onClick={() => void onMarkNotificationRead(item.id)}>Mark Read</button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : (
            <>
              <section className="quick-drawer-section">
                <h3>{view === "today" ? "Today's Medications" : "All Medications"}</h3>
                {(view === "today" ? activeMeds : meds).length === 0 ? (
                  <p className="quick-drawer-empty">No medications available.</p>
                ) : (
                  (view === "today" ? activeMeds : meds).map((med) => (
                    <article key={med.id} className="quick-drawer-item">
                      <div className="quick-drawer-item-icon"><Pill size={16} /></div>
                      <div>
                        <strong>{med.name}</strong>
                        <p>{med.schedule}</p>
                        <span>{med.xp} XP</span>
                      </div>
                    </article>
                  ))
                )}
              </section>
              <section className="quick-drawer-section">
                <h3>{view === "today" ? "Today's PT Tasks" : "All PT Tasks"}</h3>
                {(view === "today" ? activePtTasks : ptTasks).length === 0 ? (
                  <p className="quick-drawer-empty">No PT tasks available.</p>
                ) : (
                  (view === "today" ? activePtTasks : ptTasks).map((task) => (
                    <article key={task.id} className="quick-drawer-item">
                      <div className="quick-drawer-item-icon"><ListChecks size={16} /></div>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.instructions?.trim() ? task.instructions : "No instructions added."}</p>
                        <span>{task.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
        </div>

        <div className="quick-drawer-footer">
          {view === "notifications" ? (
            <p>
              <Bell size={14} />
              {notifications.filter((item) => !item.readAt).length} unread
            </p>
          ) : (
            <p>
              <Clock3 size={14} />
              {activeMeds.length} meds · {activePtTasks.length} PT tasks today
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

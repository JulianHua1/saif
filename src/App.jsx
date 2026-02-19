import { useEffect, useMemo, useReducer, useState } from "react";
import { DashboardView } from "./components/DashboardView";
import { QuranView } from "./components/QuranView";
import { JournalView } from "./components/JournalView";
import { ChecklistView } from "./components/ChecklistView";
import { getLocalDayKey, getWeekKey, formatFullTimestamp } from "./lib/date";
import { loadState, saveState } from "./lib/storage";

const DAILY_DEFAULT = ["Read Quran", "Dua after each prayer", "Hydration check", "Review goals"];
const WEEKLY_DEFAULT = ["Plan week around prayer times", "Family check-in", "Prepare Friday notes"];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "quran", label: "Quran Reading" },
  { id: "journal", label: "Journal" },
  { id: "checklists", label: "Checklists" }
];

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function createChecklistItems(titles, prefix) {
  return titles.map((title, index) => ({
    id: `${prefix}-${index + 1}`,
    title,
    done: false
  }));
}

function makeDefaultState(now = new Date()) {
  return {
    sessions: [],
    journal: [],
    checklists: {
      daily: createChecklistItems(DAILY_DEFAULT, "daily"),
      weekly: createChecklistItems(WEEKLY_DEFAULT, "weekly")
    },
    checklistMeta: {
      dailyStamp: getLocalDayKey(now),
      weekStamp: getWeekKey(now)
    }
  };
}

function sanitizeChecklists(rawChecklists, defaults) {
  const toItems = (input, fallback, prefix) => {
    if (!Array.isArray(input) || input.length === 0) {
      return fallback;
    }

    return input
      .map((item, index) => ({
        id: typeof item?.id === "string" ? item.id : `${prefix}-${index + 1}-${createId()}`,
        title: String(item?.title || "").trim(),
        done: Boolean(item?.done)
      }))
      .filter((item) => item.title.length > 0);
  };

  return {
    daily: toItems(rawChecklists?.daily, defaults.daily, "daily"),
    weekly: toItems(rawChecklists?.weekly, defaults.weekly, "weekly")
  };
}

function sanitizeState(raw) {
  const defaults = makeDefaultState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .map((session) => ({
          id: typeof session?.id === "string" ? session.id : createId(),
          endedAt: typeof session?.endedAt === "string" ? session.endedAt : new Date().toISOString(),
          durationSeconds: Math.max(0, Number(session?.durationSeconds) || 0),
          pagesRead: Math.max(0, Number(session?.pagesRead) || 0)
        }))
        .filter((session) => session.durationSeconds > 0)
        .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    : [];

  const journal = Array.isArray(raw.journal)
    ? raw.journal
        .map((entry) => ({
          id: typeof entry?.id === "string" ? entry.id : createId(),
          intention: String(entry?.intention || "").trim(),
          notes: String(entry?.notes || "").trim(),
          createdAt: typeof entry?.createdAt === "string" ? entry.createdAt : new Date().toISOString()
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const checklists = sanitizeChecklists(raw.checklists, defaults.checklists);

  return {
    sessions,
    journal,
    checklists,
    checklistMeta: {
      dailyStamp:
        typeof raw.checklistMeta?.dailyStamp === "string" ? raw.checklistMeta.dailyStamp : defaults.checklistMeta.dailyStamp,
      weekStamp: typeof raw.checklistMeta?.weekStamp === "string" ? raw.checklistMeta.weekStamp : defaults.checklistMeta.weekStamp
    }
  };
}

function runChecklistHousekeeping(state, now) {
  const dayStamp = getLocalDayKey(now);
  const weekStamp = getWeekKey(now);

  let changed = false;
  let next = state;

  if (state.checklistMeta.dailyStamp !== dayStamp) {
    changed = true;
    next = {
      ...next,
      checklists: {
        ...next.checklists,
        daily: next.checklists.daily.map((item) => ({ ...item, done: false }))
      },
      checklistMeta: {
        ...next.checklistMeta,
        dailyStamp: dayStamp
      }
    };
  }

  if (next.checklistMeta.weekStamp !== weekStamp) {
    changed = true;
    next = {
      ...next,
      checklists: {
        ...next.checklists,
        weekly: next.checklists.weekly.map((item) => ({ ...item, done: false }))
      },
      checklistMeta: {
        ...next.checklistMeta,
        weekStamp
      }
    };
  }

  return changed ? next : state;
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_SESSION": {
      if (!action.payload || action.payload.durationSeconds <= 0) return state;

      const nextSessions = [action.payload, ...state.sessions].sort(
        (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()
      );

      return { ...state, sessions: nextSessions };
    }

    case "ADD_JOURNAL_ENTRY": {
      if (!action.payload) return state;

      const nextJournal = [action.payload, ...state.journal].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return { ...state, journal: nextJournal };
    }

    case "ADD_CHECKLIST_ITEM": {
      const title = String(action.title || "").trim();
      const category = action.category;

      if (!title || !state.checklists[category]) return state;

      return {
        ...state,
        checklists: {
          ...state.checklists,
          [category]: [
            ...state.checklists[category],
            {
              id: createId(),
              title,
              done: false
            }
          ]
        }
      };
    }

    case "TOGGLE_CHECKLIST_ITEM": {
      const category = action.category;
      if (!state.checklists[category]) return state;

      return {
        ...state,
        checklists: {
          ...state.checklists,
          [category]: state.checklists[category].map((item) =>
            item.id === action.itemId ? { ...item, done: !item.done } : item
          )
        }
      };
    }

    case "DELETE_CHECKLIST_ITEM": {
      const category = action.category;
      if (!state.checklists[category]) return state;

      return {
        ...state,
        checklists: {
          ...state.checklists,
          [category]: state.checklists[category].filter((item) => item.id !== action.itemId)
        }
      };
    }

    case "RUN_HOUSEKEEPING":
      return runChecklistHousekeeping(state, new Date(action.now));

    default:
      return state;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const [state, dispatch] = useReducer(reducer, null, () => {
    const loaded = loadState();
    const sanitized = sanitizeState(loaded);
    return runChecklistHousekeeping(sanitized, new Date());
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch({
        type: "RUN_HOUSEKEEPING",
        now: Date.now()
      });
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const totals = useMemo(() => {
    const totalSeconds = state.sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalPages = state.sessions.reduce((sum, session) => sum + session.pagesRead, 0);

    return {
      totalSeconds,
      totalMinutes,
      totalPages
    };
  }, [state.sessions]);

  const statusLine =
    state.sessions.length === 0
      ? "Offline-first mode. No login required."
      : `Last saved session: ${formatFullTimestamp(state.sessions[0].endedAt)}`;

  const saveSession = ({ durationSeconds, pagesRead, endedAt }) => {
    dispatch({
      type: "ADD_SESSION",
      payload: {
        id: createId(),
        durationSeconds,
        pagesRead,
        endedAt
      }
    });
  };

  const addJournalEntry = ({ intention, notes, createdAt }) => {
    dispatch({
      type: "ADD_JOURNAL_ENTRY",
      payload: {
        id: createId(),
        intention,
        notes,
        createdAt
      }
    });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-kicker">SAIF</p>
          <h1>Ramadan Desk Companion</h1>
          <p>React desktop app. Fast. Local. Private.</p>
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeSection ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <h2>{NAV_ITEMS.find((item) => item.id === activeSection)?.label}</h2>
            <p>{statusLine}</p>
          </div>

          <div className="top-summary">
            <div>
              <strong>{totals.totalMinutes}</strong>
              <span>minutes</span>
            </div>
            <div>
              <strong>{totals.totalPages}</strong>
              <span>pages</span>
            </div>
            <div>
              <strong>{state.journal.length}</strong>
              <span>entries</span>
            </div>
          </div>
        </header>

        {activeSection === "dashboard" && (
          <DashboardView
            sessions={state.sessions}
            journal={state.journal}
            checklists={state.checklists}
            totals={totals}
          />
        )}

        {activeSection === "quran" && <QuranView sessions={state.sessions} onSaveSession={saveSession} />}

        {activeSection === "journal" && <JournalView journal={state.journal} onAddEntry={addJournalEntry} />}

        {activeSection === "checklists" && (
          <ChecklistView
            checklists={state.checklists}
            onToggleItem={(category, itemId) =>
              dispatch({
                type: "TOGGLE_CHECKLIST_ITEM",
                category,
                itemId
              })
            }
            onDeleteItem={(category, itemId) =>
              dispatch({
                type: "DELETE_CHECKLIST_ITEM",
                category,
                itemId
              })
            }
            onAddItem={(category, title) =>
              dispatch({
                type: "ADD_CHECKLIST_ITEM",
                category,
                title
              })
            }
          />
        )}
      </main>
    </div>
  );
}

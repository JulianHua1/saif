import { useEffect, useMemo, useReducer, useState } from "react";
import { DashboardView } from "./components/DashboardView";
import { QuranView } from "./components/QuranView";
import { JournalView } from "./components/JournalView";
import { ChecklistView } from "./components/ChecklistView";
import { PrayerTimesView } from "./components/PrayerTimesView";
import { NotificationsView } from "./components/NotificationsView";
import { QuotesView } from "./components/QuotesView";
import { SettingsView } from "./components/SettingsView";
import {
  getLocalDayKey,
  getWeekKey,
  formatFullTimestamp,
  getDayKeyInTimeZone,
  getMonthStampInTimeZone,
  formatCountdown,
  getMinutesSinceMidnightInTimeZone,
  getWeekdayIndexInTimeZone
} from "./lib/date";
import { loadState, saveState } from "./lib/storage";
import {
  PRAYER_EVENTS,
  CALCULATION_METHOD_OPTIONS,
  MADHAB_OPTIONS,
  DEFAULT_LOCATION,
  buildPrayerCacheKey,
  buildPrayerMonthSchedule,
  shiftMonth,
  getMonthLabel,
  getEventTimeline,
  findNextPrayerEvent,
  normalizeReminderMap,
  createDefaultPrayerSettings,
  makeTeachingRange,
  parseClockMinutes
} from "./lib/prayer";
import { QUOTES, quoteOfTheDay, normalizeFavoriteQuoteIds } from "./lib/quotes";

const DAILY_ACHIEVEMENTS = [
  "Prayed all prayers on time and all Sunnah rakas",
  "Read at least 1 page of Qur’an and act upon it",
  "Read the Tafsir of one verse",
  "Read one new Hadeeth and its meaning",
  "Prayed more than 1 fard prayer in a mosque (males)",
  "Pondered 10 minutes about struggling for this Deen",
  "Made Dua for my parents",
  "Did not do anything I was unsure about its permissibility",
  "Took care of my body",
  "Made the recommended Dhikr after every prayer",
  "Made my parents smile, hugged, and kissed them",
  "Attempted to increase in knowledge (Reading/Listening)",
  "Attempted to practice one rare Sunnah of Rasulullah (SAWS)",
  "Made Dua from a prepared list",
  "Made Dua for the Prophet (SAWS)",
  "Made tasbeeh and self-reflection",
  "Made repentance, Tawbah, and Istighfaar 100 times",
  "Was kind to family, friends & others",
  "Performed an act of charity",
  "Did not argue, swear, or backbite",
  "Did not harbor ill feelings in my heart against anyone",
  "Lowered gaze",
  "Made a Muslim smile",
  "Preserved or removed harm from the environment",
  "Taught soone a bit about Islam",
  "Made my afternoon Dhikr",
  "Did a special deed that is secret between myself and Allah",
  "Gave some of the extra food from Iftar to my neighbors",
  "Was a role model at work"
];

const EVENING_ACHIEVEMENTS = [
  "Prayed Taraweeh",
  "Prayed the Witr prayer",
  "Made Qunut/Dua for the Muslim Ummah in a prayer",
  "Pondered about my Death and the Day of Judgement",
  "Read Surah Mulk before going to sleep",
  "Went to sleep in a state of Wudu",
  "Went to sleep without ill feelings towards any Muslim",
  "Wrote down/updated my will",
  "Prayed a minimum of 2 rakah Tahajjud prayer",
  "Asked Allah for Jannah and refuge from Jahannam (x3)"
];

const WEEKLY_ACHIEVEMENTS = [
  "Memorized a minimum of 1/4 page of the Quran",
  "Fed/clothed one needy person or gave a gift",
  "Took extra care to maintain myself",
  "Memorized 1 hadeeth of Rasulullah (SAWS)",
  "Made Istikharah about an important matter"
];

const FRIDAY_ACHIEVEMENTS = [
  "Read Surah Kahf",
  "Fed/clothed one needy person or gave a gift",
  "Took extra care to maintain myself",
  "Memorized 1 hadeeth of Rasulullah (SAWS)",
  "Pondered 5-10 minutes about the khutbah & its message",
  "Attempted to join the hearts between 2 Muslims"
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "prayer", label: "Prayer Times" },
  { id: "quran", label: "Quran Reading" },
  { id: "journal", label: "Journal" },
  { id: "dailyChecklist", label: "Day Checklist" },
  { id: "eveningChecklist", label: "Evening Checklist" },
  { id: "weeklyChecklist", label: "Weekly Checklist" },
  { id: "fridayChecklist", label: "Friday Checklist" },
  { id: "notifications", label: "Notifications" },
  { id: "quotes", label: "Motivation" },
  { id: "settings", label: "Settings" }
];

const CHECKLIST_PAGE_META = {
  dailyChecklist: {
    category: "daily",
    title: "Achievements During the Day",
    description: "These reset daily."
  },
  eveningChecklist: {
    category: "evening",
    title: "Specific for the Evening",
    description: "These also reset daily."
  },
  weeklyChecklist: {
    category: "weekly",
    title: "Weekly Achievements",
    description: "These reset weekly."
  },
  fridayChecklist: {
    category: "friday",
    title: "Friday Achievements",
    description: "These reset weekly."
  }
};

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

function makeDefaultChecklists() {
  return {
    daily: createChecklistItems(DAILY_ACHIEVEMENTS, "daily"),
    evening: createChecklistItems(EVENING_ACHIEVEMENTS, "evening"),
    weekly: createChecklistItems(WEEKLY_ACHIEVEMENTS, "weekly"),
    friday: createChecklistItems(FRIDAY_ACHIEVEMENTS, "friday")
  };
}

function makeDefaultState(now = new Date()) {
  const settings = createDefaultPrayerSettings();
  const monthStamp = getMonthStampInTimeZone(now, settings.location.timeZone);

  return {
    sessions: [],
    journal: [],
    checklists: makeDefaultChecklists(),
    checklistMeta: {
      dayStamp: getLocalDayKey(now),
      weekStamp: getWeekKey(now)
    },
    settings,
    prayer: {
      selectedYear: monthStamp.year,
      selectedMonth: monthStamp.month,
      monthCache: {}
    },
    notifications: {
      activeReminders: [],
      snoozedReminders: [],
      sentLog: {}
    },
    favoriteQuoteIds: []
  };
}

function sanitizeChecklistCategory(input, fallback, prefix) {
  if (!Array.isArray(input) || input.length === 0) return fallback;

  const cleaned = input
    .map((item, index) => ({
      id: typeof item?.id === "string" ? item.id : `${prefix}-${index + 1}-${createId()}`,
      title: String(item?.title || "").trim(),
      done: Boolean(item?.done)
    }))
    .filter((item) => item.title.length > 0);

  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeTeachingSchedule(input) {
  const schedule = {};

  for (let day = 0; day <= 6; day += 1) {
    const dayKey = String(day);
    const ranges = input?.[dayKey];
    if (!Array.isArray(ranges)) {
      schedule[dayKey] = [];
      continue;
    }

    schedule[dayKey] = ranges
      .map((range) => ({
        id: typeof range?.id === "string" ? range.id : createId(),
        start: /^\d{2}:\d{2}$/.test(String(range?.start || "")) ? String(range.start) : "09:00",
        end: /^\d{2}:\d{2}$/.test(String(range?.end || "")) ? String(range.end) : "11:00"
      }))
      .filter((range) => range.start < range.end);
  }

  return schedule;
}

function sanitizeSettings(rawSettings) {
  const defaults = createDefaultPrayerSettings();

  const location = {
    name: String(rawSettings?.location?.name || defaults.location.name),
    latitude: Number.isFinite(Number(rawSettings?.location?.latitude))
      ? Number(rawSettings.location.latitude)
      : defaults.location.latitude,
    longitude: Number.isFinite(Number(rawSettings?.location?.longitude))
      ? Number(rawSettings.location.longitude)
      : defaults.location.longitude,
    timeZone: String(rawSettings?.location?.timeZone || defaults.location.timeZone)
  };

  const calculationMethod = CALCULATION_METHOD_OPTIONS.some((method) => method.id === rawSettings?.calculationMethod)
    ? rawSettings.calculationMethod
    : defaults.calculationMethod;

  const madhab = MADHAB_OPTIONS.some((option) => option.id === rawSettings?.madhab) ? rawSettings.madhab : defaults.madhab;

  return {
    ...defaults,
    location,
    calculationMethod,
    madhab,
    reminders: normalizeReminderMap(rawSettings?.reminders),
    quoteNotificationEnabled: Boolean(rawSettings?.quoteNotificationEnabled),
    quoteNotificationTime: /^\d{2}:\d{2}$/.test(String(rawSettings?.quoteNotificationTime || ""))
      ? String(rawSettings.quoteNotificationTime)
      : defaults.quoteNotificationTime,
    teachingMode: {
      enabled: Boolean(rawSettings?.teachingMode?.enabled),
      schedule: sanitizeTeachingSchedule(rawSettings?.teachingMode?.schedule)
    }
  };
}

function sanitizeMonthCache(input) {
  if (!input || typeof input !== "object") return {};

  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;

    const days = Array.isArray(value.days)
      ? value.days
          .map((day) => ({
            dayKey: typeof day?.dayKey === "string" ? day.dayKey : null,
            events: {
              suhoorEnd: typeof day?.events?.suhoorEnd === "string" ? day.events.suhoorEnd : null,
              fajr: typeof day?.events?.fajr === "string" ? day.events.fajr : null,
              sunrise: typeof day?.events?.sunrise === "string" ? day.events.sunrise : null,
              dhuhr: typeof day?.events?.dhuhr === "string" ? day.events.dhuhr : null,
              asr: typeof day?.events?.asr === "string" ? day.events.asr : null,
              maghrib: typeof day?.events?.maghrib === "string" ? day.events.maghrib : null,
              isha: typeof day?.events?.isha === "string" ? day.events.isha : null
            }
          }))
          .filter((day) => day.dayKey)
      : [];

    if (days.length === 0) return;

    output[key] = {
      year: Number(value.year) || null,
      month: Number(value.month) || null,
      generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : new Date().toISOString(),
      days
    };
  });

  return output;
}

function sanitizeNotifications(rawNotifications) {
  const activeReminders = Array.isArray(rawNotifications?.activeReminders)
    ? rawNotifications.activeReminders
        .map((reminder) => ({
          id: typeof reminder?.id === "string" ? reminder.id : createId(),
          title: String(reminder?.title || "Reminder"),
          message: String(reminder?.message || ""),
          createdAt: typeof reminder?.createdAt === "string" ? reminder.createdAt : new Date().toISOString()
        }))
        .slice(0, 30)
    : [];

  const snoozedReminders = Array.isArray(rawNotifications?.snoozedReminders)
    ? rawNotifications.snoozedReminders
        .map((reminder) => ({
          id: typeof reminder?.id === "string" ? reminder.id : createId(),
          title: String(reminder?.title || "Reminder"),
          message: String(reminder?.message || ""),
          wakeAt: typeof reminder?.wakeAt === "string" ? reminder.wakeAt : new Date().toISOString()
        }))
        .slice(0, 40)
    : [];

  const sentLog = rawNotifications?.sentLog && typeof rawNotifications.sentLog === "object" ? rawNotifications.sentLog : {};

  return {
    activeReminders,
    snoozedReminders,
    sentLog
  };
}

function sanitizeState(raw) {
  const defaults = makeDefaultState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const settings = sanitizeSettings(raw.settings);
  const monthStamp = getMonthStampInTimeZone(new Date(), settings.location.timeZone);

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

  const defaultChecklists = makeDefaultChecklists();
  const checklists = {
    daily: sanitizeChecklistCategory(raw.checklists?.daily, defaultChecklists.daily, "daily"),
    evening: sanitizeChecklistCategory(raw.checklists?.evening, defaultChecklists.evening, "evening"),
    weekly: sanitizeChecklistCategory(raw.checklists?.weekly, defaultChecklists.weekly, "weekly"),
    friday: sanitizeChecklistCategory(raw.checklists?.friday, defaultChecklists.friday, "friday")
  };

  const selectedYear = Number(raw.prayer?.selectedYear) || monthStamp.year;
  const selectedMonth = Number(raw.prayer?.selectedMonth) || monthStamp.month;

  return {
    sessions,
    journal,
    checklists,
    checklistMeta: {
      dayStamp:
        typeof raw.checklistMeta?.dayStamp === "string" ? raw.checklistMeta.dayStamp : defaults.checklistMeta.dayStamp,
      weekStamp: typeof raw.checklistMeta?.weekStamp === "string" ? raw.checklistMeta.weekStamp : defaults.checklistMeta.weekStamp
    },
    settings,
    prayer: {
      selectedYear,
      selectedMonth,
      monthCache: sanitizeMonthCache(raw.prayer?.monthCache)
    },
    notifications: sanitizeNotifications(raw.notifications),
    favoriteQuoteIds: normalizeFavoriteQuoteIds(raw.favoriteQuoteIds)
  };
}

function runChecklistHousekeeping(state, now) {
  const dayStamp = getLocalDayKey(now);
  const weekStamp = getWeekKey(now);

  let changed = false;
  let next = state;

  if (state.checklistMeta.dayStamp !== dayStamp) {
    changed = true;
    next = {
      ...next,
      checklists: {
        ...next.checklists,
        daily: next.checklists.daily.map((item) => ({ ...item, done: false })),
        evening: next.checklists.evening.map((item) => ({ ...item, done: false }))
      },
      checklistMeta: {
        ...next.checklistMeta,
        dayStamp
      }
    };
  }

  if (next.checklistMeta.weekStamp !== weekStamp) {
    changed = true;
    next = {
      ...next,
      checklists: {
        ...next.checklists,
        weekly: next.checklists.weekly.map((item) => ({ ...item, done: false })),
        friday: next.checklists.friday.map((item) => ({ ...item, done: false }))
      },
      checklistMeta: {
        ...next.checklistMeta,
        weekStamp
      }
    };
  }

  return changed ? next : state;
}

function ensureMonthCache(state, year, month, force = false, generatedAt = new Date().toISOString()) {
  const cacheKey = buildPrayerCacheKey(year, month, state.settings);
  const existing = state.prayer.monthCache[cacheKey];

  if (existing && !force) {
    return state;
  }

  const days = buildPrayerMonthSchedule(year, month, state.settings);
  if (!Array.isArray(days) || days.length === 0) {
    return state;
  }

  return {
    ...state,
    prayer: {
      ...state.prayer,
      monthCache: {
        ...state.prayer.monthCache,
        [cacheKey]: {
          year,
          month,
          generatedAt,
          days
        }
      }
    }
  };
}

function isWithinTeachingHours(now, settings) {
  if (!settings.teachingMode.enabled) return false;

  const weekdayIndex = getWeekdayIndexInTimeZone(now, settings.location.timeZone);
  const dayRanges = settings.teachingMode.schedule[String(weekdayIndex)] || [];
  if (dayRanges.length === 0) return false;

  const currentMinutes = getMinutesSinceMidnightInTimeZone(now, settings.location.timeZone);
  return dayRanges.some((range) => {
    const start = parseClockMinutes(range.start);
    const end = parseClockMinutes(range.end);
    if (start === null || end === null) return false;
    return currentMinutes >= start && currentMinutes < end;
  });
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

    case "SAVE_SETTINGS":
      return {
        ...state,
        settings: action.settings
      };

    case "SET_SELECTED_MONTH":
      return {
        ...state,
        prayer: {
          ...state.prayer,
          selectedYear: action.year,
          selectedMonth: action.month
        }
      };

    case "ENSURE_MONTH_CACHE": {
      const ensured = ensureMonthCache(state, action.year, action.month, Boolean(action.force), action.generatedAt);
      return ensured;
    }

    case "SET_REMINDER_OFFSETS": {
      return {
        ...state,
        settings: {
          ...state.settings,
          reminders: {
            ...state.settings.reminders,
            [action.eventKey]: action.offsets
          }
        }
      };
    }

    case "SET_QUOTE_NOTIFICATION_ENABLED": {
      return {
        ...state,
        settings: {
          ...state.settings,
          quoteNotificationEnabled: Boolean(action.enabled)
        }
      };
    }

    case "SET_QUOTE_NOTIFICATION_TIME": {
      return {
        ...state,
        settings: {
          ...state.settings,
          quoteNotificationTime: /^\d{2}:\d{2}$/.test(String(action.time || ""))
            ? String(action.time)
            : state.settings.quoteNotificationTime
        }
      };
    }

    case "SET_TEACHING_MODE_ENABLED": {
      return {
        ...state,
        settings: {
          ...state.settings,
          teachingMode: {
            ...state.settings.teachingMode,
            enabled: Boolean(action.enabled)
          }
        }
      };
    }

    case "ADD_TEACHING_RANGE": {
      const dayKey = String(action.dayKey);
      const current = state.settings.teachingMode.schedule[dayKey] || [];

      return {
        ...state,
        settings: {
          ...state.settings,
          teachingMode: {
            ...state.settings.teachingMode,
            schedule: {
              ...state.settings.teachingMode.schedule,
              [dayKey]: [...current, makeTeachingRange()]
            }
          }
        }
      };
    }

    case "UPDATE_TEACHING_RANGE": {
      const dayKey = String(action.dayKey);
      const current = state.settings.teachingMode.schedule[dayKey] || [];

      return {
        ...state,
        settings: {
          ...state.settings,
          teachingMode: {
            ...state.settings.teachingMode,
            schedule: {
              ...state.settings.teachingMode.schedule,
              [dayKey]: current.map((range) =>
                range.id === action.rangeId
                  ? {
                      ...range,
                      [action.field]: action.value
                    }
                  : range
              )
            }
          }
        }
      };
    }

    case "REMOVE_TEACHING_RANGE": {
      const dayKey = String(action.dayKey);
      const current = state.settings.teachingMode.schedule[dayKey] || [];

      return {
        ...state,
        settings: {
          ...state.settings,
          teachingMode: {
            ...state.settings.teachingMode,
            schedule: {
              ...state.settings.teachingMode.schedule,
              [dayKey]: current.filter((range) => range.id !== action.rangeId)
            }
          }
        }
      };
    }

    case "ACTIVATE_REMINDER": {
      if (action.logKey && state.notifications.sentLog[action.logKey]) return state;

      const reminder = {
        id: createId(),
        title: String(action.reminder?.title || "Reminder"),
        message: String(action.reminder?.message || ""),
        createdAt: action.reminder?.createdAt || new Date().toISOString()
      };

      const sentLog = action.logKey
        ? {
            ...state.notifications.sentLog,
            [action.logKey]: action.loggedAt || new Date().toISOString()
          }
        : state.notifications.sentLog;

      return {
        ...state,
        notifications: {
          ...state.notifications,
          activeReminders: [reminder, ...state.notifications.activeReminders].slice(0, 40),
          sentLog
        }
      };
    }

    case "DISMISS_REMINDER": {
      return {
        ...state,
        notifications: {
          ...state.notifications,
          activeReminders: state.notifications.activeReminders.filter((reminder) => reminder.id !== action.reminderId)
        }
      };
    }

    case "SNOOZE_REMINDER": {
      const reminder = state.notifications.activeReminders.find((item) => item.id === action.reminderId);
      if (!reminder) return state;

      const wakeAt = new Date(action.now + action.minutes * 60000).toISOString();

      return {
        ...state,
        notifications: {
          ...state.notifications,
          activeReminders: state.notifications.activeReminders.filter((item) => item.id !== action.reminderId),
          snoozedReminders: [
            ...state.notifications.snoozedReminders,
            {
              id: createId(),
              title: reminder.title,
              message: reminder.message,
              wakeAt
            }
          ].slice(-50)
        }
      };
    }

    case "WAKE_SNOOZED_REMINDERS": {
      const nowMs = action.now;
      const due = state.notifications.snoozedReminders.filter((item) => new Date(item.wakeAt).getTime() <= nowMs);
      if (due.length === 0) return state;

      const remaining = state.notifications.snoozedReminders.filter((item) => new Date(item.wakeAt).getTime() > nowMs);
      const woke = due.map((item) => ({
        id: createId(),
        title: `${item.title} (Snoozed)`,
        message: item.message,
        createdAt: new Date(nowMs).toISOString()
      }));

      return {
        ...state,
        notifications: {
          ...state.notifications,
          activeReminders: [...woke, ...state.notifications.activeReminders].slice(0, 40),
          snoozedReminders: remaining
        }
      };
    }

    case "TOGGLE_FAVORITE_QUOTE": {
      const quoteId = action.quoteId;
      if (!quoteId) return state;

      const exists = state.favoriteQuoteIds.includes(quoteId);
      return {
        ...state,
        favoriteQuoteIds: exists
          ? state.favoriteQuoteIds.filter((id) => id !== quoteId)
          : [...state.favoriteQuoteIds, quoteId]
      };
    }

    default:
      return state;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [nowMs, setNowMs] = useState(Date.now());
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });

  const [state, dispatch] = useReducer(reducer, null, () => {
    const loaded = loadState();
    const sanitized = sanitizeState(loaded);
    return runChecklistHousekeeping(sanitized, new Date());
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch({
        type: "RUN_HOUSEKEEPING",
        now: Date.now()
      });
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const settingsSignature = `${state.settings.location.latitude}|${state.settings.location.longitude}|${state.settings.location.timeZone}|${state.settings.calculationMethod}|${state.settings.madhab}`;
  const nowMonth = getMonthStampInTimeZone(nowMs, state.settings.location.timeZone);
  const tomorrowMonth = getMonthStampInTimeZone(nowMs + 86400000, state.settings.location.timeZone);

  useEffect(() => {
    const uniqueTargets = new Map();

    [
      { year: state.prayer.selectedYear, month: state.prayer.selectedMonth },
      { year: nowMonth.year, month: nowMonth.month },
      { year: tomorrowMonth.year, month: tomorrowMonth.month }
    ].forEach((target) => {
      uniqueTargets.set(`${target.year}-${target.month}`, target);
    });

    uniqueTargets.forEach((target) => {
      dispatch({
        type: "ENSURE_MONTH_CACHE",
        year: target.year,
        month: target.month,
        force: false,
        generatedAt: new Date().toISOString()
      });
    });
  }, [
    state.prayer.selectedYear,
    state.prayer.selectedMonth,
    nowMonth.year,
    nowMonth.month,
    tomorrowMonth.year,
    tomorrowMonth.month,
    settingsSignature
  ]);

  const selectedCacheKey = buildPrayerCacheKey(state.prayer.selectedYear, state.prayer.selectedMonth, state.settings);
  const selectedMonthEntry = state.prayer.monthCache[selectedCacheKey];

  const todayDayKey = getDayKeyInTimeZone(nowMs, state.settings.location.timeZone);
  const tomorrowDayKey = getDayKeyInTimeZone(nowMs + 86400000, state.settings.location.timeZone);

  const todayCacheKey = buildPrayerCacheKey(nowMonth.year, nowMonth.month, state.settings);
  const tomorrowCacheKey = buildPrayerCacheKey(tomorrowMonth.year, tomorrowMonth.month, state.settings);
  const todayMonthEntry = state.prayer.monthCache[todayCacheKey];
  const tomorrowMonthEntry = state.prayer.monthCache[tomorrowCacheKey];

  const todayPrayerEntry = todayMonthEntry?.days?.find((day) => day.dayKey === todayDayKey) || null;
  const tomorrowPrayerEntry = tomorrowMonthEntry?.days?.find((day) => day.dayKey === tomorrowDayKey) || null;

  const nextPrayerEvent = findNextPrayerEvent(todayPrayerEntry, tomorrowPrayerEntry, nowMs);
  const countdownText = nextPrayerEvent ? formatCountdown(nextPrayerEvent.timeISO, nowMs) : "--:--:--";
  const todayTimeline = getEventTimeline(todayPrayerEntry);
  const monthSchedule = selectedMonthEntry?.days || [];
  const monthLabel = getMonthLabel(state.prayer.selectedYear, state.prayer.selectedMonth, state.settings.location.timeZone);
  const dailyQuote = quoteOfTheDay(todayDayKey);

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
      ? `Offline-first mode. ${state.settings.location.name} (${state.settings.location.timeZone}).`
      : `Last saved session: ${formatFullTimestamp(state.sessions[0].endedAt)} | ${state.settings.location.name}`;

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

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    } catch {
      setNotificationPermission(Notification.permission);
    }
  };

  const showDesktopNotification = (title, message, silent = false) => {
    if (typeof Notification === "undefined") return;
    if (notificationPermission !== "granted") return;

    try {
      new Notification(title, {
        body: message,
        silent
      });
    } catch {
      // Keep reminder center usable even if desktop notifications fail.
    }
  };

  const reminderTick = Math.floor(nowMs / 15000);

  useEffect(() => {
    if (typeof Notification !== "undefined" && notificationPermission !== Notification.permission) {
      setNotificationPermission(Notification.permission);
    }

    const dueSnoozed = state.notifications.snoozedReminders.filter((item) => new Date(item.wakeAt).getTime() <= nowMs);
    if (dueSnoozed.length > 0) {
      dispatch({ type: "WAKE_SNOOZED_REMINDERS", now: nowMs });
      dueSnoozed.forEach((reminder) => {
        const silent = isWithinTeachingHours(nowMs, state.settings);
        showDesktopNotification(`${reminder.title} (Snoozed)`, reminder.message, silent);
      });
    }

    const dueReminderPayloads = [];
    const nowISO = new Date(nowMs).toISOString();

    [todayPrayerEntry, tomorrowPrayerEntry].forEach((dayEntry) => {
      if (!dayEntry) return;

      PRAYER_EVENTS.forEach((event) => {
        const eventTimeISO = dayEntry.events[event.key];
        const eventMs = new Date(eventTimeISO).getTime();
        if (!Number.isFinite(eventMs)) return;

        const offsets = state.settings.reminders[event.key] || [];

        offsets.forEach((offset) => {
          const triggerMs = eventMs - Number(offset) * 60000;
          const missedByMs = nowMs - triggerMs;
          if (missedByMs < 0 || missedByMs > 120000) return;
          if (nowMs > eventMs + 45000) return;

          const logKey = `prayer:${event.key}:${dayEntry.dayKey}:${offset}`;
          if (state.notifications.sentLog[logKey]) return;

          const label = event.label;
          const clock = new Date(eventTimeISO).toLocaleTimeString(undefined, {
            timeZone: state.settings.location.timeZone,
            hour: "2-digit",
            minute: "2-digit"
          });

          dueReminderPayloads.push({
            logKey,
            title: label,
            message:
              Number(offset) === 0 ? `${label} is now (${clock}).` : `${label} at ${clock}. ${offset} minute reminder.`,
            createdAt: nowISO,
            silent: isWithinTeachingHours(nowMs, state.settings)
          });
        });
      });
    });

    if (state.settings.quoteNotificationEnabled) {
      const quoteTarget = parseClockMinutes(state.settings.quoteNotificationTime);
      const nowMinutes = getMinutesSinceMidnightInTimeZone(nowMs, state.settings.location.timeZone);
      const quoteLogKey = `quote:${todayDayKey}`;

      if (quoteTarget !== null && nowMinutes >= quoteTarget && nowMinutes < quoteTarget + 1 && !state.notifications.sentLog[quoteLogKey]) {
        dueReminderPayloads.push({
          logKey: quoteLogKey,
          title: "Daily Motivation",
          message: dailyQuote ? `${dailyQuote.theme}: ${dailyQuote.text}` : "Keep your worship sincere and consistent.",
          createdAt: nowISO,
          silent: isWithinTeachingHours(nowMs, state.settings)
        });
      }
    }

    dueReminderPayloads.forEach((payload) => {
      dispatch({
        type: "ACTIVATE_REMINDER",
        logKey: payload.logKey,
        loggedAt: payload.createdAt,
        reminder: {
          title: payload.title,
          message: payload.message,
          createdAt: payload.createdAt
        }
      });
      showDesktopNotification(payload.title, payload.message, payload.silent);
    });
  }, [
    reminderTick,
    nowMs,
    todayPrayerEntry,
    tomorrowPrayerEntry,
    state.settings,
    state.notifications.snoozedReminders,
    state.notifications.sentLog,
    dailyQuote,
    todayDayKey,
    notificationPermission
  ]);

  const activeChecklistMeta = CHECKLIST_PAGE_META[activeSection];

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
            nextEvent={nextPrayerEvent}
            countdownText={countdownText}
            dailyQuote={dailyQuote}
            lastPrayerRefresh={selectedMonthEntry?.generatedAt}
            timeZone={state.settings.location.timeZone}
          />
        )}

        {activeSection === "prayer" && (
          <PrayerTimesView
            settings={state.settings}
            todayTimeline={todayTimeline}
            nextEvent={nextPrayerEvent}
            countdownText={countdownText}
            monthSchedule={monthSchedule}
            monthLabel={monthLabel}
            onPrevMonth={() => {
              const previous = shiftMonth(state.prayer.selectedYear, state.prayer.selectedMonth, -1);
              dispatch({ type: "SET_SELECTED_MONTH", year: previous.year, month: previous.month });
            }}
            onNextMonth={() => {
              const next = shiftMonth(state.prayer.selectedYear, state.prayer.selectedMonth, 1);
              dispatch({ type: "SET_SELECTED_MONTH", year: next.year, month: next.month });
            }}
            onRefresh={() =>
              dispatch({
                type: "ENSURE_MONTH_CACHE",
                year: state.prayer.selectedYear,
                month: state.prayer.selectedMonth,
                force: true,
                generatedAt: new Date().toISOString()
              })
            }
            lastRefreshedAt={selectedMonthEntry?.generatedAt}
          />
        )}

        {activeSection === "quran" && <QuranView sessions={state.sessions} onSaveSession={saveSession} />}

        {activeSection === "journal" && <JournalView journal={state.journal} onAddEntry={addJournalEntry} />}

        {activeChecklistMeta && (
          <ChecklistView
            title={activeChecklistMeta.title}
            description={activeChecklistMeta.description}
            items={state.checklists[activeChecklistMeta.category]}
            onToggleItem={(itemId) =>
              dispatch({
                type: "TOGGLE_CHECKLIST_ITEM",
                category: activeChecklistMeta.category,
                itemId
              })
            }
            onDeleteItem={(itemId) =>
              dispatch({
                type: "DELETE_CHECKLIST_ITEM",
                category: activeChecklistMeta.category,
                itemId
              })
            }
            onAddItem={(title) =>
              dispatch({
                type: "ADD_CHECKLIST_ITEM",
                category: activeChecklistMeta.category,
                title
              })
            }
          />
        )}

        {activeSection === "notifications" && (
          <NotificationsView
            settings={state.settings}
            notificationPermission={notificationPermission}
            onRequestPermission={requestNotificationPermission}
            onSetReminderOffsets={(eventKey, offsets) =>
              dispatch({
                type: "SET_REMINDER_OFFSETS",
                eventKey,
                offsets
              })
            }
            onSetQuoteNotificationEnabled={(enabled) =>
              dispatch({
                type: "SET_QUOTE_NOTIFICATION_ENABLED",
                enabled
              })
            }
            onSetQuoteNotificationTime={(time) =>
              dispatch({
                type: "SET_QUOTE_NOTIFICATION_TIME",
                time
              })
            }
            onSetTeachingModeEnabled={(enabled) =>
              dispatch({
                type: "SET_TEACHING_MODE_ENABLED",
                enabled
              })
            }
            onAddTeachingRange={(dayKey) =>
              dispatch({
                type: "ADD_TEACHING_RANGE",
                dayKey
              })
            }
            onUpdateTeachingRange={(dayKey, rangeId, field, value) =>
              dispatch({
                type: "UPDATE_TEACHING_RANGE",
                dayKey,
                rangeId,
                field,
                value
              })
            }
            onRemoveTeachingRange={(dayKey, rangeId) =>
              dispatch({
                type: "REMOVE_TEACHING_RANGE",
                dayKey,
                rangeId
              })
            }
            activeReminders={state.notifications.activeReminders}
            onSnoozeReminder={(reminderId, minutes) =>
              dispatch({
                type: "SNOOZE_REMINDER",
                reminderId,
                minutes,
                now: nowMs
              })
            }
            onDismissReminder={(reminderId) =>
              dispatch({
                type: "DISMISS_REMINDER",
                reminderId
              })
            }
          />
        )}

        {activeSection === "quotes" && (
          <QuotesView
            featuredQuote={dailyQuote}
            quotes={QUOTES}
            favoriteQuoteIds={state.favoriteQuoteIds}
            onToggleFavorite={(quoteId) =>
              dispatch({
                type: "TOGGLE_FAVORITE_QUOTE",
                quoteId
              })
            }
          />
        )}

        {activeSection === "settings" && (
          <SettingsView
            settings={state.settings}
            methodOptions={CALCULATION_METHOD_OPTIONS}
            madhabOptions={MADHAB_OPTIONS}
            onSaveSettings={(nextSettings) =>
              dispatch({
                type: "SAVE_SETTINGS",
                settings: nextSettings
              })
            }
          />
        )}
      </main>
    </div>
  );
}

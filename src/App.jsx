import { useEffect, useReducer, useState } from "react";
import { DashboardView } from "./components/DashboardView";
import { ChecklistsView } from "./components/ChecklistsView";
import { QuranView } from "./components/QuranView";
import { PrayerTimesView } from "./components/PrayerTimesView";
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
  buildPrayerCacheKey,
  buildPrayerMonthSchedule,
  shiftMonth,
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
  "Read Surah Mulk before going to sleep"
];

const WEEKLY_ACHIEVEMENTS = [
  "Memorized a minimum of 1/4 page of the Quran",
  "Fed/clothed one needy person or gave a gift",
  "Took extra care to maintain myself",
  "Memorized 1 hadeeth of Rasulullah (SAWS)",
  "Made Istikharah about an important matter",
  "Read Surah Kahf on Friday",
  "Pondered 5-10 minutes about the khutbah and its message",
  "Attempted to join the hearts between two Muslims",
  "Sent abundant salawat on the Prophet (SAWS)",
  "Made dua in the final hour before Maghrib on Friday",
  "Visited or called family ties with good character",
  "Gave a dedicated weekly act of charity"
];

const MORNING_ACHIEVEMENTS = [
  "Ate suhoor (Pre-dawn meal)",
  "Fajr on time",
  "Made my morning dhikr"
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Today Dashboard", icon: "solar:home-smile-linear" },
  { id: "monthly", label: "Monthly View", icon: "solar:calendar-date-linear" },
  { id: "quran", label: "Qur'an Reading", icon: "solar:book-bookmark-linear" },
  { id: "checklists", label: "Daily Deeds", icon: "solar:checklist-minimalistic-linear" },
  { id: "quotes", label: "Wisdom Library", icon: "solar:library-linear" },
  { id: "settings", label: "Settings", icon: "solar:settings-linear" }
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

function makeDefaultChecklists() {
  return {
    morning: createChecklistItems(MORNING_ACHIEVEMENTS, "morning"),
    daily: createChecklistItems(DAILY_ACHIEVEMENTS, "daily"),
    evening: createChecklistItems(EVENING_ACHIEVEMENTS, "evening"),
    weekly: createChecklistItems(WEEKLY_ACHIEVEMENTS, "weekly")
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

function sanitizeChecklistCategory(input, fallback, prefix, strictLength = false) {
  if (!Array.isArray(input) || input.length === 0) return fallback;

  const cleaned = input
    .map((item, index) => ({
      id: typeof item?.id === "string" ? item.id : `${prefix}-${index + 1}-${createId()}`,
      title: String(item?.title || "").trim(),
      done: Boolean(item?.done)
    }))
    .filter((item) => item.title.length > 0);

  if (strictLength && cleaned.length !== fallback.length) return fallback;
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
    morning: sanitizeChecklistCategory(raw.checklists?.morning, defaultChecklists.morning, "morning", true),
    daily: sanitizeChecklistCategory(raw.checklists?.daily, defaultChecklists.daily, "daily", true),
    evening: sanitizeChecklistCategory(raw.checklists?.evening, defaultChecklists.evening, "evening", true),
    weekly: sanitizeChecklistCategory(raw.checklists?.weekly, defaultChecklists.weekly, "weekly", true)
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
        morning: next.checklists.morning.map((item) => ({ ...item, done: false })),
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

function formatHijriDateLabel(value, timeZone) {
  try {
    const text = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(value);

    return text.replace(",", "").replace("AH", "").trim();
  } catch {
    return "";
  }
}

function compactEventLabel(event) {
  if (!event?.label) return "";
  if (event.key === "maghrib") return "Iftar";
  return event.label.replace(" (Iftar)", "");
}

function formatIslamicYear(value, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      timeZone,
      year: "numeric"
    }).formatToParts(value);
    return parts.find((part) => part.type === "year")?.value || "";
  } catch {
    return "";
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
  const dailyQuote = quoteOfTheDay(todayDayKey);

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

  const hijriLabel = formatHijriDateLabel(nowMs, state.settings.location.timeZone);
  const dashboardSubtitle = [state.settings.location.name, hijriLabel].filter(Boolean).join(" • ");
  const nextEventClock = nextPrayerEvent
    ? new Date(nextPrayerEvent.timeISO).toLocaleTimeString(undefined, {
        timeZone: state.settings.location.timeZone,
        hour: "numeric",
        minute: "2-digit"
      })
    : null;
  const nextEventLabel = compactEventLabel(nextPrayerEvent);
  const headerCountdownLabel = nextEventLabel ? `Until ${nextEventLabel}` : "Until Prayer";
  const activePageLabel = NAV_ITEMS.find((item) => item.id === activeSection)?.label || "Ramadan Desk";
  const isDashboard = activeSection === "dashboard";
  const isMonthly = activeSection === "monthly";
  const isQuran = activeSection === "quran";
  const isChecklists = activeSection === "checklists";
  const isQuotes = activeSection === "quotes";
  const isSettings = activeSection === "settings";
  const isCompactShell = isChecklists || isQuotes || isSettings;
  const selectedMonthDate = new Date(Date.UTC(state.prayer.selectedYear, state.prayer.selectedMonth - 1, 1, 12, 0, 0));
  const islamicYear = formatIslamicYear(selectedMonthDate, state.settings.location.timeZone);
  const calendarBadge = `${islamicYear || "1447"} AH / ${state.prayer.selectedYear} AD`;
  const contentWrapperClass = isMonthly
    ? "p-6 md:p-10 max-w-7xl mx-auto space-y-8 relative z-10"
    : isQuran
      ? "p-6 md:p-10 max-w-5xl mx-auto space-y-6 relative z-10"
      : isChecklists
        ? "p-4 md:p-6 max-w-4xl mx-auto space-y-5 relative z-10"
      : isQuotes
        ? "p-4 md:p-6 max-w-6xl mx-auto space-y-5 relative z-10"
      : isSettings
        ? "p-4 md:p-6 max-w-2xl mx-auto space-y-6 relative z-10 pb-12"
      : "p-6 md:p-10 max-w-6xl mx-auto space-y-8 relative z-10";

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <aside
        className={
          isCompactShell
            ? "w-64 bg-[#143d34] text-[#e8e6e1] border-r border-[#1f4f44] flex-col justify-between hidden md:flex relative z-20 shadow-xl flex-shrink-0"
            : "w-64 bg-[#143d34] text-[#e8e6e1] border-r border-[#1f4f44] flex-col justify-between hidden md:flex relative z-20 shadow-xl"
        }
      >
        <div className={isCompactShell ? "p-6 pb-2" : "p-8 pb-4"}>
          <div className={isCompactShell ? "mb-1" : "mb-2"}>
            <h1 className={isCompactShell ? "text-xl font-medium tracking-wide serif-font text-[#f0ebe0]" : "text-2xl font-medium tracking-wide serif-font text-[#f0ebe0]"}>
              Ramadan Desk
            </h1>
          </div>
          <p className="text-xs text-[#a0b5b0] font-light pl-1 opacity-70 tracking-wide font-sans">Focus, Prayer, Peace</p>
        </div>

        <nav className={isCompactShell ? "flex-1 px-3 py-4 space-y-1 overflow-y-auto" : "flex-1 px-4 py-6 space-y-1.5 overflow-y-auto"}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setActiveSection(item.id);
              }}
              className={
                item.id === activeSection
                  ? isCompactShell
                    ? "flex items-center gap-3 px-3 py-2.5 bg-[#1e4d42] text-[#d4af37] border border-[#265c50] rounded-lg shadow-sm group transition-all"
                    : "flex items-center gap-3 px-4 py-3 bg-[#1e4d42] text-[#d4af37] border border-[#265c50] rounded-xl shadow-sm group transition-all"
                  : isCompactShell
                    ? "flex items-center gap-3 px-3 py-2.5 text-[#b0c4c0] hover:text-[#f0ebe0] hover:bg-[#1e4d42]/50 rounded-lg transition-colors"
                    : "flex items-center gap-3 px-4 py-3 text-[#b0c4c0] hover:text-[#f0ebe0] hover:bg-[#1e4d42]/50 rounded-xl transition-colors"
              }
            >
              <iconify-icon icon={item.icon} width={isCompactShell ? "18" : "20"} stroke-width="1.5" />
              <span
                className={
                  item.id === activeSection
                    ? isCompactShell
                      ? `text-xs font-medium${item.id === "quran" ? " tracking-wide" : ""}`
                      : "text-sm font-medium tracking-wide"
                    : isCompactShell
                      ? `text-xs font-medium${item.id === "quran" ? " tracking-wide" : ""}`
                      : "text-sm font-medium"
                }
              >
                {item.label}
              </span>
            </a>
          ))}
        </nav>

        <div className={isCompactShell ? "p-5 border-t border-[#1f4f44] bg-[#11352d]" : "p-6 border-t border-[#1f4f44] bg-[#11352d]"}>
          <div className={isCompactShell ? "flex items-center gap-2 mb-1.5 text-[#8aa39e]" : "flex items-center gap-2 mb-2 text-[#8aa39e]"}>
            <iconify-icon icon="solar:map-point-linear" width={isCompactShell ? "12" : "14"} />
            <span className={isCompactShell ? "text-[10px] font-medium uppercase tracking-widest" : "text-xs font-medium uppercase tracking-widest"}>
              {state.settings.location.name.toUpperCase()}
            </span>
          </div>
          <div className={isCompactShell ? "space-y-0.5" : "space-y-1"}>
            <p className={isCompactShell ? "text-[10px] text-[#a0b5b0] opacity-80" : "text-xs text-[#a0b5b0] opacity-80"}>
              {nextEventClock && nextEventLabel ? `Next: ${nextEventLabel} ${nextEventClock}` : "Prayer schedule unavailable"}
            </p>
            <p className={isCompactShell ? "text-xs serif-font text-[#d4af37] italic tracking-wide" : "text-sm serif-font text-[#d4af37] italic tracking-wide"}>
              {countdownText}
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#f2f0e9]">
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#143d34 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        {isCompactShell && (
          <div className="absolute top-20 right-0 z-0 opacity-[0.05] pointer-events-none transform translate-x-10 text-[#143d34]">
            <iconify-icon icon="solar:moon-bold" width="500" />
          </div>
        )}

        <header
          className={
            isCompactShell
              ? "sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#f2f0e9]/95 backdrop-blur-sm border-b border-[#e6e2d6]"
              : "sticky top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10 bg-[#f2f0e9]/95 backdrop-blur-sm border-b border-[#e6e2d6]"
          }
        >
          {isDashboard && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-normal text-[#143d34] serif-font">Ahlan wa Sahlan</h2>
                <div className="flex items-center gap-2 text-stone-500 text-xs mt-1 font-medium">
                  <iconify-icon icon="solar:globe-linear" width="12" />
                  <span>{dashboardSubtitle}</span>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#e8e6e1] rounded-full border border-[#dcd9ce]">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">{headerCountdownLabel}</span>
              </div>
            </>
          )}

          {isMonthly && (
            <div>
              <h2 className="text-xl md:text-2xl font-normal text-[#143d34] serif-font">Ramadan Calendar</h2>
              <div className="flex items-center gap-2 text-stone-500 text-xs mt-1 font-medium">
                <span className="bg-[#e6e2d6] px-1.5 py-0.5 rounded text-[#143d34]/80">{calendarBadge}</span>
              </div>
            </div>
          )}

          {isQuran && (
            <div>
              <h2 className="text-xl md:text-2xl font-normal text-[#143d34] serif-font">Qur'an Reading</h2>
              <div className="flex items-center gap-2 text-stone-500 text-xs mt-1 font-medium">
                <span className="bg-[#e6e2d6] px-1.5 py-0.5 rounded text-[#143d34]/80">Focus timer, daily graph, and journal</span>
              </div>
            </div>
          )}

          {isChecklists && (
            <div>
              <h2 className="text-lg font-normal text-[#143d34] serif-font">Checklists</h2>
              <div className="flex items-center gap-2 text-stone-500 text-[10px] mt-0.5 font-medium">
                <span className="bg-[#e6e2d6] px-1.5 py-0.5 rounded text-[#143d34]/80">Open each section and tick through it</span>
              </div>
            </div>
          )}

          {isQuotes && (
            <div>
              <h2 className="text-lg font-normal text-[#143d34] serif-font">Quote Library</h2>
              <div className="flex items-center gap-2 text-stone-500 text-[10px] mt-0.5 font-medium">
                <span className="bg-[#e6e2d6] px-1.5 py-0.5 rounded text-[#143d34]/80">
                  Curated reminders for sabr, shukr, discipline, service, and Ramadan virtues.
                </span>
              </div>
            </div>
          )}

          {isSettings && (
            <div>
              <h2 className="text-lg font-normal text-[#143d34] serif-font">Settings</h2>
              <div className="flex items-center gap-2 text-stone-500 text-[10px] mt-0.5 font-medium">
                <span className="bg-[#e6e2d6] px-1.5 py-0.5 rounded text-[#143d34]/80">Manage your preferences and notifications</span>
              </div>
            </div>
          )}

          {!isDashboard && !isMonthly && !isQuran && !isChecklists && !isQuotes && !isSettings && (
            <div>
              <h2 className="text-xl md:text-2xl font-normal text-[#143d34] serif-font">{activePageLabel}</h2>
              <div className="flex items-center gap-2 text-stone-500 text-xs mt-1 font-medium">
                <span>{statusLine}</span>
              </div>
            </div>
          )}

          <button type="button" className="md:hidden text-[#143d34] border-0 bg-transparent p-0" aria-label="Open menu">
            <iconify-icon icon="solar:hamburger-menu-linear" width="24" />
          </button>
        </header>

        <div className={contentWrapperClass}>
          {activeSection === "dashboard" && (
            <DashboardView
              checklists={state.checklists}
              nextEvent={nextPrayerEvent}
              countdownText={countdownText}
              todayTimeline={todayTimeline}
              nowMs={nowMs}
              timeZone={state.settings.location.timeZone}
              onOpenMonthlyView={() => setActiveSection("monthly")}
              onOpenQuranView={() => setActiveSection("quran")}
            />
          )}

          {activeSection === "monthly" && (
            <PrayerTimesView
              settings={state.settings}
              selectedYear={state.prayer.selectedYear}
              selectedMonth={state.prayer.selectedMonth}
              monthSchedule={monthSchedule}
              onPrevMonth={() => {
                const previous = shiftMonth(state.prayer.selectedYear, state.prayer.selectedMonth, -1);
                dispatch({ type: "SET_SELECTED_MONTH", year: previous.year, month: previous.month });
              }}
              onNextMonth={() => {
                const next = shiftMonth(state.prayer.selectedYear, state.prayer.selectedMonth, 1);
                dispatch({ type: "SET_SELECTED_MONTH", year: next.year, month: next.month });
              }}
              onGoToCurrentMonth={() => {
                dispatch({
                  type: "SET_SELECTED_MONTH",
                  year: nowMonth.year,
                  month: nowMonth.month
                });
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

          {activeSection === "checklists" && (
            <ChecklistsView
              checklists={state.checklists}
              onToggleItem={(category, itemId) =>
                dispatch({
                  type: "TOGGLE_CHECKLIST_ITEM",
                  category,
                  itemId
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
              notificationPermission={notificationPermission}
              onRequestNotificationAccess={async () => {
                if (typeof Notification === "undefined") return "unsupported";

                try {
                  const permission = await Notification.requestPermission();
                  setNotificationPermission(permission);
                  return permission;
                } catch {
                  return notificationPermission;
                }
              }}
              onSaveSettings={(nextSettings) =>
                dispatch({
                  type: "SAVE_SETTINGS",
                  settings: nextSettings
                })
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}

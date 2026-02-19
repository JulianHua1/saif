import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from "adhan";

export const PRAYER_EVENTS = [
  { key: "suhoorEnd", label: "Suhoor/Sehar End (Fajr Start)" },
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib (Iftar)" },
  { key: "isha", label: "Isha" }
];

export const CALCULATION_METHOD_OPTIONS = [
  { id: "MuslimWorldLeague", label: "Muslim World League" },
  { id: "Egyptian", label: "Egyptian" },
  { id: "Karachi", label: "Karachi" },
  { id: "UmmAlQura", label: "Umm Al-Qura" },
  { id: "Dubai", label: "Dubai" },
  { id: "MoonsightingCommittee", label: "Moonsighting Committee" },
  { id: "NorthAmerica", label: "North America" },
  { id: "Kuwait", label: "Kuwait" },
  { id: "Qatar", label: "Qatar" },
  { id: "Singapore", label: "Singapore" },
  { id: "Tehran", label: "Tehran" },
  { id: "Turkey", label: "Turkey" }
];

export const MADHAB_OPTIONS = [
  { id: "Shafi", label: "Shafi" },
  { id: "Hanafi", label: "Hanafi" }
];

export const DEFAULT_REMINDER_OFFSETS = {
  suhoorEnd: [20, 5],
  fajr: [15],
  sunrise: [],
  dhuhr: [10],
  asr: [10],
  maghrib: [20, 5],
  isha: [10]
};

export const DEFAULT_LOCATION = {
  name: "Hong Kong",
  latitude: 22.3193,
  longitude: 114.1694,
  timeZone: "Asia/Hong_Kong"
};

function makeDayKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalculationParams(methodId, madhabId) {
  const method = CalculationMethod[methodId];
  const params = typeof method === "function" ? method() : CalculationMethod.MuslimWorldLeague();
  params.madhab = madhabId === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function buildPrayerMonthSchedule(year, month, settings) {
  const safeYear = Number(year);
  const safeMonth = Number(month);
  const latitude = Number(settings.location.latitude);
  const longitude = Number(settings.location.longitude);

  if (!Number.isFinite(safeYear) || !Number.isFinite(safeMonth) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParams(settings.calculationMethod, settings.madhab);

  const output = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(safeYear, safeMonth - 1, day);
    const prayerTimes = new PrayerTimes(coordinates, date, params);

    output.push({
      dayKey: makeDayKey(safeYear, safeMonth, day),
      events: {
        suhoorEnd: prayerTimes.fajr.toISOString(),
        fajr: prayerTimes.fajr.toISOString(),
        sunrise: prayerTimes.sunrise.toISOString(),
        dhuhr: prayerTimes.dhuhr.toISOString(),
        asr: prayerTimes.asr.toISOString(),
        maghrib: prayerTimes.maghrib.toISOString(),
        isha: prayerTimes.isha.toISOString()
      }
    });
  }

  return output;
}

export function buildPrayerCacheKey(year, month, settings) {
  const latitude = Number(settings.location.latitude);
  const longitude = Number(settings.location.longitude);
  const latText = Number.isFinite(latitude) ? latitude.toFixed(4) : "0";
  const lonText = Number.isFinite(longitude) ? longitude.toFixed(4) : "0";

  return [
    year,
    String(month).padStart(2, "0"),
    settings.location.timeZone,
    latText,
    lonText,
    settings.calculationMethod,
    settings.madhab
  ].join("|");
}

export function shiftMonth(year, month, delta) {
  const base = new Date(year, month - 1 + delta, 1);
  return {
    year: base.getFullYear(),
    month: base.getMonth() + 1
  };
}

export function getMonthLabel(year, month, timeZone) {
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return date.toLocaleDateString(undefined, {
    timeZone,
    month: "long",
    year: "numeric"
  });
}

export function createDefaultPrayerSettings() {
  return {
    location: { ...DEFAULT_LOCATION },
    calculationMethod: "MuslimWorldLeague",
    madhab: "Shafi",
    reminders: { ...DEFAULT_REMINDER_OFFSETS },
    quoteNotificationEnabled: false,
    quoteNotificationTime: "09:00",
    teachingMode: {
      enabled: false,
      schedule: {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: []
      }
    }
  };
}

export function parseReminderOffsets(textValue) {
  const input = String(textValue || "").trim();
  if (!input) return [];

  return [...new Set(
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1440)
      .map((value) => Math.round(value))
  )].sort((a, b) => b - a);
}

export function normalizeReminderMap(input) {
  const next = {};

  PRAYER_EVENTS.forEach((event) => {
    const raw = input?.[event.key];
    if (!Array.isArray(raw)) {
      next[event.key] = [...DEFAULT_REMINDER_OFFSETS[event.key]];
      return;
    }

    next[event.key] = [...new Set(raw.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0))]
      .map((value) => Math.round(value))
      .sort((a, b) => b - a);
  });

  return next;
}

export function getEventLabel(eventKey) {
  return PRAYER_EVENTS.find((event) => event.key === eventKey)?.label || eventKey;
}

export function getEventTimeline(dayEntry) {
  if (!dayEntry?.events) return [];

  return PRAYER_EVENTS.map((event) => ({
    key: event.key,
    label: event.label,
    timeISO: dayEntry.events[event.key]
  })).filter((event) => Boolean(event.timeISO));
}

export function findNextPrayerEvent(todayEntry, tomorrowEntry, now) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(nowMs)) return null;

  const candidates = [...getEventTimeline(todayEntry), ...getEventTimeline(tomorrowEntry)];
  const sorted = candidates
    .map((event) => ({
      ...event,
      eventMs: new Date(event.timeISO).getTime()
    }))
    .filter((event) => Number.isFinite(event.eventMs) && event.eventMs >= nowMs)
    .sort((a, b) => a.eventMs - b.eventMs);

  return sorted[0] || null;
}

export function makeTeachingRange() {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    start: "09:00",
    end: "11:00"
  };
}

export function parseClockMinutes(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

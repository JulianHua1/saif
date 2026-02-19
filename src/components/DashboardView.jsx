import { formatTimeInZone, getTimeZoneParts } from "../lib/date";

const TIMINGS = [
  {
    key: "suhoorEnd",
    label: "Suhoor",
    icon: "solar:cup-hot-linear",
    muted: false,
    emphasizeHover: true
  },
  {
    key: "fajr",
    label: "Fajr",
    icon: "solar:sun-fog-linear",
    muted: true
  },
  {
    key: "sunrise",
    label: "Sunrise",
    icon: "solar:sunrise-linear",
    muted: true
  },
  {
    key: "dhuhr",
    label: "Dhuhr",
    icon: "solar:sun-2-linear",
    muted: true
  },
  {
    key: "asr",
    label: "Asr",
    icon: "solar:cloud-sun-linear",
    muted: true
  },
  {
    key: "maghrib",
    label: "Maghrib",
    icon: "solar:moon-stars-bold",
    muted: false
  },
  {
    key: "isha",
    label: "Isha",
    icon: "solar:stars-linear",
    muted: false
  }
];

const EVENT_NOTES = {
  suhoorEnd: "Preparation before Fajr",
  fajr: "Start the day in devotion",
  sunrise: "Morning remembrance",
  dhuhr: "Midday prayer and reflection",
  asr: "Sustain worship through the afternoon",
  maghrib: "Preparation for breaking the fast",
  isha: "Close the day with prayer"
};

function ordinal(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function summarizeChecklistProgress(checklists) {
  const all = [checklists.morning, checklists.daily, checklists.evening, checklists.weekly];
  const total = all.reduce((sum, list) => sum + (list?.length || 0), 0);
  const done = all.reduce((sum, list) => sum + (list || []).filter((item) => item.done).length, 0);
  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0
  };
}

function toTimelineMap(todayTimeline) {
  const map = {};
  todayTimeline.forEach((event) => {
    map[event.key] = event.timeISO;
  });
  return map;
}

function eventTitle(nextEvent) {
  if (!nextEvent?.label) return "Maghrib Prayer";
  return `${nextEvent.label.replace(" (Iftar)", "")} Prayer`;
}

export function DashboardView({
  checklists,
  nextEvent,
  countdownText,
  todayTimeline,
  nowMs,
  timeZone,
  onOpenMonthlyView,
  onOpenQuranView
}) {
  const timeline = toTimelineMap(todayTimeline);
  const progress = summarizeChecklistProgress(checklists);
  const day = Math.max(1, Math.min(30, getTimeZoneParts(nowMs, timeZone).day));
  const nextEventTime = nextEvent ? formatTimeInZone(nextEvent.timeISO, timeZone) : "6:21 PM";
  const heroNote = EVENT_NOTES[nextEvent?.key] || "Preparation for breaking the fast";
  const highlightedKey = nextEvent?.key || "maghrib";

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-xl p-8 border border-[#e6e2d6] shadow-[0_2px_12px_-4px_rgba(20,61,52,0.05)] flex flex-col justify-center h-full min-h-[160px]">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-[#f4f7f6] text-[#143d34] rounded-full">
                <iconify-icon icon="solar:star-fall-linear" width="22" />
              </div>
            </div>
            <h3 className="text-2xl text-[#143d34] mb-1 serif-font">Ramadan Mubarak,</h3>
            <p className="text-lg text-stone-500 font-normal serif-font italic">Brother Saif</p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-[#e6e2d6] shadow-[0_2px_12px_-4px_rgba(20,61,52,0.05)] h-full min-h-[160px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Current Day</h4>
              <iconify-icon icon="solar:refresh-circle-linear" className="text-stone-300" width="20" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl text-[#143d34] serif-font">{ordinal(day)}</span>
              <span className="text-base text-stone-500 font-medium italic">Roza</span>
            </div>
            <div className="w-full bg-[#f0ede6] h-1.5 rounded-full mt-5 overflow-hidden">
              <div className="bg-[#d4af37] h-full rounded-full" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#143d34] rounded-xl p-8 md:p-10 border border-[#1f4f44] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[340px] text-[#f0ebe0]">
          <div className="absolute -top-10 -right-10 opacity-[0.07] pointer-events-none text-white mix-blend-overlay">
            <iconify-icon icon="solar:islamic-linear" width="380" height="380" />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0d2b24] to-transparent opacity-60" />

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#265c50] text-[#d4af37] text-xs font-bold uppercase tracking-widest border border-[#2f6e60]">
                Upcoming
              </span>
              <span className="text-[#a0b5b0] text-sm font-medium tracking-wide">{nextEventTime}</span>
            </div>
          </div>

          <div className="relative z-10 text-center md:text-left mt-4 md:mt-0">
            <h2 className="text-3xl md:text-5xl font-light text-[#f0ebe0] mb-2 serif-font">{eventTitle(nextEvent)}</h2>
            <p className="text-[#a0b5b0] text-sm md:text-base font-light tracking-wide opacity-80">{heroNote}</p>
            <div className="mt-6 md:mt-8">
              <span className="font-normal text-6xl md:text-8xl text-[#d4af37] serif-font block leading-none">{countdownText}</span>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              className="border-0 px-5 py-2.5 bg-[#f0ebe0] text-[#143d34] text-sm font-semibold rounded-lg hover:bg-white transition-colors shadow-lg shadow-black/10 flex items-center gap-2"
              onClick={onOpenMonthlyView}
            >
              <span>View Timetable</span>
              <iconify-icon icon="solar:arrow-right-linear" />
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-transparent border border-[#2f6e60] text-[#f0ebe0] text-sm font-medium rounded-lg hover:bg-[#1e4d42] transition-colors flex items-center gap-2"
              onClick={onOpenQuranView}
            >
              <iconify-icon icon="solar:hand-stars-linear" />
              <span>Read Dua</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-8 border border-[#e6e2d6] shadow-[0_2px_12px_-4px_rgba(20,61,52,0.05)]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-[#143d34] serif-font">Prayer Schedule</h3>
          <button
            type="button"
            className="border-0 text-[#d4af37] text-xs font-bold uppercase tracking-widest hover:text-amber-600 transition-colors bg-transparent p-0"
            onClick={onOpenMonthlyView}
          >
            See Full Month
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {TIMINGS.map((timing) => {
            const isActive = timing.key === highlightedKey;
            const timeText = timeline[timing.key] ? formatTimeInZone(timeline[timing.key], timeZone) : "--:--";

            if (isActive) {
              return (
                <div
                  key={timing.key}
                  className="bg-[#143d34] rounded-lg p-5 flex flex-col items-center justify-center shadow-lg transform scale-105 ring-4 ring-[#f2f0e9]"
                >
                  <span className="text-xs text-[#d4af37] font-bold uppercase tracking-wider mb-2">{timing.label}</span>
                  <span className="text-xl text-white serif-font">{timeText}</span>
                  <iconify-icon icon={timing.icon} className="text-[#d4af37] mt-3 animate-pulse" width="18" />
                </div>
              );
            }

            const wrapperClass = timing.emphasizeHover
              ? "bg-[#faf9f6] rounded-lg p-5 flex flex-col items-center justify-center border border-[#efede6] group hover:border-[#d4af37]/30 transition-all"
              : `bg-[#faf9f6] rounded-lg p-5 flex flex-col items-center justify-center border border-[#efede6]${timing.muted ? " opacity-70" : ""}`;
            const iconClass = timing.emphasizeHover
              ? "text-stone-300 mt-3 group-hover:text-[#d4af37] transition-colors"
              : "text-stone-300 mt-3";

            return (
              <div key={timing.key} className={wrapperClass}>
                <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-2">{timing.label}</span>
                <span className="text-lg text-[#143d34] serif-font">{timeText}</span>
                <iconify-icon icon={timing.icon} className={iconClass} width="18" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-6" />
    </>
  );
}

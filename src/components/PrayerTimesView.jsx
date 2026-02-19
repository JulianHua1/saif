import { useEffect, useMemo, useState } from "react";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function makeDayKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime24(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatTime12(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function monthName(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return date.toLocaleDateString(undefined, {
    month: "long"
  });
}

function weekdayMondayFirst(year, month, day) {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return dayIndex === 0 ? 6 : dayIndex - 1;
}

function parseDayKey(dayKey) {
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map((part) => Number(part));

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function formatLongDate(dayKey, timeZone) {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return "Unknown day";

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
  return date.toLocaleDateString(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatHijriLabel(dayKey, timeZone) {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return "";

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));

  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric"
    }).formatToParts(date);

    const day = parts.find((part) => part.type === "day")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "Ramadan";
    const year = parts.find((part) => part.type === "year")?.value || "";

    return {
      short: `${day} ${month}`,
      long: `Ramadan ${day}, ${year} AH`
    };
  } catch {
    return {
      short: "",
      long: ""
    };
  }
}

function buildCalendarCells(selectedYear, selectedMonth, monthSchedule) {
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstWeekday = weekdayMondayFirst(selectedYear, selectedMonth, 1);
  const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const previousMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const previousMonthDays = new Date(previousMonthYear, previousMonth, 0).getDate();

  const entryMap = new Map(monthSchedule.map((day) => [day.dayKey, day]));

  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      type: "prev",
      dayNumber: previousMonthDays - firstWeekday + index + 1
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = makeDayKey(selectedYear, selectedMonth, day);
    const weekday = weekdayMondayFirst(selectedYear, selectedMonth, day);

    cells.push({
      type: "current",
      dayNumber: day,
      weekday,
      dayKey,
      entry: entryMap.get(dayKey) || null
    });
  }

  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      type: "next",
      dayNumber: nextDay
    });
    nextDay += 1;
  }

  return cells;
}

function modalEventTime(entry, key, timeZone) {
  if (!entry?.events?.[key]) return "--:--";
  return formatTime12(entry.events[key], timeZone);
}

export function PrayerTimesView({
  settings,
  selectedYear,
  selectedMonth,
  monthSchedule,
  onPrevMonth,
  onNextMonth,
  onGoToCurrentMonth
}) {
  const [selectedDay, setSelectedDay] = useState(null);

  const cells = useMemo(
    () => buildCalendarCells(selectedYear, selectedMonth, monthSchedule),
    [selectedYear, selectedMonth, monthSchedule]
  );

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedDay(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const modalHijri = selectedDay ? formatHijriLabel(selectedDay.dayKey, settings.location.timeZone) : null;

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onPrevMonth}
            className="border-0 bg-transparent p-2 hover:bg-white rounded-full transition-colors text-[#143d34]"
          >
            <iconify-icon icon="solar:alt-arrow-left-linear" width="20" />
          </button>
          <h3 className="text-2xl text-[#143d34] serif-font font-semibold tracking-tight">{monthName(selectedYear, selectedMonth)}</h3>
          <button
            type="button"
            onClick={onNextMonth}
            className="border-0 bg-transparent p-2 hover:bg-white rounded-full transition-colors text-[#143d34]"
          >
            <iconify-icon icon="solar:alt-arrow-right-linear" width="20" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoToCurrentMonth}
            className="text-xs font-medium text-[#143d34] bg-white border border-[#e6e2d6] px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Today
          </button>
          <div className="h-4 w-px bg-[#e6e2d6]" />
          <span className="text-xs text-stone-400 font-medium tracking-wide">
            {settings.location.name} ({settings.madhab})
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm overflow-hidden">
        <div className="calendar-grid border-b border-[#e6e2d6] bg-stone-50/50">
          {WEEKDAY_HEADERS.map((dayName) => (
            <div
              key={dayName}
              className={
                dayName === "Fri"
                  ? "py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[#143d34]"
                  : "py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-stone-500"
              }
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="calendar-grid bg-[#e6e2d6] gap-px border-b border-[#e6e2d6]">
          {cells.map((cell, index) => {
            if (cell.type === "prev") {
              return (
                <div
                  key={`prev-${index}`}
                  className="bg-stone-50/30 min-h-[100px] md:min-h-[130px] p-2 md:p-3 opacity-50"
                />
              );
            }

            if (cell.type === "next") {
              return (
                <div
                  key={`next-${index}`}
                  className="bg-white hover:bg-stone-50 min-h-[100px] md:min-h-[130px] p-2 md:p-3 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex justify-between">
                    <span className="text-sm text-stone-700">{cell.dayNumber}</span>
                    <span className="text-[10px] text-stone-400"> </span>
                  </div>
                </div>
              );
            }

            const hijri = formatHijriLabel(cell.dayKey, settings.location.timeZone);
            const fajr = cell.entry?.events?.fajr ? formatTime24(cell.entry.events.fajr, settings.location.timeZone) : "--:--";
            const maghrib = cell.entry?.events?.maghrib ? formatTime24(cell.entry.events.maghrib, settings.location.timeZone) : "--:--";
            const isFriday = cell.weekday === 4;
            const isFirstRamadan = cell.dayNumber === 1;

            return (
              <div
                key={cell.dayKey}
                onClick={() => cell.entry && setSelectedDay(cell)}
                className={
                  isFriday
                    ? "bg-[#fcfbf9] hover:bg-white transition-colors min-h-[100px] md:min-h-[130px] p-2 md:p-3 cursor-pointer group flex flex-col justify-between relative"
                    : "bg-white hover:bg-stone-50 transition-colors min-h-[100px] md:min-h-[130px] p-2 md:p-3 cursor-pointer group flex flex-col justify-between relative"
                }
              >
                <div className="flex justify-between items-start">
                  <span className={isFriday ? "text-sm font-semibold text-[#143d34]" : "text-sm font-medium text-stone-700 group-hover:text-[#143d34]"}>
                    {cell.dayNumber}
                  </span>
                  {isFirstRamadan ? (
                    <span className="text-[10px] font-semibold text-[#d4af37] bg-[#fcfbf8] border border-[#f0e6cc] px-1.5 py-0.5 rounded">
                      {hijri.short.replace(" ", " ").toUpperCase()}
                    </span>
                  ) : (
                    <span className={isFriday ? "text-[10px] font-semibold text-[#d4af37]/80" : "text-[10px] font-semibold text-[#d4af37]/80"}>
                      {hijri.short.replace(" ", " ").toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                    <iconify-icon icon="solar:sun-fog-linear" className="text-orange-400" />
                    <span>{fajr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#143d34] font-medium">
                    <iconify-icon icon="solar:moon-stars-linear" />
                    <span>{maghrib}</span>
                  </div>
                </div>

                {isFriday && (
                  <div className="absolute bottom-2 right-2 text-[#143d34]/10">
                    <iconify-icon icon="solar:mosque-linear" width="24" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-6" />

      {selectedDay && (
        <div className="fixed inset-0 z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#143d34]/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDay(null)} />

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-[#e6e2d6]">
                <div className="bg-[#143d34] px-4 py-5 sm:px-6 flex justify-between items-start relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: "radial-gradient(#d4af37 1px, transparent 1px)", backgroundSize: "16px 16px" }}
                  />

                  <div className="relative z-10">
                    <h3 className="text-xl font-medium leading-6 text-[#f0ebe0] serif-font">{formatLongDate(selectedDay.dayKey, settings.location.timeZone)}</h3>
                    <p className="mt-1 max-w-2xl text-xs text-[#a0b5b0] tracking-wide">{modalHijri?.long || ""}</p>
                  </div>
                  <button
                    type="button"
                    className="relative z-10 rounded-full text-[#a0b5b0] hover:text-white focus:outline-none border-0 bg-transparent p-0"
                    onClick={() => setSelectedDay(null)}
                  >
                    <iconify-icon icon="solar:close-circle-linear" width="24" />
                  </button>
                </div>

                <div className="px-4 py-5 sm:p-6 bg-white space-y-4">
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:moon-fog-linear" width="18" />
                      <span>Suhoor Ends</span>
                    </div>
                    <span className="font-semibold text-stone-700 tabular-nums">
                      {modalEventTime(selectedDay.entry, "suhoorEnd", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-[#f2f0e9]/50 border border-[#e6e2d6]">
                    <div className="flex items-center gap-2 text-[#143d34]">
                      <iconify-icon icon="solar:sunrise-linear" width="18" />
                      <span className="font-medium">Fajr</span>
                    </div>
                    <span className="font-bold text-[#143d34] tabular-nums">
                      {modalEventTime(selectedDay.entry, "fajr", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm pb-2 border-b border-stone-100 opacity-60">
                    <div className="flex items-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:sun-linear" width="18" />
                      <span>Sunrise</span>
                    </div>
                    <span className="font-medium text-stone-600 tabular-nums">
                      {modalEventTime(selectedDay.entry, "sunrise", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:sun-fog-linear" width="18" />
                      <span>Dhuhr</span>
                    </div>
                    <span className="font-medium text-stone-700 tabular-nums">
                      {modalEventTime(selectedDay.entry, "dhuhr", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:cloud-sun-linear" width="18" />
                      <span>Asr</span>
                    </div>
                    <span className="font-medium text-stone-700 tabular-nums">
                      {modalEventTime(selectedDay.entry, "asr", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-[#143d34] text-white shadow-md shadow-[#143d34]/10 my-2">
                    <div className="flex items-center gap-2">
                      <iconify-icon icon="solar:sunset-linear" width="18" />
                      <span className="font-medium">Maghrib (Iftar)</span>
                    </div>
                    <span className="font-bold text-[#d4af37] tabular-nums">
                      {modalEventTime(selectedDay.entry, "maghrib", settings.location.timeZone)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-stone-500">
                      <iconify-icon icon="solar:moon-stars-linear" width="18" />
                      <span>Isha</span>
                    </div>
                    <span className="font-medium text-stone-700 tabular-nums">
                      {modalEventTime(selectedDay.entry, "isha", settings.location.timeZone)}
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 px-4 py-4 sm:px-6 flex justify-between items-center border-t border-[#e6e2d6]">
                  <button type="button" className="text-xs text-stone-400 hover:text-[#143d34] flex items-center gap-1 transition-colors border-0 bg-transparent p-0">
                    <iconify-icon icon="solar:arrow-left-linear" />
                    Previous
                  </button>
                  <button type="button" className="text-xs text-[#143d34] hover:underline font-medium border-0 bg-transparent p-0">
                    Add Note
                  </button>
                  <button type="button" className="text-xs text-stone-400 hover:text-[#143d34] flex items-center gap-1 transition-colors border-0 bg-transparent p-0">
                    Next
                    <iconify-icon icon="solar:arrow-right-linear" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

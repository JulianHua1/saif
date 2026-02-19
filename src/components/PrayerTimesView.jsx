import { formatDateTimeInZone, formatTimeInZone } from "../lib/date";
import { PRAYER_EVENTS } from "../lib/prayer";

export function PrayerTimesView({
  settings,
  todayTimeline,
  nextEvent,
  countdownText,
  monthSchedule,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onRefresh,
  lastRefreshedAt
}) {
  return (
    <div className="stacked-layout">
      <article className="card">
        <div className="card-header">
          <h3>Current Prayer Timeline</h3>
          <span>{settings.location.name}</span>
        </div>

        <p className="muted">Timezone: {settings.location.timeZone}</p>

        <div className="prayer-today-grid">
          {todayTimeline.map((event) => (
            <div key={event.key} className={nextEvent?.key === event.key ? "event-pill active" : "event-pill"}>
              <span>{event.label}</span>
              <strong>{formatTimeInZone(event.timeISO, settings.location.timeZone)}</strong>
            </div>
          ))}
        </div>

        <p className="countdown-line">
          Next event: <strong>{nextEvent ? nextEvent.label : "None"}</strong>
          {nextEvent ? ` in ${countdownText}` : ""}
        </p>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Monthly Timetable</h3>
          <div className="button-row">
            <button type="button" onClick={onPrevMonth}>
              Previous Month
            </button>
            <button type="button" onClick={onNextMonth}>
              Next Month
            </button>
            <button type="button" className="accent" onClick={onRefresh}>
              Refresh Timetable
            </button>
          </div>
        </div>

        <p>
          <strong>{monthLabel}</strong>
        </p>
        <p className="muted">
          Last refreshed: {lastRefreshedAt ? formatDateTimeInZone(lastRefreshedAt, settings.location.timeZone) : "Not generated yet"}
        </p>

        <div className="table-wrap">
          <table className="prayer-table">
            <thead>
              <tr>
                <th>Date</th>
                {PRAYER_EVENTS.map((event) => (
                  <th key={event.key}>{event.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthSchedule.map((day) => (
                <tr key={day.dayKey}>
                  <td>{day.dayKey}</td>
                  {PRAYER_EVENTS.map((event) => (
                    <td key={`${day.dayKey}-${event.key}`}>{formatTimeInZone(day.events[event.key], settings.location.timeZone)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

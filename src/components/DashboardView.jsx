import { formatDuration, formatFullTimestamp, formatDateTimeInZone, formatTimeInZone } from "../lib/date";

function doneCount(items) {
  return items.filter((item) => item.done).length;
}

export function DashboardView({
  sessions,
  journal,
  checklists,
  totals,
  nextEvent,
  countdownText,
  dailyQuote,
  lastPrayerRefresh,
  timeZone
}) {
  const recentSessions = sessions.slice(0, 5);
  const recentJournal = journal.slice(0, 3);

  return (
    <div className="dashboard-grid">
      <article className="card metric-card">
        <p className="eyebrow">Greeting</p>
        <h2 className="greeting">Ramadan Mubarak, Mr Ullah Saif</h2>
        <p>Stay steady in worship, reflection, and good character.</p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Prayer Timing</p>
        <h2>{nextEvent ? nextEvent.label : "No upcoming event"}</h2>
        <p>{nextEvent ? `${formatTimeInZone(nextEvent.timeISO, timeZone)} in ${countdownText}` : "Check location/settings"}</p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Quran Focus</p>
        <h2>{totals.totalMinutes} minutes</h2>
        <p>{totals.totalPages} pages logged</p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Checklist Momentum</p>
        <h2>
          {doneCount(checklists.daily)}/{checklists.daily.length} day
        </h2>
        <p>
          {doneCount(checklists.evening)}/{checklists.evening.length} evening
        </p>
        <p>
          {doneCount(checklists.weekly)}/{checklists.weekly.length} weekly
        </p>
        <p>
          {doneCount(checklists.friday)}/{checklists.friday.length} friday
        </p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Journal</p>
        <h2>{journal.length} entries</h2>
        <p>{journal.length === 0 ? "Start with your intention for today." : "Keep your intentions and reflections consistent."}</p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Daily Quote</p>
        <h2>{dailyQuote?.theme || "Spiritual Motivation"}</h2>
        <p>{dailyQuote?.text || "Keep your heart connected to Allah throughout the day."}</p>
      </article>

      <article className="card wide">
        <div className="card-header">
          <h3>Prayer Data Status</h3>
        </div>
        <p>
          Location timezone: <strong>{timeZone}</strong>
        </p>
        <p>
          Last prayer timetable refresh: <strong>{lastPrayerRefresh ? formatDateTimeInZone(lastPrayerRefresh, timeZone) : "Not generated yet"}</strong>
        </p>
      </article>

      <article className="card wide">
        <div className="card-header">
          <h3>Recent Quran Sessions</h3>
        </div>
        {recentSessions.length === 0 ? (
          <p className="muted">No sessions yet. Start the timer in Quran Reading and save your first session.</p>
        ) : (
          <ul className="list">
            {recentSessions.map((session) => (
              <li key={session.id}>
                <span>{formatFullTimestamp(session.endedAt)}</span>
                <span>{formatDuration(session.durationSeconds)}</span>
                <span>{session.pagesRead} pages</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="card wide">
        <div className="card-header">
          <h3>Recent Journal Notes</h3>
        </div>
        {recentJournal.length === 0 ? (
          <p className="muted">No journal entries yet.</p>
        ) : (
          <ul className="note-list">
            {recentJournal.map((entry) => (
              <li key={entry.id}>
                <p className="note-intention">{entry.intention || "No intention title"}</p>
                <p>{entry.notes || "No note content"}</p>
                <time>{formatFullTimestamp(entry.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

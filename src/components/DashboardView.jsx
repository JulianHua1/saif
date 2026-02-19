import { formatDuration, formatFullTimestamp } from "../lib/date";

export function DashboardView({ sessions, journal, checklists, totals }) {
  const dailyDone = checklists.daily.filter((item) => item.done).length;
  const weeklyDone = checklists.weekly.filter((item) => item.done).length;
  const recentSessions = sessions.slice(0, 5);
  const recentJournal = journal.slice(0, 3);

  return (
    <div className="dashboard-grid">
      <article className="card metric-card">
        <p className="eyebrow">Quran Focus</p>
        <h2>{totals.totalMinutes} minutes</h2>
        <p>{totals.totalPages} pages logged</p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Checklist Momentum</p>
        <h2>
          {dailyDone}/{checklists.daily.length} daily
        </h2>
        <p>
          {weeklyDone}/{checklists.weekly.length} weekly
        </p>
      </article>

      <article className="card metric-card">
        <p className="eyebrow">Journal</p>
        <h2>{journal.length} entries</h2>
        <p>{journal.length === 0 ? "Start with your intention for today." : "Keep your intentions and reflections consistent."}</p>
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

import { useState } from "react";
import { formatFullTimestamp } from "../lib/date";

export function JournalView({ journal, onAddEntry }) {
  const [intention, setIntention] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const trimmedIntention = intention.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedIntention && !trimmedNotes) return;

    onAddEntry({
      intention: trimmedIntention,
      notes: trimmedNotes,
      createdAt: new Date().toISOString()
    });

    setIntention("");
    setNotes("");
  };

  return (
    <div className="stacked-layout">
      <article className="card">
        <div className="card-header">
          <h3>New Journal Entry</h3>
        </div>

        <form onSubmit={submit} className="form-stack">
          <label htmlFor="journalIntention">Intention</label>
          <input
            id="journalIntention"
            type="text"
            placeholder="What do you want to focus on today?"
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
          />

          <label htmlFor="journalNotes">Reflection</label>
          <textarea
            id="journalNotes"
            placeholder="Write your reflection or notes..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
          />

          <button type="submit" className="accent">
            Save Entry
          </button>
        </form>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Saved Entries</h3>
        </div>

        {journal.length === 0 ? (
          <p className="muted">Your journal is empty.</p>
        ) : (
          <ul className="note-list">
            {journal.map((entry) => (
              <li key={entry.id}>
                <p className="note-intention">{entry.intention || "Untitled intention"}</p>
                <p>{entry.notes || "No reflection text."}</p>
                <time>{formatFullTimestamp(entry.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

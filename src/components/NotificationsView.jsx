import { useEffect, useState } from "react";
import { formatDateTimeInZone } from "../lib/date";
import { PRAYER_EVENTS, parseReminderOffsets } from "../lib/prayer";

const WEEKDAY_LABELS = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday"
};

export function NotificationsView({
  settings,
  notificationPermission,
  onRequestPermission,
  onSetReminderOffsets,
  onSetQuoteNotificationEnabled,
  onSetQuoteNotificationTime,
  onSetTeachingModeEnabled,
  onAddTeachingRange,
  onUpdateTeachingRange,
  onRemoveTeachingRange,
  activeReminders,
  onSnoozeReminder,
  onDismissReminder
}) {
  const [draftOffsets, setDraftOffsets] = useState({});

  useEffect(() => {
    const next = {};
    PRAYER_EVENTS.forEach((event) => {
      const values = settings.reminders[event.key] || [];
      next[event.key] = values.join(",");
    });
    setDraftOffsets(next);
  }, [settings.reminders]);

  const saveDraft = (eventKey) => {
    const parsed = parseReminderOffsets(draftOffsets[eventKey]);
    onSetReminderOffsets(eventKey, parsed);
  };

  return (
    <div className="stacked-layout">
      <article className="card">
        <div className="card-header">
          <h3>Reminder Permissions</h3>
          <span>{notificationPermission}</span>
        </div>
        <p className="muted">Enable desktop notifications for prayer reminders, Suhoor/Iftar alerts, and optional quote reminders.</p>
        <button type="button" onClick={onRequestPermission} className="accent">
          Request Notification Permission
        </button>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Prayer Reminder Offsets</h3>
        </div>
        <p className="muted">Use comma-separated minutes before each event. Multiple reminders are supported, e.g. 20,5.</p>
        <div className="settings-grid">
          {PRAYER_EVENTS.map((event) => (
            <label key={event.key}>
              <span>{event.label}</span>
              <input
                type="text"
                value={draftOffsets[event.key] || ""}
                onChange={(inputEvent) =>
                  setDraftOffsets((current) => ({
                    ...current,
                    [event.key]: inputEvent.target.value
                  }))
                }
                onBlur={() => saveDraft(event.key)}
                placeholder="Example: 20,5"
              />
            </label>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Quote Notification</h3>
        </div>

        <div className="toggle-row">
          <label>
            <input
              type="checkbox"
              checked={settings.quoteNotificationEnabled}
              onChange={(event) => onSetQuoteNotificationEnabled(event.target.checked)}
            />
            Enable daily quote notification
          </label>
          <input
            type="time"
            value={settings.quoteNotificationTime}
            onChange={(event) => onSetQuoteNotificationTime(event.target.value)}
          />
        </div>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Teaching Mode</h3>
        </div>
        <p className="muted">During teaching hours, reminders are shown as silent/banner-only notifications.</p>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.teachingMode.enabled}
            onChange={(event) => onSetTeachingModeEnabled(event.target.checked)}
          />
          Enable Teaching Mode
        </label>

        <div className="teaching-grid">
          {Object.keys(WEEKDAY_LABELS).map((dayKey) => {
            const ranges = settings.teachingMode.schedule[dayKey] || [];
            return (
              <div key={dayKey} className="teaching-day">
                <div className="card-header">
                  <h4>{WEEKDAY_LABELS[dayKey]}</h4>
                  <button type="button" onClick={() => onAddTeachingRange(dayKey)}>
                    Add Range
                  </button>
                </div>

                {ranges.length === 0 ? <p className="muted">No class hours set.</p> : null}

                {ranges.map((range) => (
                  <div key={range.id} className="teaching-range-row">
                    <input
                      type="time"
                      value={range.start}
                      onChange={(event) => onUpdateTeachingRange(dayKey, range.id, "start", event.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={range.end}
                      onChange={(event) => onUpdateTeachingRange(dayKey, range.id, "end", event.target.value)}
                    />
                    <button type="button" onClick={() => onRemoveTeachingRange(dayKey, range.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Active Reminder Center</h3>
        </div>

        {activeReminders.length === 0 ? (
          <p className="muted">No active reminders right now.</p>
        ) : (
          <ul className="note-list">
            {activeReminders.map((reminder) => (
              <li key={reminder.id}>
                <p className="note-intention">{reminder.title}</p>
                <p>{reminder.message}</p>
                <time>{formatDateTimeInZone(reminder.createdAt, settings.location.timeZone)}</time>
                <div className="button-row">
                  <button type="button" onClick={() => onSnoozeReminder(reminder.id, 5)}>
                    Snooze 5m
                  </button>
                  <button type="button" onClick={() => onSnoozeReminder(reminder.id, 10)}>
                    Snooze 10m
                  </button>
                  <button type="button" onClick={() => onSnoozeReminder(reminder.id, 30)}>
                    Snooze 30m
                  </button>
                  <button type="button" className="ghost" onClick={() => onDismissReminder(reminder.id)}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

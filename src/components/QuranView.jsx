import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatFullTimestamp } from "../lib/date";
import { ProgressChart } from "./ProgressChart";

export function QuranView({ sessions, onSaveSession }) {
  const [timer, setTimer] = useState({
    isRunning: false,
    elapsedBeforeSeconds: 0,
    startedAtMs: null
  });
  const [nowMs, setNowMs] = useState(Date.now());
  const [pagesRead, setPagesRead] = useState("1");

  useEffect(() => {
    if (!timer.isRunning) return undefined;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer.isRunning]);

  const elapsedSeconds = useMemo(() => {
    if (!timer.isRunning || !timer.startedAtMs) return timer.elapsedBeforeSeconds;
    return timer.elapsedBeforeSeconds + Math.floor((nowMs - timer.startedAtMs) / 1000);
  }, [nowMs, timer]);

  const startTimer = () => {
    if (timer.isRunning) return;
    setNowMs(Date.now());
    setTimer((current) => ({
      ...current,
      isRunning: true,
      startedAtMs: Date.now()
    }));
  };

  const pauseTimer = () => {
    if (!timer.isRunning || !timer.startedAtMs) return;

    const newElapsed = timer.elapsedBeforeSeconds + Math.floor((Date.now() - timer.startedAtMs) / 1000);
    setTimer({
      isRunning: false,
      elapsedBeforeSeconds: newElapsed,
      startedAtMs: null
    });
  };

  const resetTimer = () => {
    setTimer({
      isRunning: false,
      elapsedBeforeSeconds: 0,
      startedAtMs: null
    });
    setPagesRead("1");
  };

  const saveSession = () => {
    if (elapsedSeconds <= 0) return;

    onSaveSession({
      durationSeconds: elapsedSeconds,
      pagesRead: Number(pagesRead) || 0,
      endedAt: new Date().toISOString()
    });

    resetTimer();
  };

  const recentSessions = sessions.slice(0, 8);

  return (
    <div className="stacked-layout">
      <article className="card timer-card">
        <p className="eyebrow">Quran Reading Timer</p>
        <h2 className="timer-display">{formatDuration(elapsedSeconds)}</h2>

        <div className="field-row">
          <label htmlFor="pagesReadInput">Pages read</label>
          <input
            id="pagesReadInput"
            type="number"
            min="0"
            step="1"
            value={pagesRead}
            onChange={(event) => setPagesRead(event.target.value)}
          />
        </div>

        <div className="button-row">
          <button type="button" onClick={startTimer} disabled={timer.isRunning}>
            Start
          </button>
          <button type="button" onClick={pauseTimer} disabled={!timer.isRunning}>
            Pause
          </button>
          <button type="button" onClick={resetTimer} className="ghost">
            Reset
          </button>
          <button type="button" onClick={saveSession} className="accent" disabled={elapsedSeconds <= 0}>
            Save Session
          </button>
        </div>
      </article>

      <ProgressChart sessions={sessions} />

      <article className="card">
        <div className="card-header">
          <h3>Recent Sessions</h3>
        </div>

        {recentSessions.length === 0 ? (
          <p className="muted">No saved sessions yet.</p>
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
    </div>
  );
}

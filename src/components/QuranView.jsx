import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatFullTimestamp } from "../lib/date";

export function QuranView({ sessions, onSaveSession }) {
  const [timer, setTimer] = useState({
    isRunning: false,
    elapsedBeforeSeconds: 0,
    startedAtMs: null
  });
  const [nowMs, setNowMs] = useState(Date.now());
  const [journalText, setJournalText] = useState("");
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (!timer.isRunning) return undefined;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer.isRunning]);

  useEffect(() => {
    if (!savedNote) return undefined;

    const timeoutId = setTimeout(() => setSavedNote(false), 1800);
    return () => clearTimeout(timeoutId);
  }, [savedNote]);

  const elapsedSeconds = useMemo(() => {
    if (!timer.isRunning || !timer.startedAtMs) return timer.elapsedBeforeSeconds;
    return timer.elapsedBeforeSeconds + Math.floor((nowMs - timer.startedAtMs) / 1000);
  }, [nowMs, timer]);

  const totalRecordedSeconds = useMemo(
    () => sessions.reduce((sum, session) => sum + (Number(session.durationSeconds) || 0), 0),
    [sessions]
  );

  const recentSessions = sessions.slice(0, 5);

  const startTimer = () => {
    if (timer.isRunning) return;

    setNowMs(Date.now());
    setTimer((current) => ({
      ...current,
      isRunning: true,
      startedAtMs: Date.now()
    }));
  };

  const resetTimer = () => {
    setTimer({
      isRunning: false,
      elapsedBeforeSeconds: 0,
      startedAtMs: null
    });
  };

  const saveSession = () => {
    if (elapsedSeconds <= 0) return;

    onSaveSession({
      durationSeconds: elapsedSeconds,
      pagesRead: 0,
      endedAt: new Date().toISOString()
    });

    resetTimer();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm overflow-hidden relative p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px]">
        <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4 text-[#143d34]">
          <iconify-icon icon="solar:moon-stars-bold" width="400" />
        </div>

        <div className="text-center w-full z-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-6">Current Session</h3>
          <div className="text-7xl md:text-9xl font-normal text-[#143d34] serif-font timer-nums tracking-tight mb-10">
            {formatDuration(elapsedSeconds)}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-2xl mx-auto gap-6 border-t border-stone-100 pt-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startTimer}
                disabled={timer.isRunning}
                className="border-0 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-stone-100 disabled:text-stone-400 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <iconify-icon icon="solar:play-linear" width="18" />
                {timer.isRunning ? "Running" : "Start"}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                disabled={elapsedSeconds <= 0}
                className={
                  elapsedSeconds <= 0
                    ? "bg-stone-100 text-stone-400 px-5 py-2.5 rounded-full text-sm font-medium cursor-not-allowed border border-stone-200"
                    : "bg-white text-[#143d34] px-5 py-2.5 rounded-full text-sm font-medium border border-[#e6e2d6] hover:bg-stone-50 transition-colors"
                }
              >
                Reset
              </button>

              <button
                type="button"
                onClick={saveSession}
                disabled={elapsedSeconds <= 0}
                className={
                  elapsedSeconds <= 0
                    ? "bg-stone-100 text-stone-400 px-5 py-2.5 rounded-full text-sm font-medium cursor-not-allowed border border-stone-200"
                    : "bg-white text-[#143d34] px-5 py-2.5 rounded-full text-sm font-medium border border-[#e6e2d6] hover:bg-stone-50 transition-colors"
                }
              >
                Save Session
              </button>
            </div>

            <div className="flex items-center gap-3 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Total Recorded</span>
              <span className="text-lg font-medium text-emerald-600 timer-nums">{formatDuration(totalRecordedSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm p-6 md:p-8 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-lg font-medium text-[#143d34] serif-font">Daily Reading Time</h3>
          <div className="relative">
            <select className="text-xs bg-stone-50 border border-[#e6e2d6] rounded-lg pl-3 pr-8 py-1.5 text-stone-600 outline-none focus:border-[#143d34] appearance-none cursor-pointer">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
            </select>
            <iconify-icon
              icon="solar:alt-arrow-down-linear"
              width="12"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>
        </div>

        <div className="h-48 w-full bg-stone-50/50 rounded-xl border border-dashed border-[#e6e2d6] flex flex-col items-center justify-center gap-2 text-stone-400">
          <iconify-icon icon="solar:graph-up-linear" width="32" className="opacity-50" />
          <span className="text-xs font-medium">No reading data available yet</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm p-6 md:p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[#143d34] serif-font">Recent Sessions</h3>
          </div>

          {recentSessions.length === 0 ? (
            <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-stone-400 gap-2 bg-stone-50/50 rounded-xl border border-dashed border-[#e6e2d6]/70">
              <iconify-icon icon="solar:history-linear" width="24" className="opacity-50" />
              <span className="text-sm text-stone-500">No sessions saved yet</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id} className="bg-stone-50 border border-[#e6e2d6] rounded-xl px-4 py-3">
                  <p className="text-xs text-stone-500">{formatFullTimestamp(session.endedAt)}</p>
                  <p className="text-sm text-[#143d34] font-medium timer-nums">{formatDuration(session.durationSeconds)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm p-6 md:p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[#143d34] serif-font">Reading Journal</h3>
          </div>

          <div className="flex-1 flex flex-col space-y-3">
            <textarea
              className="w-full flex-1 min-h-[100px] bg-stone-50 border border-[#e6e2d6] rounded-xl p-4 text-sm text-[#143d34] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#143d34] focus:bg-white transition-all resize-none"
              placeholder="Today's intention... What did you reflect on during your reading?"
              value={journalText}
              onChange={(event) => setJournalText(event.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="border-0 bg-transparent text-xs font-medium text-[#143d34] hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors border-transparent hover:border-[#e6e2d6] flex items-center gap-1"
                onClick={() => setSavedNote(true)}
              >
                {savedNote ? "Saved" : "Save Note"}
                <iconify-icon icon="solar:check-circle-linear" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-6" />
    </>
  );
}

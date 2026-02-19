import { getLocalDayKey, formatShortDay } from "../lib/date";

function buildSeries(sessions, days = 14) {
  const dailyMinutes = new Map();

  sessions.forEach((session) => {
    const dayKey = getLocalDayKey(session.endedAt);
    const nextValue = (dailyMinutes.get(dayKey) || 0) + (Number(session.durationSeconds) || 0) / 60;
    dailyMinutes.set(dayKey, Math.round(nextValue * 10) / 10);
  });

  const output = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    const key = getLocalDayKey(day);
    output.push({
      key,
      label: formatShortDay(day),
      minutes: dailyMinutes.get(key) || 0
    });
  }

  return output;
}

export function ProgressChart({ sessions }) {
  const series = buildSeries(sessions, 14);
  const maxMinutes = Math.max(...series.map((point) => point.minutes), 1);
  const width = 760;
  const height = 260;
  const padding = 36;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = chartWidth / Math.max(series.length - 1, 1);

  const points = series
    .map((point, index) => {
      const x = padding + index * stepX;
      const y = padding + chartHeight - (point.minutes / maxMinutes) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <h3>Quran Reading Minutes (Last 14 Days)</h3>
        <span>{Math.round(maxMinutes)} min peak</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Quran reading progress chart">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight - chartHeight * ratio;
          return <line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />;
        })}

        <polyline points={points} fill="none" className="chart-line" />

        {series.map((point, index) => {
          const x = padding + index * stepX;
          const y = padding + chartHeight - (point.minutes / maxMinutes) * chartHeight;
          return <circle key={point.key} cx={x} cy={y} r="4" className="chart-point" />;
        })}
      </svg>

      <div className="chart-labels">
        {series.map((point, index) => (
          <span key={point.key} className={index % 2 === 0 ? "show" : "hide-mobile"}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

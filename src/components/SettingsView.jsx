import { useMemo, useState } from "react";

const METHOD_OPTIONS = [
  { id: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { id: "MuslimWorldLeague", label: "Muslim World League" },
  { id: "NorthAmerica", label: "ISNA (North America)" },
  { id: "UmmAlQura", label: "Umm al-Qura, Makkah" }
];

const PRAYER_REMINDER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

function buildSelectArrow() {
  return "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2357534e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")";
}

function permissionMeta(permission) {
  if (permission === "granted") {
    return {
      dot: "bg-emerald-500",
      text: "text-emerald-600",
      label: "Authorized"
    };
  }

  if (permission === "denied") {
    return {
      dot: "bg-rose-500",
      text: "text-rose-600",
      label: "Blocked"
    };
  }

  if (permission === "unsupported") {
    return {
      dot: "bg-stone-400",
      text: "text-stone-500",
      label: "Unsupported"
    };
  }

  return {
    dot: "bg-orange-500",
    text: "text-orange-600",
    label: "Not Authorized"
  };
}

export function SettingsView({
  settings,
  methodOptions,
  madhabOptions,
  notificationPermission,
  onRequestNotificationAccess,
  onSaveSettings
}) {
  const [themeMode, setThemeMode] = useState("saif");
  const [hydrationEnabled, setHydrationEnabled] = useState(false);
  const [hydrationMinutes, setHydrationMinutes] = useState("60");
  const selectArrow = useMemo(() => buildSelectArrow(), []);

  const enabledPrayerReminder = useMemo(
    () => Object.values(settings.reminders || {}).some((offsets) => Array.isArray(offsets) && offsets.length > 0),
    [settings.reminders]
  );

  const methods = METHOD_OPTIONS.map((preset) => methodOptions.find((option) => option.id === preset.id) || preset);
  const permission = permissionMeta(notificationPermission);

  const savePatch = (patch) => {
    onSaveSettings({
      ...settings,
      ...patch
    });
  };

  const onPrayerReminderChange = (enabled) => {
    const nextReminders = { ...settings.reminders };

    Object.keys(nextReminders).forEach((key) => {
      if (!enabled) {
        nextReminders[key] = [];
        return;
      }

      nextReminders[key] = PRAYER_REMINDER_KEYS.includes(key) ? [5] : [];
    });

    savePatch({ reminders: nextReminders });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <iconify-icon icon="solar:info-circle-linear" className="text-stone-400" width="16" />
        <span className="text-xs text-stone-500 font-medium">Clickable controls only. Changes save automatically.</span>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f0ebe0] bg-[#faf9f6]">
          <h3 className="text-sm font-medium text-[#143d34] serif-font">Profile &amp; Context</h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-[#143d34] text-[#d4af37] flex items-center justify-center text-lg font-serif">
              <span>S</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#143d34]">Saif Ullah</div>
              <div className="text-xs text-stone-500">Free Plan</div>
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-xs">
            <div className="text-stone-500 font-medium">Role</div>
            <div className="text-[#143d34]">Teacher</div>

            <div className="text-stone-500 font-medium">Location</div>
            <div className="text-[#143d34]">Kowloon, Hong Kong</div>

            <div className="text-stone-500 font-medium">Reminder policy</div>
            <div className="text-[#143d34]">Strict (5 min before)</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f0ebe0] bg-[#faf9f6]">
          <h3 className="text-sm font-medium text-[#143d34] serif-font">Configuration</h3>
        </div>
        <div className="p-5 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-600">Calculation Method</label>
            <div className="relative">
              <select
                value={settings.calculationMethod}
                onChange={(event) => savePatch({ calculationMethod: event.target.value })}
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-stone-200 rounded-lg text-xs text-[#143d34] focus:outline-none focus:ring-1 focus:ring-[#143d34] focus:border-[#143d34] shadow-sm appearance-none bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1em]"
                style={{ backgroundImage: selectArrow }}
              >
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-600">Madhab (Asr Calculation)</label>
            <div className="flex p-1 bg-stone-100 rounded-lg border border-stone-200/50">
              {madhabOptions.map((madhab) => {
                const active = settings.madhab === madhab.id;
                return (
                  <button
                    key={madhab.id}
                    type="button"
                    onClick={() => savePatch({ madhab: madhab.id })}
                    className={
                      active
                        ? "flex-1 py-1.5 text-xs font-semibold text-[#143d34] bg-white rounded shadow-sm border border-black/5"
                        : "flex-1 py-1.5 text-xs font-medium text-stone-500 rounded hover:text-stone-700 transition-colors"
                    }
                  >
                    {madhab.id === "Shafi" ? "Shafi (Standard)" : "Hanafi"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-600">Interface Theme</label>
            <div className="flex p-1 bg-stone-100 rounded-lg border border-stone-200/50">
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={
                  themeMode === "light"
                    ? "flex-1 py-1.5 text-xs font-semibold text-[#143d34] bg-white rounded shadow-sm border border-black/5"
                    : "flex-1 py-1.5 text-xs font-medium text-stone-500 rounded hover:text-stone-700 transition-colors"
                }
              >
                Light Mode
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={
                  themeMode === "dark"
                    ? "flex-1 py-1.5 text-xs font-semibold text-[#143d34] bg-white rounded shadow-sm border border-black/5"
                    : "flex-1 py-1.5 text-xs font-medium text-stone-500 rounded hover:text-stone-700 transition-colors"
                }
              >
                Dark Mode
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("saif")}
                className={
                  themeMode === "saif"
                    ? "flex-1 py-1.5 text-xs font-semibold text-[#143d34] bg-white rounded shadow-sm border border-black/5 flex items-center justify-center gap-1.5"
                    : "flex-1 py-1.5 text-xs font-medium text-stone-500 rounded hover:text-stone-700 transition-colors flex items-center justify-center gap-1.5"
                }
              >
                <iconify-icon icon="solar:stars-minimalistic-bold" className="text-[#d4af37]" width="12" />
                Saif Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f0ebe0] bg-[#faf9f6]">
          <h3 className="text-sm font-medium text-[#143d34] serif-font">Notifications</h3>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center h-5">
              <input
                id="prayer-notif"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                checked={enabledPrayerReminder}
                onChange={(event) => onPrayerReminderChange(event.target.checked)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="prayer-notif" className="text-xs font-medium text-[#143d34] block cursor-pointer">
                Prayer reminders
              </label>
              <p className="text-[10px] text-stone-500 mt-0.5">Push notifications for all 5 daily prayers + Sunrise.</p>
            </div>
          </div>

          <hr className="border-stone-100" />

          <div className="flex items-start gap-3">
            <div className="flex items-center h-5">
              <input
                id="quote-notif"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                checked={settings.quoteNotificationEnabled}
                onChange={(event) => savePatch({ quoteNotificationEnabled: event.target.checked })}
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="quote-notif" className="text-xs font-medium text-[#143d34] cursor-pointer">
                  Daily quote notification
                </label>
                <input
                  type="time"
                  value={settings.quoteNotificationTime}
                  onChange={(event) => savePatch({ quoteNotificationTime: event.target.value })}
                  className="text-xs border border-stone-200 rounded px-2 py-1 bg-stone-50 text-stone-600 focus:outline-none focus:border-[#143d34]"
                />
              </div>
              <p className="text-[10px] text-stone-500">Receive a daily reflection from the library.</p>
            </div>
          </div>

          <hr className="border-stone-100" />

          <div className="flex items-start gap-3">
            <div className="flex items-center h-5">
              <input
                id="hydration-notif"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                checked={hydrationEnabled}
                onChange={(event) => setHydrationEnabled(event.target.checked)}
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="hydration-notif" className="text-xs font-medium text-[#143d34] cursor-pointer">
                  Hydration reminders
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={hydrationMinutes}
                    onChange={(event) => setHydrationMinutes(event.target.value)}
                    className="w-12 text-xs border border-stone-200 rounded px-2 py-1 bg-stone-50 text-stone-600 focus:outline-none focus:border-[#143d34] text-right"
                  />
                  <span className="text-[10px] text-stone-500">min</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500">Only active between Iftar and Suhoor.</p>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onRequestNotificationAccess?.()}
                disabled={notificationPermission === "unsupported"}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
              >
                Request Notification Access
              </button>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${permission.dot}`} />
                <span className={`text-xs font-medium ${permission.text}`}>{permission.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

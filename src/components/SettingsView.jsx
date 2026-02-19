import { useEffect, useState } from "react";
import { DEFAULT_LOCATION } from "../lib/prayer";

export function SettingsView({ settings, methodOptions, madhabOptions, onSaveSettings }) {
  const [form, setForm] = useState(settings);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = (path, value) => {
    setSavedMessage("");
    setForm((current) => {
      if (path.startsWith("location.")) {
        const key = path.replace("location.", "");
        return {
          ...current,
          location: {
            ...current.location,
            [key]: value
          }
        };
      }

      return {
        ...current,
        [path]: value
      };
    });
  };

  const save = (event) => {
    event.preventDefault();
    setError("");

    const latitude = Number(form.location.latitude);
    const longitude = Number(form.location.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: form.location.timeZone }).format(new Date());
    } catch {
      setError("Timezone must be a valid IANA timezone, for example Asia/Hong_Kong.");
      return;
    }

    onSaveSettings({
      ...form,
      location: {
        ...form.location,
        latitude,
        longitude
      }
    });

    setSavedMessage("Settings saved.");
  };

  const resetHongKong = () => {
    setForm((current) => ({
      ...current,
      location: {
        ...DEFAULT_LOCATION
      }
    }));
  };

  return (
    <div className="stacked-layout">
      <article className="card">
        <div className="card-header">
          <h3>Location and Prayer Calculation Settings</h3>
        </div>
        <p className="muted">Default location is Hong Kong (Asia/Hong_Kong). Edit values below and save.</p>

        <form onSubmit={save} className="form-stack">
          <label>
            <span>Location name</span>
            <input
              type="text"
              value={form.location.name}
              onChange={(event) => update("location.name", event.target.value)}
              placeholder="Hong Kong"
            />
          </label>

          <div className="settings-grid">
            <label>
              <span>Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.location.latitude}
                onChange={(event) => update("location.latitude", event.target.value)}
              />
            </label>

            <label>
              <span>Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.location.longitude}
                onChange={(event) => update("location.longitude", event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Time zone (IANA)</span>
            <input
              type="text"
              value={form.location.timeZone}
              onChange={(event) => update("location.timeZone", event.target.value)}
              placeholder="Asia/Hong_Kong"
            />
          </label>

          <div className="settings-grid">
            <label>
              <span>Calculation method</span>
              <select
                value={form.calculationMethod}
                onChange={(event) => update("calculationMethod", event.target.value)}
              >
                {methodOptions.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Madhab</span>
              <select value={form.madhab} onChange={(event) => update("madhab", event.target.value)}>
                {madhabOptions.map((madhab) => (
                  <option key={madhab.id} value={madhab.id}>
                    {madhab.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {savedMessage ? <p className="success-text">{savedMessage}</p> : null}

          <div className="button-row">
            <button type="submit" className="accent">
              Save Settings
            </button>
            <button type="button" onClick={resetHongKong}>
              Reset to Hong Kong Default
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}

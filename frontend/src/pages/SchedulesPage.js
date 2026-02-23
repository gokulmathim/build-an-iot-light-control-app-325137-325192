import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

const weekdays = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" }
];

function defaultDays() {
  return { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
}

export default function SchedulesPage() {
  const [devices, setDevices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    device_id: "",
    name: "Evening",
    time_local: "19:00",
    action: "turn_on",
    brightness: 80,
    days: defaultDays(),
    enabled: true
  });

  const deviceOptions = useMemo(
    () => devices.map((d) => ({ value: d.id, label: d.name })),
    [devices]
  );

  async function refresh() {
    const [d, s] = await Promise.all([apiFetch("/api/devices"), apiFetch("/api/schedules")]);
    setDevices(d);
    setSchedules(s);
    if (!form.device_id && d[0]?.id) setForm((p) => ({ ...p, device_id: d[0].id }));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDay(k) {
    setForm((p) => ({ ...p, days: { ...p.days, [k]: !p.days[k] } }));
  }

  async function createSchedule(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch("/api/schedules", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setSchedules((p) => [created, ...p]);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(schedule) {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !schedule.enabled })
      });
      setSchedules((p) => p.map((s) => (s.id === schedule.id ? updated : s)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeSchedule(id) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/schedules/${id}`, { method: "DELETE" });
      setSchedules((p) => p.filter((s) => s.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <h2>Schedules</h2>
          <p className="muted">
            Run time-based actions (e.g., turn on at 7pm on weekdays). Backend executes schedules on a simple interval loop.
          </p>
          {error ? (
            <div className="pill" role="alert" style={{ borderColor: "#fecaca" }}>
              <span className="dot bad" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Create schedule</h3>
          <form className="grid" onSubmit={createSchedule}>
            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Device</div>
              <select
                className="select"
                value={form.device_id}
                onChange={(e) => setForm((p) => ({ ...p, device_id: e.target.value }))}
                required
              >
                {deviceOptions.length === 0 ? <option value="">No devices</option> : null}
                {deviceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Name</div>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">Time (local)</div>
              <input
                className="input"
                type="time"
                value={form.time_local}
                onChange={(e) => setForm((p) => ({ ...p, time_local: e.target.value }))}
                required
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">Action</div>
              <select
                className="select"
                value={form.action}
                onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
              >
                <option value="turn_on">Turn on</option>
                <option value="turn_off">Turn off</option>
                <option value="set_brightness">Set brightness</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">Brightness</div>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={form.brightness}
                onChange={(e) => setForm((p) => ({ ...p, brightness: Number(e.target.value) }))}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="label">Days</div>
              <div className="row" style={{ justifyContent: "flex-start" }}>
                {weekdays.map((d) => (
                  <button
                    type="button"
                    key={d.key}
                    className={`btn small ${form.days[d.key] ? "primary" : ""}`}
                    onClick={() => toggleDay(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
                <label className="pill" style={{ marginLeft: "auto" }}>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  <span>Enabled</span>
                </label>
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }} className="row">
              <button className="btn primary" disabled={busy || deviceOptions.length === 0}>
                {busy ? "Saving…" : "Create schedule"}
              </button>
              <button className="btn" type="button" onClick={refresh}>
                Refresh
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Existing</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Device</th>
                <th>Time</th>
                <th>Action</th>
                <th>Enabled</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="muted">{devices.find((d) => d.id === s.device_id)?.name || "—"}</td>
                  <td>{s.time_local}</td>
                  <td className="muted">
                    {s.action}
                    {s.action === "set_brightness" ? ` (${s.brightness}%)` : ""}
                  </td>
                  <td>
                    <button className={`btn small ${s.enabled ? "primary" : ""}`} onClick={() => toggleEnabled(s)} disabled={busy}>
                      {s.enabled ? "On" : "Off"}
                    </button>
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => removeSchedule(s.id)} disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No schedules yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

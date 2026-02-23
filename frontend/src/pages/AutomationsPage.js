import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

export default function AutomationsPage() {
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "Night mode",
    device_id: "",
    trigger: "sunset",
    action: "set_brightness",
    brightness: 20,
    enabled: true
  });

  const deviceOptions = useMemo(
    () => devices.map((d) => ({ value: d.id, label: d.name })),
    [devices]
  );

  async function refresh() {
    const [d, a] = await Promise.all([apiFetch("/api/devices"), apiFetch("/api/automations")]);
    setDevices(d);
    setAutomations(a);
    if (!form.device_id && d[0]?.id) setForm((p) => ({ ...p, device_id: d[0].id }));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAutomation(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch("/api/automations", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setAutomations((p) => [created, ...p]);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(automation) {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !automation.enabled })
      });
      setAutomations((p) => p.map((a) => (a.id === automation.id ? updated : a)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAutomation(id) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/automations/${id}`, { method: "DELETE" });
      setAutomations((p) => p.filter((a) => a.id !== id));
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
          <h2>Automations</h2>
          <p className="muted">
            Event-based rules (stubbed). Triggers can be wired to MQTT telemetry, geofencing, sensors, etc.
          </p>
          {error ? (
            <div className="pill" role="alert" style={{ borderColor: "#fecaca" }}>
              <span className="dot bad" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Create automation</h3>
          <form className="grid" onSubmit={createAutomation}>
            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Name</div>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

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
              <div className="label">Trigger</div>
              <select
                className="select"
                value={form.trigger}
                onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value }))}
              >
                <option value="sunset">Sunset</option>
                <option value="sunrise">Sunrise</option>
                <option value="motion_detected">Motion detected</option>
                <option value="device_online">Device online</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 6" }}>
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

            <div style={{ gridColumn: "span 6" }}>
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

            <div style={{ gridColumn: "span 6" }} className="row">
              <label className="pill">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                />
                <span>Enabled</span>
              </label>
            </div>

            <div style={{ gridColumn: "span 12" }} className="row">
              <button className="btn primary" disabled={busy || deviceOptions.length === 0}>
                {busy ? "Saving…" : "Create automation"}
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
                <th>Trigger</th>
                <th>Action</th>
                <th>Enabled</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="muted">{devices.find((d) => d.id === a.device_id)?.name || "—"}</td>
                  <td>{a.trigger}</td>
                  <td className="muted">
                    {a.action}
                    {a.action === "set_brightness" ? ` (${a.brightness}%)` : ""}
                  </td>
                  <td>
                    <button className={`btn small ${a.enabled ? "primary" : ""}`} onClick={() => toggleEnabled(a)} disabled={busy}>
                      {a.enabled ? "On" : "Off"}
                    </button>
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => removeAutomation(a.id)} disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {automations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No automations yet.
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

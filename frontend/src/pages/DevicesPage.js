import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { useDeviceWebSocket } from "../realtime/useDeviceWebSocket";

function statusDot(device) {
  if (!device) return "warn";
  if (!device.online) return "bad";
  return "ok";
}

function fmtPct(v) {
  const n = typeof v === "number" ? v : 0;
  return `${Math.round(n)}%`;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const devicesById = useMemo(() => {
    const m = new Map();
    for (const d of devices) m.set(d.id, d);
    return m;
  }, [devices]);

  const refresh = useCallback(async () => {
    setError(null);
    const list = await apiFetch("/api/devices");
    setDevices(list);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.type === "device_status") {
        const next = devicesById.get(msg.device_id);
        if (!next) return;
        const merged = {
          ...next,
          online: msg.online ?? next.online,
          is_on: msg.is_on ?? next.is_on,
          brightness: msg.brightness ?? next.brightness,
          updated_at: msg.ts || new Date().toISOString(),
        };
        setDevices((prev) => prev.map((d) => (d.id === msg.device_id ? merged : d)));
      }
      if (msg.type === "device_added") {
        refresh().catch(() => {});
      }
      if (msg.type === "device_removed") {
        setDevices((prev) => prev.filter((d) => d.id !== msg.device_id));
      }
    },
    [devicesById, refresh]
  );

  const { status: wsStatus } = useDeviceWebSocket({
    enabled: true,
    onMessage: onWsMessage,
  });

  async function toggleDevice(device) {
    setBusyId(device.id);
    setError(null);
    try {
      const updated = await apiFetch(`/api/devices/${device.id}/state`, {
        method: "POST",
        body: JSON.stringify({ is_on: !device.is_on }),
      });
      setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function setBrightness(device, brightness) {
    setBusyId(device.id);
    setError(null);
    try {
      const updated = await apiFetch(`/api/devices/${device.id}/state`, {
        method: "POST",
        body: JSON.stringify({ brightness }),
      });
      setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function addDemoDevice() {
    setError(null);
    const name = `Living Room ${Math.floor(Math.random() * 90 + 10)}`;
    try {
      const created = await apiFetch("/api/devices", {
        method: "POST",
        body: JSON.stringify({
          name,
          external_id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        }),
      });
      setDevices((prev) => [created, ...prev]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeDevice(deviceId) {
    setBusyId(deviceId);
    setError(null);
    try {
      await apiFetch(`/api/devices/${deviceId}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <div className="row">
            <div>
              <h2>Devices</h2>
              <p className="muted">
                Toggle lights, adjust brightness, and watch live status.{" "}
                <span className="kbd">WS</span>: {wsStatus}
              </p>
            </div>
            <div className="row">
              <button className="btn" onClick={refresh}>
                Refresh
              </button>
              <button className="btn primary" onClick={addDemoDevice}>
                + Add device
              </button>
            </div>
          </div>

          {error ? (
            <div className="pill" role="alert" style={{ borderColor: "#fecaca", marginTop: 12 }}>
              <span className="dot bad" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        {devices.length === 0 ? (
          <div className="card" style={{ gridColumn: "span 12" }}>
            <h3>No devices yet</h3>
            <p className="muted">
              Add your first device or go to <span className="kbd">Provision</span> for QR/code pairing.
            </p>
          </div>
        ) : null}

        {devices.map((d) => (
          <div key={d.id} className="card" style={{ gridColumn: "span 6" }}>
            <div className="row">
              <div className="stack" style={{ gap: 6 }}>
                <div className="row" style={{ justifyContent: "flex-start" }}>
                  <span className={`dot ${statusDot(d)}`} />
                  <strong>{d.name}</strong>
                  <span className="badge">{d.room || "Unassigned"}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {d.online ? "Online" : "Offline"} • Brightness {fmtPct(d.brightness)}
                </div>
              </div>

              <div className="row">
                <button
                  className={`btn ${d.is_on ? "primary" : ""} small`}
                  onClick={() => toggleDevice(d)}
                  disabled={busyId === d.id}
                >
                  {busyId === d.id ? "…" : d.is_on ? "On" : "Off"}
                </button>
                <button
                  className="btn danger small"
                  onClick={() => removeDevice(d.id)}
                  disabled={busyId === d.id}
                >
                  Remove
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="label">Brightness</div>
              <input
                className="input"
                type="range"
                min="0"
                max="100"
                value={Math.round(d.brightness ?? 0)}
                onChange={(e) => setBrightness(d, Number(e.target.value))}
                disabled={!d.online || busyId === d.id}
              />
              <div className="row">
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.is_on ? "Emitting" : "Off"} • Updated {new Date(d.updated_at).toLocaleTimeString()}
                </span>
                <span className="kbd">{d.external_id?.slice(0, 8) || "device"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

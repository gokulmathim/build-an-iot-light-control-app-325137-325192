import React, { useState } from "react";
import { apiFetch } from "../api/client";

function parseProvisionCode(raw) {
  // Accept formats like:
  //  - LC-<external_id>
  //  - external_id directly
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("LC-")) return trimmed.slice(3);
  return trimmed;
}

export default function ProvisionPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("New Light");
  const [room, setRoom] = useState("Living Room");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function provision(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const external_id = parseProvisionCode(code);
      if (!external_id) throw new Error("Enter a provisioning code.");

      const created = await apiFetch("/api/provision", {
        method: "POST",
        body: JSON.stringify({ external_id, name, room })
      });
      setResult(created);
      setCode("");
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <h2>Provision device</h2>
          <p className="muted">
            Pair a device using a QR/code. For demo, use any string (e.g. <span className="kbd">LC-abc123</span>).
          </p>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <form onSubmit={provision} className="grid">
            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Provisioning code</div>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LC-abc123"
                required
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Device name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="label">Room</div>
              <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>

            <div style={{ gridColumn: "span 12" }} className="row">
              <button className="btn primary" disabled={busy} type="submit">
                {busy ? "Provisioning…" : "Provision"}
              </button>
            </div>

            {error ? (
              <div style={{ gridColumn: "span 12" }} className="pill" role="alert" style={{ borderColor: "#fecaca" }}>
                <span className="dot bad" />
                <span>{error}</span>
              </div>
            ) : null}

            {result ? (
              <div style={{ gridColumn: "span 12" }} className="pill" style={{ borderColor: "#bbf7d0" }}>
                <span className="dot ok" />
                <span>
                  Paired <strong>{result.name}</strong> (id {result.id.slice(0, 8)})
                </span>
              </div>
            ) : null}
          </form>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>How it works</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            The backend treats the provisioning code as an <span className="kbd">external_id</span> and creates a device.
            In a real system, this code would be issued by the hardware at manufacturing time and verified server-side.
          </p>
        </div>
      </div>
    </div>
  );
}

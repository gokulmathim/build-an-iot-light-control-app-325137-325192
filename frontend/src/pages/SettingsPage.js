import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const h = await apiFetch("/healthz");
        setHealth(h);
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, []);

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <h2>Settings</h2>
          <p className="muted">Environment and connectivity diagnostics.</p>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Account</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Signed in as <strong>{user?.email}</strong>
          </p>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Backend</h3>
          <table className="table">
            <tbody>
              <tr>
                <th>REACT_APP_API_BASE</th>
                <td className="muted">{process.env.REACT_APP_API_BASE}</td>
              </tr>
              <tr>
                <th>REACT_APP_WS_URL</th>
                <td className="muted">{process.env.REACT_APP_WS_URL}</td>
              </tr>
              <tr>
                <th>Health</th>
                <td className="muted">
                  {error ? error : health ? JSON.stringify(health) : "Loading…"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

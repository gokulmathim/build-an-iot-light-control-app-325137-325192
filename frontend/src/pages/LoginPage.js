import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();
  const location = useLocation();
  const next = location.state?.from?.pathname || "/devices";

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav(next, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <div className="row">
            <div>
              <h2>Sign in</h2>
              <p className="muted">
                Control lights, set schedules, and watch real-time status updates.
              </p>
            </div>
            <div className="pill">
              <span className="dot warn" />
              <span>API: {process.env.REACT_APP_API_BASE}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 12" }}>
          <form onSubmit={onSubmit} className="stack">
            <div>
              <div className="label">Email</div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <div className="label">Password</div>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <div className="pill" role="alert" style={{ borderColor: "#fecaca" }}>
                <span className="dot bad" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="row">
              <button className="btn primary" disabled={busy} type="submit">
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <Link className="btn" to="/signup">
                Create account
              </Link>
            </div>

            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Demo defaults: <span className="kbd">demo@example.com</span> /{" "}
              <span className="kbd">demo1234</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

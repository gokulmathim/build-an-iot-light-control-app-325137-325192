import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(email.trim(), password);
      nav("/devices", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 12" }}>
          <h2>Create account</h2>
          <p className="muted">
            Sign up to manage your lights and schedules across devices.
          </p>
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
                autoComplete="new-password"
                required
                minLength={6}
              />
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Use at least 6 characters.
              </div>
            </div>

            {error ? (
              <div className="pill" role="alert" style={{ borderColor: "#fecaca" }}>
                <span className="dot bad" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="row">
              <button className="btn primary" disabled={busy} type="submit">
                {busy ? "Creating…" : "Create account"}
              </button>
              <Link className="btn" to="/login">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

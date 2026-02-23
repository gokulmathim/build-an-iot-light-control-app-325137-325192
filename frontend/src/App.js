import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DevicesPage from "./pages/DevicesPage";
import SchedulesPage from "./pages/SchedulesPage";
import AutomationsPage from "./pages/AutomationsPage";
import ProvisionPage from "./pages/ProvisionPage";
import SettingsPage from "./pages/SettingsPage";

function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span>LightControl</span>
          <span className="badge">IoT</span>
        </div>

        {user ? (
          <nav className="nav" aria-label="Main navigation">
            <NavLink to="/devices" className={({ isActive }) => (isActive ? "active" : "")}>
              Devices
            </NavLink>
            <NavLink to="/schedules" className={({ isActive }) => (isActive ? "active" : "")}>
              Schedules
            </NavLink>
            <NavLink to="/automations" className={({ isActive }) => (isActive ? "active" : "")}>
              Automations
            </NavLink>
            <NavLink to="/provision" className={({ isActive }) => (isActive ? "active" : "")}>
              Provision
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
              Settings
            </NavLink>
            <button className="btn small" onClick={logout}>
              Logout
            </button>
          </nav>
        ) : (
          <div className="pill">
            <span className="dot warn" />
            <span>Not signed in</span>
          </div>
        )}
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
export default function App() {
  /** React SPA entry with routes and app shell. */
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="shell">
          <Topbar />
          <main className="main">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route
                path="/devices"
                element={
                  <RequireAuth>
                    <DevicesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/schedules"
                element={
                  <RequireAuth>
                    <SchedulesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/automations"
                element={
                  <RequireAuth>
                    <AutomationsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/provision"
                element={
                  <RequireAuth>
                    <ProvisionPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <SettingsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="*"
                element={
                  <div className="container">
                    <div className="card">
                      <h2>Not found</h2>
                      <p className="muted">
                        Try <span className="kbd">/devices</span>.
                      </p>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

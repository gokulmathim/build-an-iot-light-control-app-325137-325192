import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// PUBLIC_INTERFACE
export default function RequireAuth({ children }) {
  /** Redirects unauthenticated users to login. */
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="row">
            <div className="pill">
              <span className="dot warn" />
              <span>Loading session…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

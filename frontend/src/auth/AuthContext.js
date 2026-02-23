import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

const AuthContext = createContext(null);

function readStoredUser() {
  const raw = window.localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication state and actions. */
  const [user, setUser] = useState(readStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate token (if any) and fetch profile.
    async function bootstrap() {
      const token = window.localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiFetch("/api/me");
        setUser(me);
        window.localStorage.setItem("user", JSON.stringify(me));
      } catch {
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    window.localStorage.setItem("access_token", res.access_token);
    const me = await apiFetch("/api/me");
    window.localStorage.setItem("user", JSON.stringify(me));
    setUser(me);
  }

  async function signup(email, password) {
    await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Auto-login after signup
    await login(email, password);
  }

  function logout() {
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("user");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth context. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

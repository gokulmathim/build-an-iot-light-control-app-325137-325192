/**
 * Small fetch wrapper with JSON defaults and auth header injection.
 */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:8000";

export function getApiBase() {
  return API_BASE;
}

function getToken() {
  return window.localStorage.getItem("access_token");
}

// PUBLIC_INTERFACE
export async function apiFetch(path, options = {}) {
  /** Fetch JSON from the backend with Authorization header if present. */
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (payload && payload.detail) ||
      (typeof payload === "string" ? payload : "Request failed");
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// PUBLIC_INTERFACE
export function wsUrl() {
  /** Get WS URL from env. */
  return (
    process.env.REACT_APP_WS_URL ||
    API_BASE.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
  );
}

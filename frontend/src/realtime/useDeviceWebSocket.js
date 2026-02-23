import { useEffect, useRef, useState } from "react";
import { wsUrl } from "../api/client";

// PUBLIC_INTERFACE
export function useDeviceWebSocket({ enabled, onMessage }) {
  /** Connects to the backend WS and forwards parsed JSON messages. */
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef(null);
  const retryRef = useRef({ attempt: 0, timer: null });

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      const token = window.localStorage.getItem("access_token");
      const url = new URL(wsUrl());
      if (token) url.searchParams.set("token", token);

      setStatus("connecting");
      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current.attempt = 0;
        setStatus("connected");
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          onMessage?.(msg);
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        // exponential backoff up to 10s
        const attempt = Math.min(retryRef.current.attempt + 1, 7);
        retryRef.current.attempt = attempt;
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        retryRef.current.timer = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // close will trigger reconnect
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    }

    connect();

    return () => {
      if (retryRef.current.timer) window.clearTimeout(retryRef.current.timer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState <= 1) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    };
  }, [enabled, onMessage]);

  return { status };
}

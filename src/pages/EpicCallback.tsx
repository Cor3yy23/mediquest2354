import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { getApiBaseUrl } from "../utils/api";
import { getSession } from "../utils/auth";

const TOKEN_KEY = "mediquest_access_token";

function parseErrorPayload(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Epic callback request failed.";

  try {
    const payload = JSON.parse(trimmed) as unknown;
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      const maybe = payload as { message?: unknown; title?: unknown; detail?: unknown };
      if (typeof maybe.message === "string") return maybe.message;
      if (typeof maybe.title === "string") return maybe.title;
      if (typeof maybe.detail === "string") return maybe.detail;
    }
  } catch {
    // ignore JSON parse errors and fall through to plain text
  }

  return trimmed;
}

export default function EpicCallback() {
  const session = useMemo(() => getSession(), []);
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Completing Epic connection...");
  const submittedRef = useRef(false);
  const [showTimeoutHelp, setShowTimeoutHelp] = useState(false);

  useEffect(() => {
    console.log("[EpicCallback] mounted");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || `Epic login failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing OAuth callback parameters. Please reconnect Epic.");
      return;
    }

    console.log(`[EpicCallback] token ${token ? "found" : "missing"}`);
    if (!token) {
      setStatus("error");
      setMessage("You must be signed in to finish Epic connection.");
      return;
    }

    if (submittedRef.current) return;
    submittedRef.current = true;

    let hasErrored = false;
    const fallbackTimer = window.setTimeout(() => {
      if (hasErrored) return;
      setShowTimeoutHelp(true);
      setMessage("Epic connection may have completed. Go back to Home and check connection status.");
    }, 5_000);

    const submit = async () => {
      try {
        const callbackUrl = `${getApiBaseUrl()}/api/epic/callback`;
        console.log("[EpicCallback] posting callback", { url: callbackUrl });

        const response = await fetch(callbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        });

        console.log("[EpicCallback] response status", response.status);

        console.log("[EpicCallback] response ok", response.ok);

        if (response.ok) {
          console.log("[EpicCallback] entering success redirect branch");
          window.clearTimeout(fallbackTimer);
          const homeUrl = `${window.location.origin}/home`;
          console.log("[EpicCallback] redirecting home now", homeUrl);
          window.location.assign(homeUrl);
          setTimeout(() => window.location.replace(homeUrl), 100);
          return;
        } else {
          hasErrored = true;
          window.clearTimeout(fallbackTimer);

          const errorText = await response.text();
          const cleanMessage = parseErrorPayload(errorText);
          setStatus("error");
          setMessage(cleanMessage || "Epic connection failed during callback.");
        }
      } catch (err) {
        hasErrored = true;
        window.clearTimeout(fallbackTimer);
        console.error("[EpicCallback] error", err);
        setStatus("error");
        setMessage("Epic connection failed during callback. Start Connect Epic again.");
      }
    };

    void submit();

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [searchParams, token]);

  if (!session) return <Navigate to="/signin" replace />;

  return (
    <main className="panel" style={{ maxWidth: 560, margin: "3rem auto", padding: "1.5rem" }}>
      <h1>Epic Connection</h1>
      <p className="meta">{message}</p>
      {status === "loading" && <p>Connecting...</p>}
      {(status === "error" || showTimeoutHelp) && (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              window.location.href = `${window.location.origin}/home`;
            }}
          >
            Back to Home
          </button>
        </div>
      )}
    </main>
  );
}

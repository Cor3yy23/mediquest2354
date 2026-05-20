const DEFAULT_API_BASE_URL = "http://localhost:5000";

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export type ApiError = Error & { status?: number; details?: unknown };

function buildError(message: string, status?: number, details?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.details = details;
  return err;
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    const descriptions = payload
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "description" in item) {
          const description = (item as { description?: unknown }).description;
          return typeof description === "string" ? description : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));

    if (descriptions.length > 0) {
      return descriptions.join(" ");
    }

    return null;
  }

  if (payload && typeof payload === "object") {
    const maybePayload = payload as {
      message?: unknown;
      title?: unknown;
      errors?: unknown;
      detail?: unknown;
    };

    if (typeof maybePayload.message === "string") return maybePayload.message;
    if (typeof maybePayload.title === "string") return maybePayload.title;
    if (typeof maybePayload.detail === "string") return maybePayload.detail;

    if (maybePayload.errors && typeof maybePayload.errors === "object") {
      const values = Object.values(maybePayload.errors as Record<string, unknown>);
      const flattened = values.flatMap((value) => {
        if (typeof value === "string") return [value];
        if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string");
        return [];
      });

      if (flattened.length > 0) {
        return flattened.join(" ");
      }
    }
  }

  return null;
}

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    return null as T;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(bodyText) as T;
  }

  const trimmedBody = bodyText.trim();
  if (trimmedBody.startsWith("{") || trimmedBody.startsWith("[")) {
    try {
      return JSON.parse(trimmedBody) as T;
    } catch {
      // fall through to text
    }
  }

  return bodyText as T;
}

async function parseErrorResponse(response: Response): Promise<{ message: string; details?: unknown }> {
  const defaultMessage = `Request failed (${response.status})`;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    return { message: defaultMessage };
  }

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(bodyText) as unknown;
      return { message: extractErrorMessage(payload) || defaultMessage, details: payload };
    } catch {
      return { message: bodyText };
    }
  }

  return { message: bodyText };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const parsed = await parseErrorResponse(response);
    throw buildError(parsed.message, response.status, parsed.details);
  }

  return await parseSuccessResponse<T>(response);
}

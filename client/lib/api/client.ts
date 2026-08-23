/**
 * Base API client — wraps `fetch` with JSON encoding, auth header injection,
 * and typed errors.
 *
 * Every other API module builds on top of this. Keep it tiny.
 */

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Structured validation error returned by the FastAPI error handler. */
export interface ApiFieldError {
  field: string;
  message: string;
  code: string;
}

export class ApiError extends Error {
  status: number;
  /** Top-level human message (e.g. "Validation failed", "Email already registered"). */
  detail: string;
  /** Per-field validation errors for 422 responses, if the server returned them. */
  fieldErrors: ApiFieldError[];
  /** Single-field hint from the server via the `X-Error-Field` header. */
  field?: string;

  constructor(
    status: number,
    detail: string,
    fieldErrors: ApiFieldError[] = [],
    field?: string,
  ) {
    super(detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    if (field) this.field = field;
  }
}

export interface ApiRequestOptions {
  /** Bearer token. Pulled from the auth store automatically if omitted. */
  token?: string | null;
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal;
  /** Query string params. Skipped when null/undefined. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Extra headers to merge in. */
  headers?: Record<string, string>;
}

function buildUrl(
  base: string,
  path: string,
  query?: ApiRequestOptions["query"],
): string {
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function extractFieldErrors(payload: unknown): ApiFieldError[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): ApiFieldError[] => {
    if (!item || typeof item !== "object") return [];
    const it = item as Record<string, unknown>;
    return [
      {
        field: typeof it.field === "string" ? it.field : "_root",
        message: typeof it.message === "string" ? it.message : "Invalid value",
        code: typeof it.code === "string" ? it.code : "validation_error",
      },
    ];
  });
}

function extractDetail(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const d = (payload as { detail?: unknown }).detail;
  if (typeof d === "string") return d;
  return fallback;
}

export interface ApiClientConfig {
  baseUrl: string;
}

export function createApiClient(config: Partial<ApiClientConfig> = {}) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      // ngrok's free tier injects a browser-warning interstitial on first
      // visit unless this header is set. It's a no-op for non-ngrok hosts
      // and other intermediaries, so it's safe to send unconditionally.
      "ngrok-skip-browser-warning": "true",
      ...(options.headers ?? {}),
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const init: RequestInit = {
      method,
      headers,
      ...(options.signal ? { signal: options.signal } : {}),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(buildUrl(baseUrl, path, options.query), init);

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    const payload = text ? safeJson(text) : null;

    if (!res.ok) {
      const fieldErrors = extractFieldErrors(payload);
      const headerField = res.headers.get("X-Error-Field") || undefined;
      const detail = extractDetail(
        payload,
        fieldErrors[0]?.message ?? res.statusText,
      );
      throw new ApiError(res.status, detail, fieldErrors, headerField);
    }

    return payload as T;
  }

  return {
    baseUrl,
    get: <T>(path: string, options?: ApiRequestOptions) =>
      request<T>("GET", path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>("POST", path, body, options),
    put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>("PUT", path, body, options),
    patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>("PATCH", path, body, options),
    delete: <T>(path: string, options?: ApiRequestOptions) =>
      request<T>("DELETE", path, undefined, options),
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = createApiClient();
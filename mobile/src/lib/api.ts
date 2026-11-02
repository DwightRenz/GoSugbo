import { API_URL } from "./config";
import { tokenStorage } from "./storage";

/**
 * Backend errors look like { status, message, fieldErrors }.
 * Messages such as "EMAIL_NOT_VERIFIED: ..." or "OTP_REQUIRED: ..." are split
 * into `code` and a clean `message`.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors: Record<string, string>;

  constructor(
    status: number,
    rawMessage: string,
    fieldErrors: Record<string, string> = {},
  ) {
    const match = /^([A-Z][A-Z_]+):\s*([\s\S]*)$/.exec(rawMessage);
    super(match ? match[2] : rawMessage);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = "ApiError";
    this.status = status;
    this.code = match ? match[1] : undefined;
    this.fieldErrors = fieldErrors;
  }

  /** First field error if present, otherwise the main message. */
  get displayMessage(): string {
    const first = Object.values(this.fieldErrors)[0];
    return first ?? this.message;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Called when an authenticated request comes back 401 (expired/revoked token). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the stored access token. */
  auth?: boolean;
  /** Use this token instead of the stored one. */
  token?: string | null;
  timeoutMs?: number;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = false,
    token,
    timeoutMs = 15000,
  } = options;

  if (!API_URL) {
    throw new ApiError(
      0,
      "API URL is not set. Add EXPO_PUBLIC_API_URL to mobile/.env and restart Expo.",
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "bypass-tunnel-reminder": "true", // localtunnel: skip the reminder page
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const bearer = token ?? (auth ? await tokenStorage.get() : null);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted ?
        "The server took too long to respond. Please try again."
      : "Cannot reach the server. Check your internet connection and the API URL.",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && bearer) unauthorizedHandler?.();
    throw new ApiError(
      response.status,
      data?.message ?? `Request failed (${response.status})`,
      data?.fieldErrors ?? {},
    );
  }

  if (text && data === null) {
    throw new ApiError(
      response.status,
      "Unexpected response from the server. Check the API URL / tunnel.",
    );
  }

  return data as T;
}

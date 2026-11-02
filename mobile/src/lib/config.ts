export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/+$/,
  "",
);
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

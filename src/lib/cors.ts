import { isAllowedWidgetOrigin } from "@/lib/tenant";

export function buildCorsHeaders(origin?: string | null) {
  const allowed = isAllowedWidgetOrigin(origin);

  return {
    ...(allowed && origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

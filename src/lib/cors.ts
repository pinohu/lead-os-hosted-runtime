import { isAllowedWidgetOrigin } from "@/lib/tenant";

export function buildCorsHeaders(origin?: string | null) {
  const allowed = isAllowedWidgetOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

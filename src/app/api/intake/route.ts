import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import type { HostedLeadPayload } from "@/lib/intake";
import { buildPublicIntakeResponse, persistLead } from "@/lib/intake";
import { isAllowedWidgetOrigin } from "@/lib/tenant";

const MAX_INTAKE_BYTES = Number(process.env.LEAD_OS_MAX_INTAKE_BYTES ?? 32_768);
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.LEAD_OS_INTAKE_RATE_LIMIT ?? 15);
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function getTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    return isAllowedWidgetOrigin(origin) ? origin : null;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return isAllowedWidgetOrigin(refererOrigin) ? refererOrigin : null;
    } catch {
      return null;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") {
    return "same-site";
  }

  return null;
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  rateLimitStore.set(ip, existing);
  return false;
}

export async function OPTIONS(request: Request) {
  const trustedOrigin = getTrustedRequestOrigin(request);
  if (!trustedOrigin) {
    return NextResponse.json(
      { success: false, error: "Origin not allowed" },
      {
        status: 403,
        headers: buildCorsHeaders(request.headers.get("origin")),
      },
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const trustedOrigin = getTrustedRequestOrigin(request);
  const headers = buildCorsHeaders(request.headers.get("origin"));
  if (!trustedOrigin) {
    return NextResponse.json(
      { success: false, error: "Origin not allowed" },
      { status: 403, headers },
    );
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: "Too many intake requests. Try again shortly." },
      { status: 429, headers },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_INTAKE_BYTES) {
    return NextResponse.json(
      { success: false, error: "Request body too large." },
      { status: 413, headers },
    );
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body too large." },
        { status: 413, headers },
      );
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const honeypotFields = [
      typeof payload.website === "string" ? payload.website : "",
      typeof payload.companyWebsite === "string" ? payload.companyWebsite : "",
      payload.metadata && typeof payload.metadata === "object" && typeof (payload.metadata as Record<string, unknown>).website === "string"
        ? String((payload.metadata as Record<string, unknown>).website)
        : "",
    ].map((value) => value.trim()).filter(Boolean);

    if (honeypotFields.length > 0) {
      return NextResponse.json(
        { success: false, error: "Submission rejected." },
        { status: 400, headers },
      );
    }

    const result = await persistLead(payload as unknown as HostedLeadPayload);
    return NextResponse.json(buildPublicIntakeResponse(result), { headers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Intake failed" },
      { status: 400, headers },
    );
  }
}

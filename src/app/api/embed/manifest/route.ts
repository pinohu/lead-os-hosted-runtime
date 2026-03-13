import { NextResponse } from "next/server";
import { nicheCatalog } from "@/lib/catalog";
import { buildCorsHeaders } from "@/lib/cors";
import { tenantConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    tenant: tenantConfig,
    niches: Object.values(nicheCatalog),
    widgets: {
      chat: true,
      form: true,
      assessment: true,
      calculator: true,
    },
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

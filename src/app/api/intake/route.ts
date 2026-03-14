import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { persistLead } from "@/lib/intake";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const headers = buildCorsHeaders(request.headers.get("origin"));
  try {
    const payload = await request.json();
    const result = await persistLead(payload);
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Intake failed" },
      { status: 400, headers },
    );
  }
}

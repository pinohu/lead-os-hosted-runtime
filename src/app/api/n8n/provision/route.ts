import { NextResponse } from "next/server";
import { canProvisionToN8n, getN8nStarterWorkflowStatus, provisionN8nStarterWorkflows } from "@/lib/n8n-client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!canProvisionToN8n()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message: "n8n API credentials are not configured for provisioning",
      },
      { status: 503 },
    );
  }

  const workflows = await getN8nStarterWorkflowStatus();
  return NextResponse.json({
    success: true,
    configured: true,
    count: workflows.length,
    workflows,
  });
}

export async function POST(request: Request) {
  if (!canProvisionToN8n()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message: "n8n API credentials are not configured for provisioning",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await provisionN8nStarterWorkflows({
    slugs: Array.isArray(body.slugs) ? body.slugs : undefined,
    replaceExisting: body.replaceExisting !== false,
    activate: body.activate !== false,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 207,
  });
}

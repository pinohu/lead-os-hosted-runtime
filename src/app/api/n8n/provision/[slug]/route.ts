import { NextResponse } from "next/server";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { buildStarterProvisionPayload, canProvisionToN8n, provisionN8nStarterWorkflows } from "@/lib/n8n-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const { slug } = await context.params;
  const workflow = buildStarterProvisionPayload(slug);

  if (!workflow) {
    return NextResponse.json({ success: false, message: "Unknown n8n starter workflow" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    canProvision: canProvisionToN8n(),
    workflow: {
      slug: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      family: workflow.family,
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const { slug } = await context.params;
  const workflow = buildStarterProvisionPayload(slug);

  if (!workflow) {
    return NextResponse.json({ success: false, message: "Unknown n8n starter workflow" }, { status: 404 });
  }

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

  const result = await provisionN8nStarterWorkflows({
    slugs: [slug],
    replaceExisting: true,
    activate: true,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 207,
  });
}

import { NextResponse } from "next/server";
import { getN8nStarterWorkflow } from "@/lib/n8n-starter-pack";

type Params = Promise<{ slug: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  const { slug } = await context.params;
  const workflow = getN8nStarterWorkflow(slug);

  if (!workflow) {
    return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(workflow.workflow, {
    headers: {
      "Content-Disposition": `attachment; filename="${workflow.slug}.json"`,
    },
  });
}

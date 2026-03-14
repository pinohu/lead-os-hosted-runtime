import { NextResponse } from "next/server";
import { N8N_STARTER_WORKFLOWS } from "@/lib/n8n-starter-pack";
import { canProvisionToN8n } from "@/lib/n8n-client";

export async function GET() {
  return NextResponse.json({
    success: true,
    count: N8N_STARTER_WORKFLOWS.length,
    canProvision: canProvisionToN8n(),
    provisionUrl: "/api/n8n/provision",
    workflows: N8N_STARTER_WORKFLOWS.map((workflow) => ({
      slug: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      family: workflow.family,
      sources: workflow.sources,
      repos: workflow.repos,
      importUrl: `/api/n8n/workflows/${workflow.slug}`,
      provisionUrl: `/api/n8n/provision/${workflow.slug}`,
    })),
    reposApplied: [
      "Zie619/n8n-workflows",
      "enescingoz/awesome-n8n-templates",
      "czlonkowski/n8n-mcp",
      "n8n-io/self-hosted-ai-starter-kit",
      "wassupjay/n8n-free-templates",
      "growchief/growchief",
    ],
  });
}

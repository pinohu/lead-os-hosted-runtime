import { NextResponse } from "next/server";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import {
  getBookingJobs,
  getCanonicalEvents,
  getLeadRecords,
  getProviderExecutions,
  getRuntimePersistenceMode,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const includeSystemTraffic = new URL(request.url).searchParams.get("include") === "system";
  const [leads, events, bookingJobs, providerExecutions, workflowRuns] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getProviderExecutions(),
    getWorkflowRuns(),
  ]);
  return NextResponse.json({
    success: true,
    tenantId: tenantConfig.tenantId,
    brandName: tenantConfig.brandName,
    liveMode: getAutomationHealth().liveMode,
    persistenceMode: getRuntimePersistenceMode(),
    framework: THREE_VISIT_FRAMEWORK,
    dashboard: buildOperatorConsoleSnapshot(
      leads,
      events,
      bookingJobs,
      providerExecutions,
      workflowRuns,
      { includeSystemTraffic },
    ),
  });
}

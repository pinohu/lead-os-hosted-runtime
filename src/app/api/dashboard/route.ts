import { NextResponse } from "next/server";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshotWithOptions } from "@/lib/dashboard";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords, getRuntimePersistenceMode } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const leads = await getLeadRecords();
  const events = await getCanonicalEvents();
  const includeSystemTraffic = new URL(request.url).searchParams.get("include") === "system";
  return NextResponse.json({
    success: true,
    tenantId: tenantConfig.tenantId,
    brandName: tenantConfig.brandName,
    liveMode: getAutomationHealth().liveMode,
    persistenceMode: getRuntimePersistenceMode(),
    framework: THREE_VISIT_FRAMEWORK,
    dashboard: buildDashboardSnapshotWithOptions(leads, events, { includeSystemTraffic }),
  });
}

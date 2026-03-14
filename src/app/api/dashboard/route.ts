import { NextResponse } from "next/server";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const leads = getLeadRecords();
  const events = getCanonicalEvents();
  return NextResponse.json({
    success: true,
    tenantId: tenantConfig.tenantId,
    brandName: tenantConfig.brandName,
    liveMode: getAutomationHealth().liveMode,
    framework: THREE_VISIT_FRAMEWORK,
    dashboard: buildDashboardSnapshot(leads, events),
  });
}

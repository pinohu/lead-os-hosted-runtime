import { NextResponse } from "next/server";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export async function GET() {
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

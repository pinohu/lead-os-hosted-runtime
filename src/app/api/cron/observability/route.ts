import { NextResponse } from "next/server";
import { getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
import { dispatchObservabilityNotifications } from "@/lib/observability-notifications";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { buildSystemOverviewSnapshot } from "@/lib/operator-observability";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getExecutionTasks,
  getLeadRecords,
  getProviderDispatchRequests,
  getProviderExecutions,
  getWorkflowRuns,
} from "@/lib/runtime-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const [
    leads,
    events,
    bookingJobs,
    documentJobs,
    executionTasks,
    workflowRuns,
    providerDispatchRequests,
    providerExecutions,
    runtimeConfig,
    deploymentSnapshot,
  ] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getDocumentJobs(),
    getExecutionTasks(),
    getWorkflowRuns(),
    getProviderDispatchRequests(),
    getProviderExecutions(),
    getOperationalRuntimeConfig(),
    getDeploymentRegistrySnapshot(),
  ]);

  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    executionTasks,
    providerDispatchRequests,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    runtimeConfig.marketplace,
    {},
  );
  const overview = buildSystemOverviewSnapshot({
    consoleSnapshot,
    leads,
    workflowRuns,
    providerExecutions,
    bookingJobs,
    documentJobs,
    executionTasks,
    providerRequests: providerDispatchRequests,
    deploymentSummary: deploymentSnapshot.summary,
  });
  const triggeredRules = overview.rules.filter((rule) => rule.triggered);
  const deliveries = await dispatchObservabilityNotifications(triggeredRules, runtimeConfig);

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    activeAlerts: overview.activeAlerts,
    triggeredRules,
    deliveries,
    counts: {
      activeAlerts: overview.activeAlerts.length,
      triggeredRules: triggeredRules.length,
      deliveries: deliveries.length,
      sentDeliveries: deliveries.filter((delivery) => delivery.status === "sent").length,
      failedDeliveries: deliveries.filter((delivery) => delivery.status === "failed").length,
      suppressedDeliveries: deliveries.filter((delivery) => delivery.status === "suppressed").length,
    },
  });
}

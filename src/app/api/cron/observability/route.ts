import { NextResponse } from "next/server";
import { getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
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

export async function GET() {
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

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    activeAlerts: overview.activeAlerts,
    triggeredRules: overview.rules.filter((rule) => rule.triggered),
    counts: {
      activeAlerts: overview.activeAlerts.length,
      triggeredRules: overview.rules.filter((rule) => rule.triggered).length,
    },
  });
}

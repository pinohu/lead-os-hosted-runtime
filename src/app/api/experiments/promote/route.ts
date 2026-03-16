import { NextResponse } from "next/server";
import { isKnownExperimentVariant } from "@/lib/experiments";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { getOperationalRuntimeConfig, updateOperationalRuntimeConfig } from "@/lib/runtime-config";

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin"] });
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({})) as {
    experimentId?: string;
    variantId?: string;
    reason?: string;
  };
  const experimentId = typeof body.experimentId === "string" ? body.experimentId.trim() : "";
  const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
  if (!experimentId || !variantId) {
    return NextResponse.json({ success: false, error: "Experiment ID and variant ID are required." }, { status: 400 });
  }
  if (!isKnownExperimentVariant(experimentId, variantId)) {
    return NextResponse.json({ success: false, error: "Variant is not a promotable winner for this experiment." }, { status: 400 });
  }

  const current = await getOperationalRuntimeConfig();
  const promotions = current.experiments.promotions.filter((entry) => entry.experimentId !== experimentId);
  promotions.push({
    experimentId,
    variantId,
    promotedAt: new Date().toISOString(),
    promotedBy: auth.session?.email,
    reason: typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined,
  });
  const updated = await updateOperationalRuntimeConfig({
    experiments: {
      promotions,
    },
  }, auth.session?.email);

  return NextResponse.json({
    success: true,
    promotions: updated.experiments.promotions,
  });
}

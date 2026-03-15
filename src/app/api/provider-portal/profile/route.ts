import { NextResponse } from "next/server";
import { getDispatchProviderById, updateDispatchProviderSelfServe } from "@/lib/runtime-config";
import { requireProviderPortalApiSession } from "@/lib/provider-portal-auth";

export async function GET(request: Request) {
  const auth = await requireProviderPortalApiSession(request);
  if (auth.response || !auth.session) {
    return auth.response!;
  }

  const provider = await getDispatchProviderById(auth.session.providerId);
  if (!provider) {
    return NextResponse.json({ success: false, error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    provider,
  });
}

export async function POST(request: Request) {
  const auth = await requireProviderPortalApiSession(request);
  if (auth.response || !auth.session) {
    return auth.response!;
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const provider = await updateDispatchProviderSelfServe(
    auth.session.providerId,
    {
      phone: typeof body.phone === "string" ? body.phone : undefined,
      acceptingNewJobs: typeof body.acceptingNewJobs === "boolean" ? body.acceptingNewJobs : undefined,
      maxConcurrentJobs: typeof body.maxConcurrentJobs === "number" ? body.maxConcurrentJobs : undefined,
      activeJobs: typeof body.activeJobs === "number" ? body.activeJobs : undefined,
      propertyTypes: Array.isArray(body.propertyTypes) ? body.propertyTypes.filter((value): value is string => typeof value === "string") : undefined,
      issueTypes: Array.isArray(body.issueTypes) ? body.issueTypes.filter((value): value is string => typeof value === "string") : undefined,
      states: Array.isArray(body.states) ? body.states.filter((value): value is string => typeof value === "string") : undefined,
      counties: Array.isArray(body.counties) ? body.counties.filter((value): value is string => typeof value === "string") : undefined,
      cities: Array.isArray(body.cities) ? body.cities.filter((value): value is string => typeof value === "string") : undefined,
      zipPrefixes: Array.isArray(body.zipPrefixes) ? body.zipPrefixes.filter((value): value is string => typeof value === "string") : undefined,
      emergencyCoverageWindow: typeof body.emergencyCoverageWindow === "string" ? body.emergencyCoverageWindow : undefined,
    },
    auth.session.email,
  );

  return NextResponse.json({
    success: true,
    provider,
  });
}

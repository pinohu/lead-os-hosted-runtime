import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartEmergencyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartEmergencyPage({ searchParams }: StartEmergencyPageProps) {
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("emergency")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

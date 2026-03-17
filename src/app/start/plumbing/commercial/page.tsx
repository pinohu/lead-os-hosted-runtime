import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartCommercialPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartCommercialPage({ searchParams }: StartCommercialPageProps) {
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("commercial")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

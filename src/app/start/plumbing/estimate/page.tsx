import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartEstimatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartEstimatePage({ searchParams }: StartEstimatePageProps) {
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("estimate")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

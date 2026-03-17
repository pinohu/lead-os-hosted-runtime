import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartProviderJoinPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartProviderJoinPage({ searchParams }: StartProviderJoinPageProps) {
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("provider")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

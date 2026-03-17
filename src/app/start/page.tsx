import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartPage({ searchParams }: StartPageProps) {
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("hub")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

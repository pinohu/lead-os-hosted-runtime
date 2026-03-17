import { PublicEndUserFunnelPage, getEndUserFunnel } from "@/components/PublicEndUserFunnelPage";

type StartLocalPageProps = {
  params: Promise<{ zip: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartLocalPage({ params, searchParams }: StartLocalPageProps) {
  const { zip } = await params;
  return (
    <PublicEndUserFunnelPage
      funnel={getEndUserFunnel("local", { zip })}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

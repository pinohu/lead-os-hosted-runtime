import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type ProviderNetworkPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProviderNetworkPage({ searchParams }: ProviderNetworkPageProps) {
  return (
    <PlumbingEntryPage
      entry={getPlumbingEntrypoint("provider")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

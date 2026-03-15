import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type CommercialPlumbingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommercialPlumbingPage({ searchParams }: CommercialPlumbingPageProps) {
  return (
    <PlumbingEntryPage
      entry={getPlumbingEntrypoint("commercial")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

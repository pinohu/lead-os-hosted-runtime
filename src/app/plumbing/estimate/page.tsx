import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type PlumbingEstimatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlumbingEstimatePage({ searchParams }: PlumbingEstimatePageProps) {
  return (
    <PlumbingEntryPage
      entry={getPlumbingEntrypoint("estimate")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

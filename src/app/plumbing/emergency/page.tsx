import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type EmergencyPlumbingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmergencyPlumbingPage({ searchParams }: EmergencyPlumbingPageProps) {
  return (
    <PlumbingEntryPage
      entry={getPlumbingEntrypoint("emergency")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

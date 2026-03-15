import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type LocalZipPageProps = {
  params: Promise<{ zip: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocalZipPage({ params, searchParams }: LocalZipPageProps) {
  const { zip } = await params;
  return (
    <PlumbingEntryPage
      entry={getPlumbingEntrypoint("local", { zip })}
      searchParams={(await searchParams) ?? {}}
    />
  );
}

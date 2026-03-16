import Link from "next/link";

type OperatorPaginationProps = {
  page: number;
  pageCount: number;
  basePath: string;
  query?: string;
  includeSystemTraffic?: boolean;
  extraParams?: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  page: number,
  query?: string,
  includeSystemTraffic?: boolean,
  extraParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (query) {
    params.set("query", query);
  }
  if (includeSystemTraffic) {
    params.set("include", "system");
  }
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function OperatorPagination({
  page,
  pageCount,
  basePath,
  query,
  includeSystemTraffic = false,
  extraParams,
}: OperatorPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="panel" aria-label="Queue pagination">
      <p className="eyebrow">Queue pages</p>
      <div className="cta-row">
        {page > 1 ? (
          <Link className="secondary" href={buildHref(basePath, page - 1, query, includeSystemTraffic, extraParams)}>
            Previous page
          </Link>
        ) : null}
        <span className="portal-chip">Page {page} of {pageCount}</span>
        {page < pageCount ? (
          <Link className="secondary" href={buildHref(basePath, page + 1, query, includeSystemTraffic, extraParams)}>
            Next page
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

type OperatorQueueFiltersProps = {
  query?: string;
  includeSystemTraffic?: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  extraParams?: Record<string, string | undefined>;
};

export function OperatorQueueFilters({
  query = "",
  includeSystemTraffic = false,
  searchLabel,
  searchPlaceholder,
  extraParams,
}: OperatorQueueFiltersProps) {
  return (
    <form method="GET" className="panel">
      <p className="eyebrow">Find the next item fast</p>
      {Object.entries(extraParams ?? {}).map(([key, value]) => (
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      ))}
      <div className="form-grid">
        <label>
          {searchLabel}
          <input
            type="search"
            name="query"
            defaultValue={query}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="include"
            value="system"
            defaultChecked={includeSystemTraffic}
          />
          Include system verification traffic
        </label>
      </div>
      <div className="cta-row">
        <button type="submit" className="primary">Apply filters</button>
      </div>
    </form>
  );
}

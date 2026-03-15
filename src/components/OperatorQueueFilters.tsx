type OperatorQueueFiltersProps = {
  query?: string;
  includeSystemTraffic?: boolean;
  searchLabel: string;
  searchPlaceholder: string;
};

export function OperatorQueueFilters({
  query = "",
  includeSystemTraffic = false,
  searchLabel,
  searchPlaceholder,
}: OperatorQueueFiltersProps) {
  return (
    <form method="GET" className="panel">
      <p className="eyebrow">Find the next item fast</p>
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

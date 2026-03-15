"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type Provider = OperationalRuntimeConfig["dispatch"]["providers"][number];

type Props = {
  provider: Provider;
};

function toText(value: string[] | undefined) {
  return (value ?? []).join(", ");
}

function normalizeList(value: string) {
  return [...new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export function ProviderPortalProfileForm({ provider }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState(provider.phone ?? "");
  const [acceptingNewJobs, setAcceptingNewJobs] = useState(provider.acceptingNewJobs);
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(
    provider.maxConcurrentJobs == null ? "" : String(provider.maxConcurrentJobs),
  );
  const [activeJobs, setActiveJobs] = useState(provider.activeJobs == null ? "" : String(provider.activeJobs));
  const [propertyTypes, setPropertyTypes] = useState(toText(provider.propertyTypes));
  const [issueTypes, setIssueTypes] = useState(toText(provider.issueTypes));
  const [states, setStates] = useState(toText(provider.states));
  const [counties, setCounties] = useState(toText(provider.counties));
  const [cities, setCities] = useState(toText(provider.cities));
  const [zipPrefixes, setZipPrefixes] = useState(toText(provider.zipPrefixes));
  const [emergencyCoverageWindow, setEmergencyCoverageWindow] = useState(provider.emergencyCoverageWindow ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/provider-portal/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          acceptingNewJobs,
          maxConcurrentJobs: maxConcurrentJobs.trim() ? Number(maxConcurrentJobs) : undefined,
          activeJobs: activeJobs.trim() ? Number(activeJobs) : undefined,
          propertyTypes: normalizeList(propertyTypes),
          issueTypes: normalizeList(issueTypes),
          states: normalizeList(states),
          counties: normalizeList(counties),
          cities: normalizeList(cities),
          zipPrefixes: normalizeList(zipPrefixes),
          emergencyCoverageWindow: emergencyCoverageWindow.trim() || undefined,
        }),
      });

      if (!response.ok) {
        setError("Provider profile could not be saved.");
        return;
      }

      setStatus("Provider coverage and capacity were updated.");
    });
  }

  return (
    <form className="panel auth-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Provider profile</p>
        <h2>Coverage and capacity</h2>
        <p className="muted">
          Keep this current so LeadOS can route the right ZIPs, issue types, and urgency bands to your team.
        </p>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}
      {status ? <p className="status-banner success">{status}</p> : null}

      <div className="form-grid">
        <label>
          Contact email
          <input value={provider.contactEmail ?? ""} disabled readOnly />
        </label>
        <label>
          Contact phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="5551234567" />
        </label>
        <label>
          Max concurrent jobs
          <input value={maxConcurrentJobs} onChange={(event) => setMaxConcurrentJobs(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Active jobs
          <input value={activeJobs} onChange={(event) => setActiveJobs(event.target.value)} inputMode="numeric" />
        </label>
        <label className="span-two">
          Emergency coverage window
          <input
            value={emergencyCoverageWindow}
            onChange={(event) => setEmergencyCoverageWindow(event.target.value)}
            placeholder="24/7 or Mon-Sun 6pm-6am"
          />
        </label>
        <label>
          States
          <input value={states} onChange={(event) => setStates(event.target.value)} placeholder="texas, oklahoma" />
        </label>
        <label>
          Counties
          <input value={counties} onChange={(event) => setCounties(event.target.value)} placeholder="dallas county" />
        </label>
        <label>
          Cities
          <input value={cities} onChange={(event) => setCities(event.target.value)} placeholder="dallas, plano" />
        </label>
        <label>
          ZIP prefixes
          <input value={zipPrefixes} onChange={(event) => setZipPrefixes(event.target.value)} placeholder="752, 750" />
        </label>
        <label>
          Property types
          <input value={propertyTypes} onChange={(event) => setPropertyTypes(event.target.value)} placeholder="residential, commercial" />
        </label>
        <label>
          Issue types
          <input value={issueTypes} onChange={(event) => setIssueTypes(event.target.value)} placeholder="burst-pipe, leak, drain-clog" />
        </label>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={acceptingNewJobs}
          onChange={(event) => setAcceptingNewJobs(event.target.checked)}
        />
        Accepting new jobs right now
      </label>

      <div className="cta-row">
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? "Saving..." : "Save provider profile"}
        </button>
      </div>
    </form>
  );
}

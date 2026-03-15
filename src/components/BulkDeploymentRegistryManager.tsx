"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  defaultCity: string;
};

export function BulkDeploymentRegistryManager({ defaultCity }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState("zip-seo-page-urgent-widget");
  const [city, setCity] = useState(defaultCity);
  const [zips, setZips] = useState("19103,19104,19107");
  const [domainTemplate, setDomainTemplate] = useState("www.clientsite.com");
  const [pathTemplate, setPathTemplate] = useState("/plumbing/{zip}");
  const [installType, setInstallType] = useState("wordpress-plugin");
  const [deploymentStatus, setDeploymentStatus] = useState("generated");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    const zipList = zips.split(",").map((zip) => zip.trim()).filter(Boolean);
    if (zipList.length === 0) {
      setError("Enter at least one ZIP code.");
      return;
    }

    startTransition(async () => {
      const deployments = zipList.map((zip) => {
        const pagePath = pathTemplate.replaceAll("{zip}", zip).replaceAll("{city}", city.toLowerCase().replace(/\s+/g, "-"));
        const pageUrl = domainTemplate ? `https://${domainTemplate}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}` : undefined;
        return {
          recipe,
          niche: "plumbing",
          city,
          zip,
          domain: domainTemplate || undefined,
          pageUrl,
          installType,
          status: deploymentStatus,
          notes: notes || undefined,
          tags: ["bulk-rollout", recipe, city.toLowerCase()],
        };
      });

      const response = await fetch("/api/deployments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deployments }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success !== true) {
        setError(body.error ?? "Could not register bulk rollout.");
        return;
      }
      setStatus(`Registered ${body.count} deployments`);
    });
  }

  return (
    <form className="panel stack-grid" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Bulk rollout</p>
        <h2>Register a ZIP-cell cohort in one action</h2>
        <p className="muted">
          Use this to seed metro launches, local SEO waves, or provider-site rollout batches without creating every deployment one by one.
        </p>
      </div>
      <div className="portal-form-grid">
        <label>
          <span>Recipe</span>
          <select value={recipe} onChange={(event) => setRecipe(event.target.value)}>
            <option value="zip-seo-page-urgent-widget">ZIP SEO page urgent widget</option>
            <option value="estimate-page-widget">Estimate page widget</option>
            <option value="provider-homepage-emergency-widget">Provider homepage emergency widget</option>
          </select>
        </label>
        <label>
          <span>City</span>
          <input value={city} onChange={(event) => setCity(event.target.value)} />
        </label>
        <label>
          <span>ZIP list</span>
          <input value={zips} onChange={(event) => setZips(event.target.value)} />
        </label>
        <label>
          <span>Domain</span>
          <input value={domainTemplate} onChange={(event) => setDomainTemplate(event.target.value)} />
        </label>
        <label>
          <span>Path template</span>
          <input value={pathTemplate} onChange={(event) => setPathTemplate(event.target.value)} />
        </label>
        <label>
          <span>Install type</span>
          <select value={installType} onChange={(event) => setInstallType(event.target.value)}>
            <option value="wordpress-plugin">WordPress plugin</option>
            <option value="widget">Widget</option>
            <option value="iframe">Iframe</option>
            <option value="hosted-link">Hosted link</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={deploymentStatus} onChange={(event) => setDeploymentStatus(event.target.value)}>
            <option value="planned">Planned</option>
            <option value="generated">Generated</option>
            <option value="live">Live</option>
          </select>
        </label>
      </div>
      <label>
        <span>Rollout notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Metro wave, owner, campaign source, or QA note." />
      </label>
      {error ? <p className="portal-error">{error}</p> : null}
      {status ? <p className="portal-success">{status}</p> : null}
      <div className="cta-row">
        <button className="primary" type="submit" disabled={isPending}>
          {isPending ? "Registering..." : "Register ZIP cohort"}
        </button>
      </div>
    </form>
  );
}

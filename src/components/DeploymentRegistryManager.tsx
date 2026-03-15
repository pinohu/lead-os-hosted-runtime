"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  defaultRecipe: string;
  defaultCity: string;
};

export function DeploymentRegistryManager({ defaultRecipe, defaultCity }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(defaultRecipe);
  const [city, setCity] = useState(defaultCity);
  const [zip, setZip] = useState("");
  const [domain, setDomain] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [installType, setInstallType] = useState("widget");
  const [deploymentStatus, setDeploymentStatus] = useState("generated");
  const [providerLabel, setProviderLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe,
          niche: "plumbing",
          city: city || undefined,
          zip: zip || undefined,
          domain: domain || undefined,
          pageUrl: pageUrl || undefined,
          installType,
          status: deploymentStatus,
          providerLabel: providerLabel || undefined,
          notes: notes || undefined,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success !== true) {
        setError(body.error ?? "Could not register deployment.");
        return;
      }
      setStatus(`Registered deployment ${body.record?.id ?? ""}`.trim());
    });
  }

  return (
    <form className="panel stack-grid" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Register deployment</p>
        <h2>Add a generated deployment to the rollout registry</h2>
        <p className="muted">
          Track where a recipe is installed, which ZIP or provider it serves, and whether it is merely generated or actually live.
        </p>
      </div>
      <div className="portal-form-grid">
        <label>
          <span>Recipe</span>
          <select value={recipe} onChange={(event) => setRecipe(event.target.value)}>
            <option value="provider-homepage-emergency-widget">Provider homepage emergency widget</option>
            <option value="zip-seo-page-urgent-widget">ZIP SEO page urgent widget</option>
            <option value="estimate-page-widget">Estimate page widget</option>
            <option value="commercial-service-page-widget">Commercial service page widget</option>
            <option value="provider-recruitment-widget">Provider recruitment widget</option>
          </select>
        </label>
        <label>
          <span>City</span>
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Philadelphia" />
        </label>
        <label>
          <span>ZIP</span>
          <input value={zip} onChange={(event) => setZip(event.target.value)} placeholder="19103" />
        </label>
        <label>
          <span>Domain</span>
          <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="www.clientsite.com" />
        </label>
        <label>
          <span>Page URL</span>
          <input value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} placeholder="https://www.clientsite.com/emergency-plumber" />
        </label>
        <label>
          <span>Install type</span>
          <select value={installType} onChange={(event) => setInstallType(event.target.value)}>
            <option value="widget">Widget</option>
            <option value="iframe">Iframe</option>
            <option value="wordpress-plugin">WordPress plugin</option>
            <option value="hosted-link">Hosted link</option>
          </select>
        </label>
        <label>
          <span>Deployment status</span>
          <select value={deploymentStatus} onChange={(event) => setDeploymentStatus(event.target.value)}>
            <option value="planned">Planned</option>
            <option value="generated">Generated</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
            <option value="retired">Retired</option>
          </select>
        </label>
        <label>
          <span>Provider label</span>
          <input value={providerLabel} onChange={(event) => setProviderLabel(event.target.value)} placeholder="Dallas Emergency Crew" />
        </label>
        <label>
          <span>Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="metro-launch, wordpress, paid-search" />
        </label>
      </div>
      <label>
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Context, owner handoff notes, or rollout status." />
      </label>
      {error ? <p className="portal-error">{error}</p> : null}
      {status ? <p className="portal-success">{status}</p> : null}
      <div className="cta-row">
        <button className="primary" type="submit" disabled={isPending}>
          {isPending ? "Registering..." : "Register deployment"}
        </button>
      </div>
    </form>
  );
}

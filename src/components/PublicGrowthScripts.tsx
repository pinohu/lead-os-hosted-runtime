import Script from "next/script";
import { buildPublicGrowthBootConfig } from "@/lib/growth-integrations";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";
import type { FunnelFamily, MarketplaceAudience } from "@/lib/runtime-schema";

type Props = {
  runtimeConfig: OperationalRuntimeConfig;
  audience: MarketplaceAudience;
  pagePath: string;
  service: string;
  family: FunnelFamily;
};

export function PublicGrowthScripts({
  runtimeConfig,
  audience,
  pagePath,
  service,
  family,
}: Props) {
  const bootConfig = buildPublicGrowthBootConfig(runtimeConfig, {
    audience,
    pagePath,
    service,
    family,
  });

  return (
    <>
      <Script
        id="lead-os-growth-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.LeadOSGrowthConfig = ${JSON.stringify(bootConfig)};`,
        }}
      />
      {bootConfig.callScaler.enabled && bootConfig.callScaler.scriptUrl ? (
        <Script src={bootConfig.callScaler.scriptUrl} strategy="afterInteractive" />
      ) : null}
      {bootConfig.salespanel.enabled && bootConfig.salespanel.scriptUrl ? (
        <Script src={bootConfig.salespanel.scriptUrl} strategy="afterInteractive" />
      ) : null}
      {bootConfig.plerdy.enabled && bootConfig.plerdy.scriptUrl ? (
        <Script src={bootConfig.plerdy.scriptUrl} strategy="afterInteractive" />
      ) : null}
    </>
  );
}

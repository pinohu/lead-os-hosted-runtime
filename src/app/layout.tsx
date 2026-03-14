import type { Metadata } from "next";
import Script from "next/script";
import "@/app/globals.css";
import { tenantConfig } from "@/lib/tenant";
import { embeddedSecrets } from "@/lib/embedded-secrets";

export const metadata: Metadata = {
  title: `${tenantConfig.brandName} Hosted Runtime`,
  description: "Hosted lead capture runtime for WordPress and external sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const partneroProgramId = process.env.PARTNERO_PROGRAM_ID ?? embeddedSecrets.partnero.programId;
  const partneroAssetsHost = process.env.PARTNERO_ASSETS_HOST ?? embeddedSecrets.partnero.assetsHost;

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {partneroProgramId ? (
          <Script
            id="partnero-js"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(p,t,n,e,r,o){ p['__partnerObject']=r;function f(){var c={ a:arguments,q:[]};var r=this.push(c);return "number"!=typeof r?r:f.bind(c.q);}f.q=f.q||[];p[r]=p[r]||f.bind(f.q);p[r].q=p[r].q||f.q;o=t.createElement(n);var _=t.getElementsByTagName(n)[0];o.async=1;o.src=e+'?v'+(~~(new Date().getTime()/1e6));_.parentNode.insertBefore(o,_);})(window, document, 'script', 'https://app.partnero.com/js/universal.js', 'po');po('settings', 'assets_host', '${partneroAssetsHost}');po('program', '${partneroProgramId}', 'load');`,
            }}
          />
        ) : null}
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}

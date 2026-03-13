export type TenantConfig = {
  brandName: string;
  siteUrl: string;
  supportEmail: string;
  defaultService: string;
  defaultNiche: string;
  widgetOrigins: string[];
  accent: string;
};

function splitCsv(value?: string) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export const tenantConfig: TenantConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Lead OS Hosted",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://leads.example.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com",
  defaultService: process.env.LEAD_OS_DEFAULT_SERVICE ?? "lead-capture",
  defaultNiche: process.env.LEAD_OS_DEFAULT_NICHE ?? "general",
  widgetOrigins: splitCsv(process.env.LEAD_OS_WIDGET_ORIGINS),
  accent: process.env.NEXT_PUBLIC_BRAND_ACCENT ?? "#14b8a6",
};

export function isAllowedWidgetOrigin(origin?: string | null) {
  if (!origin) return false;
  if (tenantConfig.widgetOrigins.length === 0) return true;
  return tenantConfig.widgetOrigins.includes(origin);
}

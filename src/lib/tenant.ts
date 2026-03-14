export type TenantConfig = {
  tenantId: string;
  brandName: string;
  siteUrl: string;
  supportEmail: string;
  defaultService: string;
  defaultNiche: string;
  widgetOrigins: string[];
  accent: string;
  enabledFunnels: string[];
  channels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    chat: boolean;
    voice: boolean;
  };
};

function splitCsv(value?: string) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export const tenantConfig: TenantConfig = {
  tenantId: process.env.LEAD_OS_TENANT_ID ?? "default-tenant",
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Lead OS Hosted",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://leads.example.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com",
  defaultService: process.env.LEAD_OS_DEFAULT_SERVICE ?? "lead-capture",
  defaultNiche: process.env.LEAD_OS_DEFAULT_NICHE ?? "general",
  widgetOrigins: splitCsv(process.env.LEAD_OS_WIDGET_ORIGINS),
  accent: process.env.NEXT_PUBLIC_BRAND_ACCENT ?? "#14b8a6",
  enabledFunnels: splitCsv(process.env.LEAD_OS_ENABLED_FUNNELS).length > 0
    ? splitCsv(process.env.LEAD_OS_ENABLED_FUNNELS)
    : ["lead-magnet", "qualification", "chat", "webinar", "authority", "checkout", "retention", "rescue", "referral", "continuity"],
  channels: {
    email: true,
    whatsapp: process.env.WBIZTOOL_API_KEY != null,
    sms: process.env.EASY_TEXT_MARKETING_API_KEY != null,
    chat: true,
    voice: process.env.THOUGHTLY_API_KEY != null,
  },
};

export function isAllowedWidgetOrigin(origin?: string | null) {
  if (!origin) return false;
  if (tenantConfig.widgetOrigins.length === 0) return true;
  return tenantConfig.widgetOrigins.includes(origin);
}

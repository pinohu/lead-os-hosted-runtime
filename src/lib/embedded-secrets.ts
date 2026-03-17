const EMPTY_EMBEDDED_SECRETS = {
  suitedash: {
    publicId: "",
    secretKey: "",
  },
  callscaler: {
    apiKey: "",
  },
  salespanel: {
    apiKey: "",
  },
  plerdy: {
    apiKey: "",
  },
  emailit: {
    apiKey: "",
  },
  aitable: {
    apiToken: "",
    datasheetId: "",
  },
  wbiztool: {
    apiKey: "",
    instanceId: "",
  },
  easyTextMarketing: {
    apiKey: "",
  },
  smsit: {
    apiKey: "",
    baseUrl: "",
  },
  electroneek: {
    apiKey: "",
  },
  discord: {
    highValueWebhook: "",
  },
  telegram: {
    botToken: "",
    highValueChat: "",
  },
  cron: {
    secret: "",
  },
  upviral: {
    apiKey: "",
  },
  insighto: {
    apiKey: "",
  },
  thoughtly: {
    apiKey: "",
  },
  thrivecart: {
    apiKey: "",
  },
  partnero: {
    programId: "",
    assetsHost: "",
  },
  trafft: {
    apiUrl: "",
    clientId: "",
    clientSecret: "",
  },
  documentero: {
    apiKey: "",
  },
  crove: {
    apiKey: "",
    baseUrl: "",
  },
  agenticflow: {
    apiKey: "",
  },
  n8n: {
    apiBaseUrl: "",
    apiKey: "",
    mcpUrl: "",
    mcpAccessToken: "",
  },
  boost: {
    apiKey: "",
    makeApiToken: "",
  },
  straico: {
    apiKey: "",
  },
} as const;

export function areEmbeddedSecretsEnabled() {
  return false;
}

export const embeddedSecrets = EMPTY_EMBEDDED_SECRETS;

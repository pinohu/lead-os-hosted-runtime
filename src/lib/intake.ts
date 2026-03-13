export type HostedLeadPayload = {
  source: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  niche?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

const intakeStore = new Map<string, HostedLeadPayload>();

function emailKey(email?: string, phone?: string) {
  if (email) return `email:${email.trim().toLowerCase()}`;
  if (phone) return `phone:${phone.replace(/\D+/g, "")}`;
  return undefined;
}

export function validateLeadPayload(payload: HostedLeadPayload) {
  if (!payload.source) throw new Error("Lead source is required.");
  if (!payload.email && !payload.phone) throw new Error("Email or phone is required.");
  return true;
}

export function persistLead(payload: HostedLeadPayload) {
  validateLeadPayload(payload);
  const key = emailKey(payload.email, payload.phone);
  if (!key) throw new Error("Lead identity could not be determined.");

  intakeStore.set(key, {
    ...payload,
    email: payload.email?.trim().toLowerCase(),
  });

  return {
    success: true,
    leadKey: key,
    existing: false,
  };
}

export function listStoredLeads() {
  return Array.from(intakeStore.entries()).map(([leadKey, payload]) => ({
    leadKey,
    payload,
  }));
}

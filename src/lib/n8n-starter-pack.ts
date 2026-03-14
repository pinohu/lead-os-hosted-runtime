import { createHash } from "node:crypto";
import { embeddedSecrets } from "./embedded-secrets.ts";

type N8nConnectionTarget = {
  node: string;
  type: string;
  index: number;
};

export type N8nNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  webhookId?: string;
};

export type N8nWorkflow = {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnectionTarget[][]>>;
  settings: {
    executionOrder: "v1";
  };
  pinData: Record<string, unknown>;
  meta: {
    templateCredsSetupCompleted: boolean;
  };
  tags: Array<{ name: string }>;
};

export type N8nStarterWorkflow = {
  slug: string;
  name: string;
  summary: string;
  family: string;
  sources: string[];
  repos: string[];
  workflow: N8nWorkflow;
};

function stickyNote(id: string, name: string, content: string, position: [number, number]): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.stickyNote",
    typeVersion: 1,
    position,
    parameters: {
      content,
      width: 760,
      height: 360,
      color: 5,
    },
  };
}

function webhookNode(id: string, name: string, path: string, position: [number, number]): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position,
    webhookId: path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""),
    parameters: {
      httpMethod: "POST",
      path,
      responseMode: "onReceived",
    },
  };
}

function respondNode(id: string, name: string, position: [number, number]): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1,
    position,
    parameters: {
      respondWith: "json",
      responseBody: "={{ { success: true, workflow: $workflow.name, leadKey: $json.leadKey ?? null } }}",
    },
  };
}

function setNode(id: string, name: string, fields: Array<{ name: string; value: string }>, position: [number, number]): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position,
    parameters: {
      mode: "manual",
      duplicateItem: false,
      includeOtherFields: true,
      assignments: {
        assignments: fields.map((field, index) => ({
          id: `${id}-${index}`,
          name: field.name,
          value: field.value,
          type: "string",
        })),
      },
    },
  };
}

function waitNode(id: string, name: string, amount: number, unit: "hours" | "days", position: [number, number]): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    position,
    parameters: {
      amount,
      unit,
    },
  };
}

function ifNode(
  id: string,
  name: string,
  expression: string,
  position: [number, number],
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position,
    parameters: {
      conditions: {
        string: [
          {
            value1: expression,
            operation: "isNotEmpty",
          },
        ],
      },
    },
  };
}

function httpNode(
  id: string,
  name: string,
  url: string,
  body: string,
  position: [number, number],
  options?: {
    headers?: Record<string, string>;
  },
): N8nNode {
  const headerEntries = options?.headers
    ? Object.entries(options.headers).map(([name, value]) => ({ name, value }))
    : [];

  return {
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    parameters: {
      method: "POST",
      url,
      sendBody: true,
      specifyBody: "json",
      jsonBody: body,
      sendHeaders: headerEntries.length > 0,
      specifyHeaders: headerEntries.length > 0 ? "json" : undefined,
      jsonHeaders: headerEntries.length > 0 ? JSON.stringify(options?.headers ?? {}) : undefined,
      options: {},
    },
  };
}

function connection(from: string, to: string, type = "main", index = 0): Record<string, Record<string, N8nConnectionTarget[][]>> {
  return {
    [from]: {
      [type]: [[{ node: to, type: "main", index }]],
    },
  };
}

function mergeConnections(...groups: Array<Record<string, Record<string, N8nConnectionTarget[][]>>>) {
  const merged: Record<string, Record<string, N8nConnectionTarget[][]>> = {};

  for (const group of groups) {
    for (const [nodeName, nodeConnections] of Object.entries(group)) {
      merged[nodeName] ??= {};
      for (const [connectionType, branches] of Object.entries(nodeConnections)) {
        merged[nodeName][connectionType] ??= [];
        merged[nodeName][connectionType] = [
          ...merged[nodeName][connectionType],
          ...branches,
        ];
      }
    }
  }

  return merged;
}

function baseWorkflow(name: string, nodes: N8nNode[], connections: Record<string, Record<string, N8nConnectionTarget[][]>>): N8nWorkflow {
  return {
    name,
    nodes,
    connections,
    settings: { executionOrder: "v1" },
    pinData: {},
    meta: { templateCredsSetupCompleted: false },
    tags: [{ name: "LeadOS" }, { name: "n8n Starter" }],
  };
}

export const N8N_STARTER_WORKFLOWS: N8nStarterWorkflow[] = [
  {
    slug: "lead-intake-fanout",
    name: "LeadOS Lead Intake Fan-Out",
    summary: "Receives lead.captured events from LeadOS and fans them out to CRM, ledger, alerts, and nurture hooks.",
    family: "lead-magnet",
    sources: [
      "Webhook-driven lead ingestion",
      "CRM and spreadsheet fan-out patterns",
      "Operational alerting",
    ],
    repos: [
      "Zie619/n8n-workflows",
      "wassupjay/n8n-free-templates",
    ],
    workflow: baseWorkflow(
      "LeadOS Lead Intake Fan-Out",
      [
        stickyNote("note-intake", "Overview", "Inspired by the larger n8n workflow libraries, this LeadOS-specific starter receives canonical lead events and sends them to CRM, ledger, and alerts with a single webhook entrypoint.", [-760, -260]),
        webhookNode("webhook-intake", "LeadOS Intake Webhook", "leados/lead-captured", [-520, 0]),
        setNode("set-normalize", "Normalize Lead Event", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
          { name: "score", value: "={{ String($json.payload?.score ?? $json.score ?? '') }}" },
          { name: "family", value: "={{ $json.payload?.family ?? $json.family ?? 'lead-magnet' }}" },
        ], [-260, 0]),
        httpNode("crm-sync", "SuiteDash Sync Hook", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', email: $json.email, phone: $json.phone, leadKey: $json.leadKey, score: Number($json.score || 0), metadata: { origin: 'n8n-fanout' } } }}", [20, -140]),
        httpNode("ledger-log", "AITable Ledger Hook", "https://leados.yourdeputy.com/api/automations/smoke", "={{ { dryRun: false, source: 'lead-intake-fanout', leadKey: $json.leadKey } }}", [20, 20]),
        ifNode("if-hot", "Hot Lead?", "={{ Number($json.score || 0) >= 80 ? 'hot' : '' }}", [20, 180]),
        httpNode("ops-alert", "Ops Alert Hook", "https://leados.yourdeputy.com/api/decision", "={{ { source: 'manual', service: 'lead-capture', niche: 'general', hasEmail: !!$json.email, hasPhone: !!$json.phone, score: Number($json.score || 0), wantsBooking: true } }}", [280, 180]),
      ],
      mergeConnections(
        connection("LeadOS Intake Webhook", "Normalize Lead Event"),
        connection("Normalize Lead Event", "SuiteDash Sync Hook"),
        connection("Normalize Lead Event", "AITable Ledger Hook"),
        connection("Normalize Lead Event", "Hot Lead?"),
        {
          "Hot Lead?": {
            main: [
              [{ node: "Ops Alert Hook", type: "main", index: 0 }],
              [],
            ],
          },
        },
      ),
    ),
  },
  {
    slug: "hot-lead-booking-rescue",
    name: "LeadOS Hot Lead Booking Rescue",
    summary: "Escalates high-intent leads into booking and recovery messaging when they do not schedule immediately.",
    family: "qualification",
    sources: [
      "Appointment reminder patterns",
      "Booking recovery sequences",
      "Lead qualification flows",
    ],
    repos: [
      "wassupjay/n8n-free-templates",
      "Zie619/n8n-workflows",
    ],
    workflow: baseWorkflow(
      "LeadOS Hot Lead Booking Rescue",
      [
        stickyNote("note-booking", "Overview", "Built from booking and WhatsApp notification ideas, this starter captures hot lead events, prompts immediate booking, then runs timed recovery steps.", [-760, -240]),
        webhookNode("webhook-booking", "Hot Lead Webhook", "leados/hot-lead", [-520, 0]),
        setNode("set-booking", "Prepare Booking Payload", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "bookingUrl", value: "={{ $json.payload?.bookingUrl ?? 'https://leados.yourdeputy.com/funnel/qualification' }}" },
        ], [-260, 0]),
        httpNode("send-booking", "Send Booking Prompt", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, wantsBooking: true, metadata: { origin: 'n8n-hot-lead-booking' } } }}", [20, -120]),
        waitNode("wait-booking", "Wait 2 Hours", 2, "hours", [20, 40]),
        httpNode("followup-booking", "Booking Recovery Follow-Up", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, returning: true, wantsBooking: true, metadata: { origin: 'n8n-booking-recovery' } } }}", [280, 40]),
      ],
      mergeConnections(
        connection("Hot Lead Webhook", "Prepare Booking Payload"),
        connection("Prepare Booking Payload", "Send Booking Prompt"),
        connection("Prepare Booking Payload", "Wait 2 Hours"),
        connection("Wait 2 Hours", "Booking Recovery Follow-Up"),
      ),
    ),
  },
  {
    slug: "checkout-recovery-ladder",
    name: "LeadOS Checkout Recovery Ladder",
    summary: "Runs a timed 1h / 24h / 48h recovery sequence for checkout_started events.",
    family: "checkout",
    sources: [
      "Abandoned cart templates",
      "Email follow-up ladders",
      "Timed recovery workflows",
    ],
    repos: [
      "wassupjay/n8n-free-templates",
      "Zie619/n8n-workflows",
    ],
    workflow: baseWorkflow(
      "LeadOS Checkout Recovery Ladder",
      [
        stickyNote("note-checkout", "Overview", "Condenses the abandoned cart patterns from the template libraries into a LeadOS-specific three-step recovery ladder.", [-760, -260]),
        webhookNode("webhook-checkout", "Checkout Started Webhook", "leados/checkout-started", [-520, 0]),
        setNode("set-checkout", "Prepare Recovery Payload", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
          { name: "checkoutUrl", value: "={{ $json.payload?.checkoutUrl ?? 'https://leados.yourdeputy.com/funnel/checkout' }}" },
        ], [-260, 0]),
        waitNode("wait-1h", "Wait 1 Hour", 1, "hours", [20, -120]),
        httpNode("recover-1h", "Recovery Touch 1", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'checkout', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, wantsCheckout: true, metadata: { recoveryStage: '1h' } } }}", [280, -120]),
        waitNode("wait-24h", "Wait 1 Day", 1, "days", [20, 20]),
        httpNode("recover-24h", "Recovery Touch 2", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'checkout', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, wantsCheckout: true, metadata: { recoveryStage: '24h' } } }}", [280, 20]),
        waitNode("wait-48h", "Wait 2 Days", 2, "days", [20, 160]),
        httpNode("recover-48h", "Recovery Touch 3", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'checkout', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, wantsCheckout: true, metadata: { recoveryStage: '48h' } } }}", [280, 160]),
      ],
      mergeConnections(
        connection("Checkout Started Webhook", "Prepare Recovery Payload"),
        connection("Prepare Recovery Payload", "Wait 1 Hour"),
        connection("Prepare Recovery Payload", "Wait 1 Day"),
        connection("Prepare Recovery Payload", "Wait 2 Days"),
        connection("Wait 1 Hour", "Recovery Touch 1"),
        connection("Wait 1 Day", "Recovery Touch 2"),
        connection("Wait 2 Days", "Recovery Touch 3"),
      ),
    ),
  },
  {
    slug: "referral-activation-loop",
    name: "LeadOS Referral Activation Loop",
    summary: "Starts referral and review asks after a successful activation milestone.",
    family: "referral",
    sources: [
      "Referral automation patterns",
      "Post-conversion expansion loops",
      "Partner and viral follow-up",
    ],
    repos: [
      "Zie619/n8n-workflows",
      "growchief/growchief",
    ],
    workflow: baseWorkflow(
      "LeadOS Referral Activation Loop",
      [
        stickyNote("note-referral", "Overview", "Applies the referral-loop ideas from the workflow collections and outreach tooling: trigger after activation, then hand off to referral and review flows.", [-760, -220]),
        webhookNode("webhook-referral", "Activation Webhook", "leados/customer-activated", [-520, 0]),
        setNode("set-referral", "Prepare Referral Payload", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
        ], [-260, 0]),
        waitNode("wait-referral", "Wait 7 Days", 7, "days", [20, -80]),
        httpNode("start-referral", "Start Referral Flow", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, metadata: { origin: 'n8n-referral-loop', goal: 'referral' } } }}", [280, -80]),
        waitNode("wait-review", "Wait 10 Days", 10, "days", [20, 80]),
        httpNode("request-review", "Request Review", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, metadata: { origin: 'n8n-referral-loop', goal: 'review' } } }}", [280, 80]),
      ],
      mergeConnections(
        connection("Activation Webhook", "Prepare Referral Payload"),
        connection("Prepare Referral Payload", "Wait 7 Days"),
        connection("Prepare Referral Payload", "Wait 10 Days"),
        connection("Wait 7 Days", "Start Referral Flow"),
        connection("Wait 10 Days", "Request Review"),
      ),
    ),
  },
  {
    slug: "milestone-second-touch",
    name: "LeadOS Milestone Second Touch",
    summary: "Responds to milestone two by creating a deliberate second trust event before the main ask.",
    family: "authority",
    sources: [
      "Second-touch nurture patterns",
      "Return-visit trust building",
      "Milestone-driven escalation",
    ],
    repos: [
      "Zie619/n8n-workflows",
      "wassupjay/n8n-free-templates",
    ],
    workflow: baseWorkflow(
      "LeadOS Milestone Second Touch",
      [
        stickyNote("note-m2", "Overview", "This workflow is designed for the restaurant principle translated into LeadOS: once a lead returns and engages again, create a specific second trust event instead of jumping straight to a hard close.", [-760, -220]),
        webhookNode("webhook-m2", "Lead Milestone 2 Webhook", "leados/lead-milestone-2", [-520, 0]),
        setNode("set-m2", "Prepare Milestone 2 Payload", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
          { name: "family", value: "={{ $json.payload?.family ?? $json.family ?? 'authority' }}" },
        ], [-260, 0]),
        httpNode("trigger-second-touch", "Trigger Second-Touch Offer", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, returning: true, contentEngaged: true, metadata: { origin: 'n8n-milestone-2', milestone: 'lead-m2-return-engaged' } } }}", [20, 0]),
        respondNode("respond-m2", "Respond", [280, 0]),
      ],
      mergeConnections(
        connection("Lead Milestone 2 Webhook", "Prepare Milestone 2 Payload"),
        connection("Prepare Milestone 2 Payload", "Trigger Second-Touch Offer"),
        connection("Trigger Second-Touch Offer", "Respond"),
      ),
    ),
  },
  {
    slug: "milestone-third-touch-conversion",
    name: "LeadOS Milestone Third Touch Conversion",
    summary: "Uses milestone three to push booking, proposals, documents, and referrals at the point habit and trust are strongest.",
    family: "retention",
    sources: [
      "Third-touch conversion patterns",
      "Activation and referral loops",
      "Proposal and onboarding triggers",
    ],
    repos: [
      "growchief/growchief",
      "Zie619/n8n-workflows",
    ],
    workflow: baseWorkflow(
      "LeadOS Milestone Third Touch Conversion",
      [
        stickyNote("note-m3", "Overview", "Milestone three is where LeadOS should stop treating the interaction as tentative. This workflow escalates into booking, docs, onboarding, and referral actions.", [-760, -260]),
        webhookNode("webhook-m3", "Lead Milestone 3 Webhook", "leados/lead-milestone-3", [-520, -80]),
        webhookNode("webhook-c3", "Customer Milestone 3 Webhook", "leados/customer-milestone-3", [-520, 120]),
        setNode("set-m3", "Prepare Conversion Payload", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          { name: "email", value: "={{ $json.payload?.email ?? $json.email ?? '' }}" },
          { name: "phone", value: "={{ $json.payload?.phone ?? $json.phone ?? '' }}" },
          { name: "family", value: "={{ $json.payload?.family ?? $json.family ?? 'qualification' }}" },
        ], [-240, 20]),
        httpNode("trigger-offer", "Trigger Conversion Action", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, wantsBooking: true, metadata: { origin: 'n8n-milestone-3', milestone: 'third-touch' } } }}", [20, -60]),
        httpNode("trigger-referral", "Trigger Referral/Value Loop", "https://leados.yourdeputy.com/api/intake", "={{ { source: 'manual', leadKey: $json.leadKey, email: $json.email, phone: $json.phone, metadata: { origin: 'n8n-milestone-3', activationMilestone: true, valueRealized: true, referralReady: true } } }}", [20, 120]),
        respondNode("respond-m3", "Respond", [280, 20]),
      ],
      mergeConnections(
        connection("Lead Milestone 3 Webhook", "Prepare Conversion Payload"),
        connection("Customer Milestone 3 Webhook", "Prepare Conversion Payload"),
        connection("Prepare Conversion Payload", "Trigger Conversion Action"),
        connection("Prepare Conversion Payload", "Trigger Referral/Value Loop"),
        connection("Trigger Conversion Action", "Respond"),
      ),
    ),
  },
  {
    slug: "ai-lead-qualifier-rag",
    name: "LeadOS AI Lead Qualifier",
    summary: "Uses AI-agent patterns to classify inbound leads before routing them to the right funnel family.",
    family: "chat",
    sources: [
      "AI starter kit agent flow",
      "AI lead qualifier templates",
      "MCP-assisted workflow validation",
    ],
    repos: [
      "n8n-io/self-hosted-ai-starter-kit",
      "wassupjay/n8n-free-templates",
      "czlonkowski/n8n-mcp",
    ],
    workflow: baseWorkflow(
      "LeadOS AI Lead Qualifier",
      [
        stickyNote("note-ai", "Overview", "This starter pulls the strongest idea from the AI-focused repos: use an agent to normalize inbound lead context, then hand back a routing recommendation to LeadOS.", [-760, -240]),
        webhookNode("webhook-ai", "Lead Qualifier Webhook", "leados/ai-qualifier", [-520, 0]),
        setNode("set-ai", "Shape Qualification Prompt", [
          { name: "leadKey", value: "={{ $json.payload?.leadKey ?? $json.leadKey ?? '' }}" },
          {
            name: "prompt",
            value:
              "={{ `Classify this lead for LeadOS routing. Reply with exactly one funnel family slug from this set: lead-magnet, qualification, chat, webinar, authority, checkout, retention, rescue, referral, continuity. Lead context: ${JSON.stringify($json.payload ?? $json)}` }}",
          },
        ], [-260, 0]),
        httpNode(
          "call-straico",
          "Call Straico",
          "https://api.straico.com/v0/chat/completions",
          "={{ JSON.stringify({ model: 'anthropic/claude-3.7-sonnet', messages: [{ role: 'user', content: $json.prompt ?? 'qualification' }] }) }}",
          [20, -80],
          {
            headers: {
              Authorization: `Bearer ${embeddedSecrets.straico.apiKey}`,
              "Content-Type": "application/json",
            },
          },
        ),
        setNode("set-route", "Extract Route Suggestion", [
          { name: "leadKey", value: "={{ $('Shape Qualification Prompt').item.json.leadKey }}" },
          { name: "routeSuggestion", value: "={{ $json.choices?.[0]?.message?.content?.trim?.() ?? 'qualification' }}" },
        ], [280, -80]),
        httpNode(
          "post-route",
          "Post Back to LeadOS",
          "https://leados.yourdeputy.com/api/decision",
          "={{ { source: 'manual', service: 'lead-capture', niche: 'general', preferredFamily: $json.routeSuggestion, metadata: { routeSuggestion: $json.routeSuggestion, leadKey: $json.leadKey } } }}",
          [540, -80],
        ),
      ],
      mergeConnections(
        connection("Lead Qualifier Webhook", "Shape Qualification Prompt"),
        connection("Shape Qualification Prompt", "Call Straico"),
        connection("Call Straico", "Extract Route Suggestion"),
        connection("Extract Route Suggestion", "Post Back to LeadOS"),
      ),
    ),
  },
];

export function getN8nStarterWorkflow(slug: string) {
  return N8N_STARTER_WORKFLOWS.find((workflow) => workflow.slug === slug);
}

export function resolveN8nStarterWorkflows(slugs?: string[]) {
  if (!slugs || slugs.length === 0) {
    return N8N_STARTER_WORKFLOWS;
  }

  const requested = new Set(slugs);
  return N8N_STARTER_WORKFLOWS.filter((workflow) => requested.has(workflow.slug));
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function getN8nStarterWorkflowHash(slug: string) {
  const starter = getN8nStarterWorkflow(slug);
  if (!starter) {
    return undefined;
  }

  return hashValue({
    slug: starter.slug,
    name: starter.name,
    family: starter.family,
    workflow: starter.workflow,
  });
}

export function getN8nStarterManifestVersion() {
  return hashValue(
    N8N_STARTER_WORKFLOWS.map((starter) => ({
      slug: starter.slug,
      name: starter.name,
      family: starter.family,
      workflow: starter.workflow,
    })),
  );
}

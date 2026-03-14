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
    parameters: {
      httpMethod: "POST",
      path,
      responseMode: "responseNode",
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
      keepOnlySet: false,
      values: {
        string: fields,
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

function httpNode(id: string, name: string, url: string, body: string, position: [number, number]): N8nNode {
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
  return Object.assign({}, ...groups);
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
        respondNode("respond-intake", "Webhook Response", [280, 20]),
      ],
      mergeConnections(
        connection("LeadOS Intake Webhook", "Normalize Lead Event"),
        connection("Normalize Lead Event", "SuiteDash Sync Hook"),
        connection("Normalize Lead Event", "AITable Ledger Hook"),
        connection("Normalize Lead Event", "Hot Lead?"),
        connection("AITable Ledger Hook", "Webhook Response"),
        {
          "Hot Lead?": {
            main: [
              [{ node: "Ops Alert Hook", type: "main", index: 0 }],
              [{ node: "Webhook Response", type: "main", index: 0 }],
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
        respondNode("respond-booking", "Webhook Response", [280, -120]),
      ],
      mergeConnections(
        connection("Hot Lead Webhook", "Prepare Booking Payload"),
        connection("Prepare Booking Payload", "Send Booking Prompt"),
        connection("Prepare Booking Payload", "Wait 2 Hours"),
        connection("Send Booking Prompt", "Webhook Response"),
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
        respondNode("respond-checkout", "Webhook Response", [280, 300]),
      ],
      mergeConnections(
        connection("Checkout Started Webhook", "Prepare Recovery Payload"),
        connection("Prepare Recovery Payload", "Wait 1 Hour"),
        connection("Prepare Recovery Payload", "Wait 1 Day"),
        connection("Prepare Recovery Payload", "Wait 2 Days"),
        connection("Wait 1 Hour", "Recovery Touch 1"),
        connection("Wait 1 Day", "Recovery Touch 2"),
        connection("Wait 2 Days", "Recovery Touch 3"),
        connection("Recovery Touch 3", "Webhook Response"),
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
        respondNode("respond-referral", "Webhook Response", [280, 220]),
      ],
      mergeConnections(
        connection("Activation Webhook", "Prepare Referral Payload"),
        connection("Prepare Referral Payload", "Wait 7 Days"),
        connection("Prepare Referral Payload", "Wait 10 Days"),
        connection("Wait 7 Days", "Start Referral Flow"),
        connection("Wait 10 Days", "Request Review"),
        connection("Request Review", "Webhook Response"),
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
          { name: "prompt", value: "={{ `Classify this lead for LeadOS routing: ${JSON.stringify($json.payload ?? $json)}` }}" },
        ], [-260, 0]),
        httpNode("call-openai", "Call LLM", "https://api.openai.com/v1/responses", "={{ { model: 'gpt-4.1-mini', input: $json.prompt } }}", [20, -80]),
        setNode("set-route", "Extract Route Suggestion", [
          { name: "leadKey", value: "={{ $('Shape Qualification Prompt').item.json.leadKey }}" },
          { name: "routeSuggestion", value: "={{ $json.output_text ?? 'qualification' }}" },
        ], [280, -80]),
        httpNode("post-route", "Post Back to LeadOS", "https://leados.yourdeputy.com/api/decision", "={{ { source: 'manual', service: 'lead-capture', niche: 'general', contentEngaged: true, score: 70, metadata: { routeSuggestion: $json.routeSuggestion, leadKey: $json.leadKey } } }}", [540, -80]),
        respondNode("respond-ai", "Webhook Response", [540, 80]),
      ],
      mergeConnections(
        connection("Lead Qualifier Webhook", "Shape Qualification Prompt"),
        connection("Shape Qualification Prompt", "Call LLM"),
        connection("Call LLM", "Extract Route Suggestion"),
        connection("Extract Route Suggestion", "Post Back to LeadOS"),
        connection("Post Back to LeadOS", "Webhook Response"),
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

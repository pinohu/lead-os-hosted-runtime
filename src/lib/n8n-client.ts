import { embeddedSecrets } from "./embedded-secrets.ts";
import { getN8nStarterWorkflow, resolveN8nStarterWorkflows, type N8nWorkflow } from "./n8n-starter-pack.ts";

type N8nWorkflowRecord = {
  id: string;
  name: string;
  active: boolean;
  nodes?: Array<{ type?: string }>;
};

type N8nWorkflowListResponse = {
  data: N8nWorkflowRecord[];
  nextCursor?: string | null;
};

type ProvisionOptions = {
  slugs?: string[];
  replaceExisting?: boolean;
  activate?: boolean;
};

type ProvisionResult = {
  slug: string;
  name: string;
  status: "created" | "replaced" | "error";
  workflowId?: string;
  active?: boolean;
  detail: string;
};

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function getN8nApiBaseUrl() {
  const envUrl = getEnvValue("N8N_BASE_URL", "N8N_API_URL", "N8N_URL");
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  return embeddedSecrets.n8n.apiBaseUrl.replace(/\/+$/, "");
}

export function getN8nApiKey() {
  return getEnvValue("N8N_API_KEY") ?? embeddedSecrets.n8n.apiKey;
}

export function canProvisionToN8n() {
  return Boolean(getN8nApiBaseUrl() && getN8nApiKey());
}

async function n8nRequest<T>(path: string, init: RequestInit = {}) {
  const baseUrl = getN8nApiBaseUrl();
  const apiKey = getN8nApiKey();

  if (!baseUrl || !apiKey) {
    throw new Error("n8n API credentials are not configured");
  }

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let body = {} as T;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      throw new Error(`Unexpected n8n response payload from ${path}`);
    }
  }

  if (!response.ok) {
    const errorMessage = typeof body === "object" && body && "message" in body
      ? String((body as { message?: string }).message ?? `n8n request failed (${response.status})`)
      : `n8n request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return body;
}

export async function listN8nWorkflows() {
  const workflows: N8nWorkflowRecord[] = [];
  let cursor: string | undefined;

  do {
    const query = cursor ? `?limit=250&cursor=${encodeURIComponent(cursor)}` : "?limit=250";
    const page = await n8nRequest<N8nWorkflowListResponse>(`/workflows${query}`, { method: "GET" });
    workflows.push(...page.data);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return workflows;
}

async function createN8nWorkflow(workflow: N8nWorkflow) {
  const createPayload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
  };

  return n8nRequest<N8nWorkflowRecord>("/workflows", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
}

async function deleteN8nWorkflow(workflowId: string) {
  return n8nRequest(`/workflows/${workflowId}`, { method: "DELETE" });
}

async function activateN8nWorkflow(workflowId: string) {
  return n8nRequest(`/workflows/${workflowId}/activate`, { method: "POST" });
}

function hasTriggerNode(workflow: N8nWorkflow) {
  return workflow.nodes.some((node) => {
    const type = node.type ?? "";
    return type.includes("webhook") || type.includes("trigger");
  });
}

async function replaceExistingWorkflowByName(name: string) {
  const existing = await listN8nWorkflows();
  const matches = existing.filter((workflow) => workflow.name === name);

  for (const workflow of matches) {
    await deleteN8nWorkflow(workflow.id);
  }

  return matches;
}

export async function provisionN8nStarterWorkflows(options: ProvisionOptions = {}) {
  const starterWorkflows = resolveN8nStarterWorkflows(options.slugs);
  const replaceExisting = options.replaceExisting ?? true;
  const activate = options.activate ?? true;
  const results: ProvisionResult[] = [];

  for (const starter of starterWorkflows) {
    try {
      let replacedCount = 0;
      if (replaceExisting) {
        const replaced = await replaceExistingWorkflowByName(starter.name);
        replacedCount = replaced.length;
      }

      const created = await createN8nWorkflow(starter.workflow);
      let active = false;

      if (activate && hasTriggerNode(starter.workflow)) {
        try {
          await activateN8nWorkflow(created.id);
          active = true;
        } catch (error) {
          results.push({
            slug: starter.slug,
            name: starter.name,
            status: replacedCount > 0 ? "replaced" : "created",
            workflowId: created.id,
            active: false,
            detail: `Created but activation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          continue;
        }
      }

      results.push({
        slug: starter.slug,
        name: starter.name,
        status: replacedCount > 0 ? "replaced" : "created",
        workflowId: created.id,
        active,
        detail: replacedCount > 0
          ? `Replaced ${replacedCount} existing workflow(s) and provisioned successfully`
          : "Provisioned successfully",
      });
    } catch (error) {
      results.push({
        slug: starter.slug,
        name: starter.name,
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown provisioning error",
      });
    }
  }

  return {
    success: results.every((result) => result.status !== "error"),
    count: results.length,
    results,
  };
}

export async function getN8nStarterWorkflowStatus() {
  const workflows = await listN8nWorkflows();

  return resolveN8nStarterWorkflows().map((starter) => {
    const matches = workflows.filter((workflow) => workflow.name === starter.name);
    return {
      slug: starter.slug,
      name: starter.name,
      provisioned: matches.length > 0,
      active: matches.some((workflow) => workflow.active),
      instances: matches.map((workflow) => ({
        id: workflow.id,
        active: workflow.active,
      })),
    };
  });
}

export function buildStarterProvisionPayload(slug: string) {
  return getN8nStarterWorkflow(slug);
}

import { DEFAULT_NURTURE_DAYS } from "./runtime-schema.ts";
import type {
  FunnelDefinition,
  FunnelEdge,
  FunnelFamily,
  FunnelNode,
  NodeType,
} from "./runtime-schema.ts";

const CANONICAL_NODE_META: Record<NodeType, Pick<FunnelNode, "channel" | "purpose">> = {
  landing_page: { channel: "web", purpose: "attract" },
  bridge_page: { channel: "web", purpose: "educate" },
  content_page: { channel: "web", purpose: "educate" },
  popup_entry: { channel: "web", purpose: "capture" },
  chat_entry: { channel: "chat", purpose: "capture" },
  voice_entry: { channel: "voice", purpose: "capture" },
  optin_form: { channel: "web", purpose: "capture" },
  multi_step_form: { channel: "web", purpose: "capture" },
  assessment_node: { channel: "web", purpose: "qualify" },
  calculator_node: { channel: "web", purpose: "qualify" },
  chat_capture: { channel: "chat", purpose: "capture" },
  checklist_capture: { channel: "web", purpose: "capture" },
  webinar_register: { channel: "web", purpose: "capture" },
  scoring_node: { channel: "internal", purpose: "qualify" },
  persona_classifier: { channel: "internal", purpose: "qualify" },
  objection_detector: { channel: "internal", purpose: "qualify" },
  channel_selector: { channel: "internal", purpose: "handoff" },
  offer_router: { channel: "internal", purpose: "handoff" },
  owner_assignment: { channel: "internal", purpose: "handoff" },
  mini_class: { channel: "web", purpose: "educate" },
  webinar_live: { channel: "web", purpose: "educate" },
  webinar_replay: { channel: "web", purpose: "educate" },
  documentary_node: { channel: "web", purpose: "educate" },
  case_study_node: { channel: "web", purpose: "persuade" },
  faq_node: { channel: "web", purpose: "persuade" },
  lead_magnet_delivery: { channel: "email", purpose: "educate" },
  booking_node: { channel: "web", purpose: "book" },
  application_node: { channel: "web", purpose: "qualify" },
  offer_page: { channel: "web", purpose: "sell" },
  checkout_node: { channel: "checkout", purpose: "sell" },
  proposal_node: { channel: "web", purpose: "sell" },
  order_bump: { channel: "checkout", purpose: "sell" },
  upsell_node: { channel: "checkout", purpose: "expand" },
  downsell_node: { channel: "checkout", purpose: "recover" },
  email_followup: { channel: "email", purpose: "recover" },
  sms_followup: { channel: "sms", purpose: "recover" },
  whatsapp_followup: { channel: "whatsapp", purpose: "recover" },
  chat_followup: { channel: "chat", purpose: "recover" },
  voice_followup: { channel: "voice", purpose: "recover" },
  reminder_node: { channel: "email", purpose: "recover" },
  replay_invite: { channel: "email", purpose: "recover" },
  cart_recovery: { channel: "email", purpose: "recover" },
  no_show_recovery: { channel: "email", purpose: "recover" },
  refund_save: { channel: "email", purpose: "recover" },
  inactive_lead_reactivation: { channel: "email", purpose: "recover" },
  objection_recovery: { channel: "email", purpose: "recover" },
  coupon_rescue: { channel: "email", purpose: "recover" },
  welcome_node: { channel: "email", purpose: "activate" },
  portal_invite: { channel: "email", purpose: "activate" },
  onboarding_checklist: { channel: "web", purpose: "activate" },
  kickoff_booking: { channel: "web", purpose: "activate" },
  activation_milestone: { channel: "internal", purpose: "activate" },
  continuity_offer: { channel: "email", purpose: "expand" },
  retention_check: { channel: "internal", purpose: "retain" },
  renewal_node: { channel: "email", purpose: "retain" },
  referral_invite: { channel: "email", purpose: "expand" },
  affiliate_invite: { channel: "email", purpose: "expand" },
  viral_share_node: { channel: "web", purpose: "expand" },
  review_request: { channel: "email", purpose: "expand" },
  event_log_node: { channel: "internal", purpose: "handoff" },
  crm_sync_node: { channel: "internal", purpose: "handoff" },
  workflow_emit_node: { channel: "internal", purpose: "handoff" },
  alert_node: { channel: "internal", purpose: "handoff" },
  dedupe_node: { channel: "internal", purpose: "handoff" },
  verification_node: { channel: "internal", purpose: "handoff" },
  experiment_split_node: { channel: "internal", purpose: "handoff" },
  state_update_node: { channel: "internal", purpose: "handoff" },
};

function node(blueprintId: string, stepId: string, type: NodeType, name: string): FunnelNode {
  const meta = CANONICAL_NODE_META[type];
  return {
    id: stepId,
    type,
    name,
    channel: meta.channel,
    purpose: meta.purpose,
    tracking: {
      eventType: "page_view",
      blueprintId,
      stepId,
    },
  };
}

function edge(blueprintId: string, from: string, to: string, label: string): FunnelEdge {
  return {
    id: `${blueprintId}:${from}->${to}`,
    from,
    to,
    label,
    edgeType: "default",
  };
}

function createGraph(
  tenantId: string,
  family: FunnelFamily,
  name: string,
  nodeSpecs: Array<[NodeType, string]>,
  goal: FunnelDefinition["goal"],
): FunnelDefinition {
  const blueprintId = `${family}-default`;
  const nodes = nodeSpecs.map(([type, label], index) =>
    node(blueprintId, `${family}-${index + 1}`, type, label),
  );
  const edges = nodes.slice(1).map((current, index) =>
    edge(blueprintId, nodes[index].id, current.id, current.name),
  );

  return {
    id: blueprintId,
    tenantId,
    name,
    family,
    goal,
    entryPoints: [nodes[0]?.type ?? "landing_page"],
    nodes,
    edges,
    defaults: {
      defaultChannelOrder: ["whatsapp", "sms", "email"],
      hotLeadThreshold: 80,
      nurtureScheduleDays: DEFAULT_NURTURE_DAYS,
      bookingProvider: "Lunacal",
      checkoutProvider: "ThriveCart",
      crmProvider: "SuiteDash",
      eventLedger: "AITable",
    },
  };
}

export const CANONICAL_NODE_LIBRARY = CANONICAL_NODE_META;

export function buildDefaultFunnelGraphs(tenantId: string) {
  return {
    "lead-magnet": createGraph(tenantId, "lead-magnet", "Lead Magnet Funnel", [
      ["landing_page", "Landing Page"],
      ["optin_form", "Opt-In"],
      ["lead_magnet_delivery", "Delivery"],
      ["scoring_node", "Score Lead"],
      ["email_followup", "Nurture"],
      ["offer_router", "Route to Offer or Consult"],
    ], "capture"),
    qualification: createGraph(tenantId, "qualification", "Qualification Funnel", [
      ["landing_page", "Qualification Landing"],
      ["assessment_node", "Assessment"],
      ["scoring_node", "Score Lead"],
      ["owner_assignment", "Assign Owner"],
      ["booking_node", "Book Consultation"],
      ["proposal_node", "Proposal"],
    ], "book"),
    chat: createGraph(tenantId, "chat", "Conversational Funnel", [
      ["chat_entry", "Chat Entry"],
      ["chat_capture", "Chat Capture"],
      ["objection_detector", "Classify Objection"],
      ["offer_router", "Select Next Step"],
      ["booking_node", "Book or Continue"],
    ], "capture"),
    webinar: createGraph(tenantId, "webinar", "Webinar Funnel", [
      ["landing_page", "Registration Landing"],
      ["webinar_register", "Register"],
      ["reminder_node", "Reminders"],
      ["webinar_live", "Live or Replay"],
      ["offer_page", "Offer"],
      ["checkout_node", "Checkout"],
      ["replay_invite", "Replay Recovery"],
    ], "sell"),
    authority: createGraph(tenantId, "authority", "Authority Funnel", [
      ["content_page", "Authority Content"],
      ["bridge_page", "Bridge"],
      ["documentary_node", "Documentary"],
      ["scoring_node", "Score Intent"],
      ["objection_detector", "Objection Handling"],
      ["offer_router", "Consult or Offer"],
    ], "capture"),
    checkout: createGraph(tenantId, "checkout", "Checkout Funnel", [
      ["offer_page", "Offer"],
      ["checkout_node", "Checkout"],
      ["order_bump", "Order Bump"],
      ["upsell_node", "Upsell"],
      ["downsell_node", "Downsell"],
      ["cart_recovery", "Cart Recovery"],
    ], "sell"),
    retention: createGraph(tenantId, "retention", "Retention Funnel", [
      ["welcome_node", "Welcome"],
      ["portal_invite", "Portal Invite"],
      ["onboarding_checklist", "Checklist"],
      ["activation_milestone", "Activation"],
      ["continuity_offer", "Continuity"],
      ["referral_invite", "Referral"],
    ], "retain"),
    rescue: createGraph(tenantId, "rescue", "Rescue Funnel", [
      ["refund_save", "Save Trigger"],
      ["objection_detector", "Classify Objection"],
      ["objection_recovery", "Recovery Message"],
      ["offer_router", "Recovery Routing"],
    ], "recover"),
    referral: createGraph(tenantId, "referral", "Referral Funnel", [
      ["referral_invite", "Referral Invite"],
      ["viral_share_node", "Share"],
      ["optin_form", "Referred Opt-In"],
      ["review_request", "Reward and Review"],
    ], "refer"),
    continuity: createGraph(tenantId, "continuity", "Continuity Funnel", [
      ["landing_page", "Signup Landing"],
      ["optin_form", "Signup"],
      ["welcome_node", "Welcome"],
      ["activation_milestone", "Activation"],
      ["renewal_node", "Renewal"],
      ["retention_check", "Retention Monitor"],
    ], "activate"),
  } satisfies Record<FunnelFamily, FunnelDefinition>;
}

export function getDefaultFunnelGraph(tenantId: string, family: FunnelFamily) {
  return buildDefaultFunnelGraphs(tenantId)[family];
}

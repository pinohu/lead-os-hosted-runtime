export type FunnelFamily =
  | "lead-magnet"
  | "qualification"
  | "chat"
  | "webinar"
  | "authority"
  | "checkout"
  | "retention"
  | "rescue"
  | "referral"
  | "continuity";

export type LeadStage =
  | "anonymous"
  | "engaged"
  | "captured"
  | "qualified"
  | "nurturing"
  | "booked"
  | "offered"
  | "converted"
  | "onboarding"
  | "active"
  | "retention-risk"
  | "referral-ready"
  | "churned";

export type LeadMilestoneId =
  | "lead-m1-captured"
  | "lead-m2-return-engaged"
  | "lead-m3-booked-or-offered";

export type CustomerMilestoneId =
  | "customer-m1-onboarded"
  | "customer-m2-activated"
  | "customer-m3-value-realized";

export type MarketplaceAudience = "client" | "provider";

export type PlumbingUrgencyBand =
  | "emergency-now"
  | "same-day"
  | "estimate"
  | "commercial"
  | "maintenance";

export type PlumbingIssueType =
  | "burst-pipe"
  | "drain-clog"
  | "water-heater"
  | "leak"
  | "sewer-line"
  | "fixture-install"
  | "commercial-service"
  | "general-plumbing";

export type PlumbingPropertyType =
  | "residential"
  | "commercial"
  | "multi-family"
  | "unknown";

export type PlumbingDispatchMode =
  | "dispatch-now"
  | "same-day-booking"
  | "estimate-path"
  | "commercial-intake"
  | "triage";

export type PlumbingOperatorActionType =
  | "dispatch-now"
  | "assign-backup-provider"
  | "retry-booking"
  | "mark-booked"
  | "mark-completed"
  | "mark-lost";

export type PlumbingJobOutcomeStatus =
  | "dispatch-requested"
  | "backup-provider-requested"
  | "booking-retry-requested"
  | "booked"
  | "completed"
  | "lost";

export interface PlumbingLeadContext {
  issueType: PlumbingIssueType;
  urgencyBand: PlumbingUrgencyBand;
  propertyType: PlumbingPropertyType;
  dispatchMode: PlumbingDispatchMode;
  geo: {
    state?: string;
    county?: string;
    city?: string;
    zip?: string;
    serviceRadius?: string;
    emergencyCoverageWindow?: string;
  };
  confidence: number;
  routingReasons: string[];
}

export interface PlumbingJobOutcome {
  status: PlumbingJobOutcomeStatus;
  actorEmail: string;
  recordedAt: string;
  note?: string;
  revenueValue?: number;
  provider?: string;
}

export type MilestoneTrack = "lead" | "customer";

export type NodeType =
  | "landing_page"
  | "bridge_page"
  | "content_page"
  | "popup_entry"
  | "chat_entry"
  | "voice_entry"
  | "optin_form"
  | "multi_step_form"
  | "assessment_node"
  | "calculator_node"
  | "chat_capture"
  | "checklist_capture"
  | "webinar_register"
  | "scoring_node"
  | "persona_classifier"
  | "objection_detector"
  | "channel_selector"
  | "offer_router"
  | "owner_assignment"
  | "mini_class"
  | "webinar_live"
  | "webinar_replay"
  | "documentary_node"
  | "case_study_node"
  | "faq_node"
  | "lead_magnet_delivery"
  | "booking_node"
  | "application_node"
  | "offer_page"
  | "checkout_node"
  | "proposal_node"
  | "order_bump"
  | "upsell_node"
  | "downsell_node"
  | "email_followup"
  | "sms_followup"
  | "whatsapp_followup"
  | "chat_followup"
  | "voice_followup"
  | "reminder_node"
  | "replay_invite"
  | "cart_recovery"
  | "no_show_recovery"
  | "refund_save"
  | "inactive_lead_reactivation"
  | "objection_recovery"
  | "coupon_rescue"
  | "welcome_node"
  | "portal_invite"
  | "onboarding_checklist"
  | "kickoff_booking"
  | "activation_milestone"
  | "continuity_offer"
  | "retention_check"
  | "renewal_node"
  | "referral_invite"
  | "affiliate_invite"
  | "viral_share_node"
  | "review_request"
  | "event_log_node"
  | "crm_sync_node"
  | "workflow_emit_node"
  | "alert_node"
  | "dedupe_node"
  | "verification_node"
  | "experiment_split_node"
  | "state_update_node";

export type ChannelType =
  | "web"
  | "email"
  | "sms"
  | "whatsapp"
  | "chat"
  | "voice"
  | "internal"
  | "checkout";

export type NodePurpose =
  | "attract"
  | "capture"
  | "qualify"
  | "educate"
  | "persuade"
  | "book"
  | "sell"
  | "recover"
  | "activate"
  | "retain"
  | "expand"
  | "handoff";

export type EdgeType =
  | "default"
  | "success"
  | "failure"
  | "hot"
  | "warm"
  | "cold"
  | "attended"
  | "missed"
  | "clicked"
  | "ignored"
  | "bought"
  | "abandoned"
  | "qualified"
  | "unqualified"
  | "refunded"
  | "retained";

export type TriggerEvent =
  | "page_view"
  | "cta_click"
  | "form_submit"
  | "chat_reply"
  | "call_connected"
  | "timer_elapsed"
  | "message_opened"
  | "message_clicked"
  | "booking_completed"
  | "checkout_completed"
  | "refund_requested"
  | "subscription_started";

export type ActionType =
  | "log_event"
  | "create_or_update_lead"
  | "sync_crm"
  | "send_email"
  | "send_sms"
  | "send_whatsapp"
  | "start_chat"
  | "start_voice_call"
  | "create_booking"
  | "generate_document"
  | "start_checkout"
  | "add_tag"
  | "remove_tag"
  | "assign_owner"
  | "emit_workflow"
  | "send_internal_alert"
  | "start_nurture_stage"
  | "mark_stage_complete"
  | "request_review"
  | "start_referral_flow";

export type CanonicalEventType =
  | "page_view"
  | "session_started"
  | "source_detected"
  | "cta_clicked"
  | "chat_opened"
  | "assessment_started"
  | "video_engaged"
  | "identity_enriched"
  | "funnel_recommended"
  | "offer_recommended"
  | "lead_captured"
  | "lead_validated"
  | "lead_deduped"
  | "lead_scored"
  | "lead_qualified"
  | "lead_routed"
  | "advisor_assigned"
  | "followup_email_sent"
  | "followup_whatsapp_sent"
  | "followup_sms_sent"
  | "booking_completed"
  | "booking_rescheduled"
  | "booking_canceled"
  | "booking_status_changed"
  | "checkout_started"
  | "checkout_completed"
  | "proposal_sent"
  | "lead_converted"
  | "subscription_started"
  | "payment_received"
  | "onboarding_started"
  | "portal_invite_sent"
  | "kickoff_booked"
  | "customer_created"
  | "retention_sequence_started"
  | "refund_risk_detected"
  | "referral_invite_sent"
  | "review_requested"
  | "plumbing_urgency_classified"
  | "dispatch_path_selected"
  | "operator_dispatch_action"
  | "plumbing_job_outcome_recorded"
  | "lead_milestone_reached"
  | "customer_milestone_reached";

export interface TriggerDefinition {
  event: TriggerEvent;
  delayMinutes?: number;
}

export interface ConditionDefinition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "exists"
    | "not_exists"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "in";
  value?: boolean | number | string | string[];
}

export interface ActionDefinition {
  type: ActionType;
  provider?: string;
  payloadTemplateId?: string;
  destination?: string;
}

export interface NodeOutputDefinition {
  name: string;
  writesTo: "lead" | "trace" | "crm" | "event" | "nurture" | "booking" | "commerce";
  field: string;
}

export interface TrackingDefinition {
  eventType: CanonicalEventType;
  blueprintId: string;
  stepId: string;
  experimentId?: string;
  variantId?: string;
}

export interface FallbackDefinition {
  onFailureNodeId?: string;
  onTimeoutNodeId?: string;
  onNoResponseNodeId?: string;
}

export interface FunnelNode {
  id: string;
  type: NodeType;
  name: string;
  channel: ChannelType;
  purpose: NodePurpose;
  route?: string;
  assetId?: string;
  templateId?: string;
  offerId?: string;
  trigger?: TriggerDefinition;
  conditions?: ConditionDefinition[];
  actions?: ActionDefinition[];
  outputs?: NodeOutputDefinition[];
  tracking: TrackingDefinition;
  fallback?: FallbackDefinition;
}

export interface FunnelEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  edgeType: EdgeType;
  conditions?: ConditionDefinition[];
  priority?: number;
}

export interface FunnelDefaults {
  defaultChannelOrder: ChannelType[];
  hotLeadThreshold: number;
  nurtureScheduleDays: number[];
  bookingProvider?: string;
  checkoutProvider?: string;
  crmProvider?: string;
  eventLedger?: string;
}

export interface FunnelDefinition {
  id: string;
  tenantId: string;
  name: string;
  family: FunnelFamily;
  goal: "capture" | "book" | "sell" | "activate" | "retain" | "refer" | "recover";
  entryPoints: string[];
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  defaults: FunnelDefaults;
}

export interface MilestoneDefinition<TId extends string = string> {
  id: TId;
  track: MilestoneTrack;
  ordinal: 1 | 2 | 3;
  label: string;
  description: string;
  targetOutcome: string;
}

export interface ToolOwnership {
  primary: string;
  responsibility: string;
  support?: string[];
}

export const DEFAULT_NURTURE_DAYS = [0, 2, 5, 10, 14, 21, 30];

export const LEAD_MILESTONES: MilestoneDefinition<LeadMilestoneId>[] = [
  {
    id: "lead-m1-captured",
    track: "lead",
    ordinal: 1,
    label: "Captured",
    description: "The first meaningful conversion event. The visitor becomes a known lead.",
    targetOutcome: "Create identity and deliver the first value moment.",
  },
  {
    id: "lead-m2-return-engaged",
    track: "lead",
    ordinal: 2,
    label: "Return Engagement",
    description: "The lead comes back or takes a second meaningful action that proves interest.",
    targetOutcome: "Earn a second trust event and deepen intent.",
  },
  {
    id: "lead-m3-booked-or-offered",
    track: "lead",
    ordinal: 3,
    label: "Booked or Offered",
    description: "The lead reaches the third meaningful action: booking, proposal, checkout, or comparable commitment.",
    targetOutcome: "Turn interest into a habit-forming conversion pattern.",
  },
];

export const CUSTOMER_MILESTONES: MilestoneDefinition<CustomerMilestoneId>[] = [
  {
    id: "customer-m1-onboarded",
    track: "customer",
    ordinal: 1,
    label: "Onboarded",
    description: "The customer has received welcome, access, and a clear next step.",
    targetOutcome: "Reduce uncertainty immediately after the sale.",
  },
  {
    id: "customer-m2-activated",
    track: "customer",
    ordinal: 2,
    label: "Activated",
    description: "The customer completes a meaningful setup or usage milestone.",
    targetOutcome: "Create the second success moment that drives retention.",
  },
  {
    id: "customer-m3-value-realized",
    track: "customer",
    ordinal: 3,
    label: "Value Realized",
    description: "The customer experiences a result worth repeating, renewing, or referring.",
    targetOutcome: "Open the door to continuity, expansion, and referrals.",
  },
];

export const TOOL_OWNERSHIP_MAP: Record<string, ToolOwnership> = {
  runtime: { primary: "LeadOS runtime", responsibility: "capture, routing, trace, graph execution" },
  crm: { primary: "SuiteDash", responsibility: "contacts, companies, onboarding, client delivery" },
  ledger: { primary: "AITable", responsibility: "event ledger, reporting, traceability" },
  intelligence: { primary: "AgenticFlow", responsibility: "scoring, persona inference, objection detection, next-best-action" },
  orchestration: { primary: "n8n", responsibility: "workflow execution", support: ["Boost.space"] },
  email: { primary: "Emailit", responsibility: "transactional and nurture email" },
  whatsapp: { primary: "WbizTool", responsibility: "WhatsApp follow-up" },
  sms: { primary: "Easy Text Marketing", responsibility: "SMS reminders and reactivation", support: ["SMS-IT"] },
  chat: { primary: "Insighto.ai", responsibility: "conversational qualification" },
  voice: { primary: "Thoughtly", responsibility: "phone callbacks and call-heavy flows" },
  popup: { primary: "ConvertBox", responsibility: "micro-segmentation and exit-intent capture" },
  checklist: { primary: "Kuicklist", responsibility: "checklist lead magnets" },
  identity: { primary: "Happierleads", responsibility: "visitor enrichment" },
  scoring: { primary: "Salespanel", responsibility: "behavioral scoring and attribution" },
  cro: { primary: "Plerdy", responsibility: "conversion behavior optimization" },
  commerce: { primary: "ThriveCart", responsibility: "checkout, order bumps, subscriptions, cart recovery" },
  referral: { primary: "Partnero", responsibility: "affiliate and referral engine", support: ["UpViral"] },
  booking: { primary: "Trafft", responsibility: "booking and scheduling", support: ["Lunacal"] },
  documents: { primary: "Documentero", responsibility: "proposals, contracts, onboarding documents" },
  fallbackAutomation: { primary: "Activepieces", responsibility: "secondary workflow layer", support: ["ElectroNeek"] },
};

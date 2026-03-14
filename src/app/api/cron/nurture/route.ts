import { NextResponse } from "next/server";
import { resolveNextNurtureStage } from "@/lib/automation";
import { sendEmailAction, sendSmsAction, sendWhatsAppAction } from "@/lib/providers";
import { appendEvents, getLeadRecords, markNurtureStageSent } from "@/lib/runtime-store";
import { createCanonicalEvent } from "@/lib/trace";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const processed: Array<{ leadKey: string; stage: string; channels: string[] }> = [];

  for (const lead of await getLeadRecords()) {
    const stage = resolveNextNurtureStage(lead);
    if (!stage) continue;

    const channels: string[] = [];
    if (stage.channels.includes("email") && lead.email) {
      await sendEmailAction({
        to: lead.email,
        subject: `${stage.label} from LeadOS`,
        html: `<p>Hi ${lead.firstName},</p><p>${stage.label} for your ${lead.family} journey is ready.</p>`,
        trace: lead.trace,
      });
      channels.push("email");
    }
    if (stage.channels.includes("whatsapp") && lead.phone) {
      await sendWhatsAppAction({
        phone: lead.phone,
        body: `${stage.label}: continue your next step at ${lead.destination}`,
      });
      channels.push("whatsapp");
    }
    if (stage.channels.includes("sms") && lead.phone) {
      await sendSmsAction({
        phone: lead.phone,
        body: `${stage.label}: ${lead.destination}`,
      });
      channels.push("sms");
    }

    await markNurtureStageSent(lead.leadKey, stage.id);
    await appendEvents([
      createCanonicalEvent(lead.trace, "retention_sequence_started", "internal", "NURTURED", {
        stageId: stage.id,
        label: stage.label,
        channels,
      }),
    ]);
    processed.push({ leadKey: lead.leadKey, stage: stage.id, channels });
  }

  return NextResponse.json({
    success: true,
    processed,
    count: processed.length,
  });
}

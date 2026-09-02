// Sketch of the inbound side — adapt the handler signature to whatever
// actually hosts this (a Vercel/Next.js route, an Express app, a Supabase
// Edge Function). The one part that matters everywhere is the three lines
// inside: extract phone + text from Meta's payload, run handleIncomingMessage,
// send the reply back.
//
// Meta's webhook payload shape:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

import { handleIncomingMessage } from "./handleMessage.js";
import { sendWhatsAppMessage } from "./sendWhatsApp.js";

interface WhatsAppWebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: Array<{ from: string; text?: { body: string } }>;
      };
    }>;
  }>;
}

export async function onWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  const message = payload.entry[0]?.changes[0]?.value.messages?.[0];
  if (!message?.text) return; // ignore non-text messages (images, reactions, etc.)

  const reply = await handleIncomingMessage(message.from, message.text.body);
  await sendWhatsAppMessage(message.from, reply);
}

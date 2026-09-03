// Fill this in with your real WhatsApp Cloud API credentials and call.
// This file is deliberately the only place that talks to Meta, so it's
// the one place to touch when the send side changes.
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

// businessPhoneNumberId picks which of the shop's numbers the reply goes
// out from — it's the same id the webhook received the message on (see
// webhook.ts), not a fixed env var, since different shops send from
// different numbers under the one WhatsApp Business account.
export async function sendWhatsAppMessage(businessPhoneNumberId: string, phone: string, text: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN not set — see .env.example");
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  }
}

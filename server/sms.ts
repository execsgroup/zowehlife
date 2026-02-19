const CLICKSEND_API_URL = "https://rest.clicksend.com/v3";

interface SmsMessage {
  to: string;
  body: string;
  from?: string;
}

interface MmsMessage {
  to: string;
  body: string;
  subject?: string;
  mediaUrl?: string;
  from?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getAuthHeader(): string {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  if (!username || !apiKey) {
    throw new Error("ClickSend credentials not configured");
  }
  return "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64");
}

export async function sendSms(message: SmsMessage): Promise<SendResult> {
  try {
    const response = await fetch(`${CLICKSEND_API_URL}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        messages: [
          {
            to: message.to,
            body: message.body,
            source: "zoweh-life",
            ...(message.from && { from: message.from }),
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.http_code === 200 && data.data?.messages?.[0]?.status === "SUCCESS") {
      return {
        success: true,
        messageId: data.data.messages[0].message_id,
      };
    }

    const errorMsg = data.data?.messages?.[0]?.status || data.response_msg || "SMS send failed";
    console.error("[SMS] Send failed:", errorMsg);
    return { success: false, error: errorMsg };
  } catch (error: any) {
    console.error("[SMS] Error sending SMS:", error);
    return { success: false, error: error.message || "Failed to send SMS" };
  }
}

export async function sendMms(message: MmsMessage): Promise<SendResult> {
  try {
    const response = await fetch(`${CLICKSEND_API_URL}/mms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        messages: [
          {
            to: message.to,
            body: message.body,
            subject: message.subject || "Zoweh Life",
            media_file: message.mediaUrl || undefined,
            source: "zoweh-life",
            ...(message.from && { from: message.from }),
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.http_code === 200 && data.data?.messages?.[0]?.status === "SUCCESS") {
      return {
        success: true,
        messageId: data.data.messages[0].message_id,
      };
    }

    const errorMsg = data.data?.messages?.[0]?.status || data.response_msg || "MMS send failed";
    console.error("[MMS] Send failed:", errorMsg);
    return { success: false, error: errorMsg };
  } catch (error: any) {
    console.error("[MMS] Error sending MMS:", error);
    return { success: false, error: error.message || "Failed to send MMS" };
  }
}

export function formatPhoneForSms(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+1" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned.length >= 10 ? cleaned : null;
}

export const SMS_PLAN_LIMITS: Record<string, { sms: number; mms: number }> = {
  free: { sms: 0, mms: 0 },
  foundations: { sms: 500, mms: 250 },
  formation: { sms: 2000, mms: 500 },
  stewardship: { sms: 5000, mms: 1000 },
};

export function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function buildFollowUpSmsMessage(data: {
  recipientName: string;
  churchName: string;
  followUpDate: string;
  followUpTime?: string;
  leaderName?: string;
  videoCallLink?: string;
  customMessage?: string;
  isLeader?: boolean;
}): string {
  const formattedDate = new Date(data.followUpDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = data.followUpTime
    ? new Date(`2000-01-01T${data.followUpTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;
  const dateTime = formattedTime ? `${formattedDate} at ${formattedTime}` : formattedDate;

  if (data.customMessage) {
    return data.customMessage;
  }

  if (data.isLeader) {
    let msg = `${data.churchName}: Reminder - Follow-up with ${data.recipientName} on ${dateTime}.`;
    if (data.videoCallLink) {
      msg += ` Video: ${data.videoCallLink}`;
    }
    return msg;
  }

  let msg = `Hi ${data.recipientName}, ${data.churchName} has scheduled a follow-up with you on ${dateTime}.`;
  if (data.videoCallLink) {
    msg += ` Join video call: ${data.videoCallLink}`;
  }
  return msg;
}

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

interface FollowUpEmailData {
  convertName: string;
  convertEmail?: string;
  leaderName: string;
  leaderEmail: string;
  churchName: string;
  followUpDate: string;
  notes?: string;
}

export async function sendFollowUpNotification(data: FollowUpEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formattedDate = new Date(data.followUpDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailsToSend: Promise<any>[] = [];

    emailsToSend.push(
      client.emails.send({
        from: fromEmail || 'New Converts Tracker <noreply@resend.dev>',
        to: data.leaderEmail,
        subject: `Follow-up Reminder: ${data.convertName} on ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Follow-up Reminder</h2>
            <p>Hello ${data.leaderName},</p>
            <p>This is a reminder that you have a scheduled follow-up:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Convert:</strong> ${data.convertName}</p>
              <p><strong>Church:</strong> ${data.churchName}</p>
              <p><strong>Follow-up Date:</strong> ${formattedDate}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            <p>Please ensure to reach out and connect with ${data.convertName} on the scheduled date.</p>
            <p>Blessings,<br>New Converts Tracker</p>
          </div>
        `
      })
    );

    if (data.convertEmail) {
      emailsToSend.push(
        client.emails.send({
          from: fromEmail || 'New Converts Tracker <noreply@resend.dev>',
          to: data.convertEmail,
          subject: `We'd love to connect with you - ${data.churchName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">We're Here For You</h2>
              <p>Hello ${data.convertName},</p>
              <p>We hope you're doing well on your faith journey! Someone from ${data.churchName} will be reaching out to you soon to check in and see how you're doing.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Expected Contact Date:</strong> ${formattedDate}</p>
                <p><strong>Your Contact:</strong> ${data.leaderName}</p>
              </div>
              <p>If you have any prayer requests or need to connect sooner, please don't hesitate to reach out.</p>
              <p>Blessings,<br>${data.churchName}</p>
            </div>
          `
        })
      );
    }

    await Promise.all(emailsToSend);
    console.log(`Follow-up emails sent for ${data.convertName}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send follow-up notification:', error);
    return { success: false, error };
  }
}

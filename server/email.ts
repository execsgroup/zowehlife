import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  console.log('[Email] getCredentials called');
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  console.log('[Email] REPLIT_CONNECTORS_HOSTNAME:', hostname ? 'set' : 'NOT SET');
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('[Email] X_REPLIT_TOKEN not found for repl/depl');
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }
  console.log('[Email] Token type:', xReplitToken.startsWith('repl ') ? 'repl' : 'depl');

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    const data = await response.json();
    console.log('[Email] Connector response status:', response.status);
    connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
      console.error('[Email] Resend not connected - no api_key in settings');
      throw new Error('Resend not connected');
    }
    console.log('[Email] Resend connected, from_email:', connectionSettings.settings.from_email || 'default');
    return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
  } catch (error: any) {
    console.error('[Email] Failed to get credentials:', error?.message || error);
    throw error;
  }
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
  customLeaderMessage?: string;
  customConvertMessage?: string;
  customLeaderSubject?: string;
  customConvertSubject?: string;
  videoCallLink?: string;
  contactUrl?: string;
}

export async function sendFollowUpNotification(data: FollowUpEmailData) {
  console.log('[Email] sendFollowUpNotification called with:', {
    convertName: data.convertName,
    convertEmail: data.convertEmail || 'N/A',
    leaderEmail: data.leaderEmail,
    churchName: data.churchName,
    followUpDate: data.followUpDate
  });
  try {
    console.log('[Email] Getting Resend client...');
    const { client, fromEmail } = await getUncachableResendClient();
    console.log('[Email] Got Resend client, fromEmail:', fromEmail);
    
    const formattedDate = new Date(data.followUpDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailsToSend: Promise<any>[] = [];

    // Video call section HTML
    const videoCallSection = data.videoCallLink 
      ? `<div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <p style="margin: 0 0 10px 0;"><strong>Video Call Link:</strong></p>
          <a href="${data.videoCallLink}" style="color: #2196F3; text-decoration: none; word-break: break-all;">${data.videoCallLink}</a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Click to join the video call - no account required</p>
        </div>`
      : '';

    // Build leader email content - use custom message if provided
    const leaderEmailContent = data.customLeaderMessage 
      ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Follow-up Reminder</h2>
            <p>Hello ${data.leaderName},</p>
            <div style="white-space: pre-wrap; margin: 20px 0;">${data.customLeaderMessage}</div>
            <p style="margin: 20px 0;"><strong>Follow-up Date:</strong> ${formattedDate}</p>
            ${videoCallSection}
            <p>Blessings,<br>${data.churchName}</p>
          </div>
        `
      : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Follow-up Reminder</h2>
            <p>Hello ${data.leaderName},</p>
            <p>This is a reminder that you have a scheduled follow-up with ${data.convertName}.</p>
            <p style="margin: 20px 0;"><strong>Follow-up Date:</strong> ${formattedDate}</p>
            ${videoCallSection}
            <p>Please ensure to reach out and connect on the scheduled date.</p>
            <p>Blessings,<br>${data.churchName}</p>
          </div>
        `;

    const leaderSubject = data.customLeaderSubject || `Follow-up Reminder: ${data.convertName} on ${formattedDate}`;
    
    // Build dynamic from address with ministry name as display name
    const getFromWithMinistry = (ministryName: string, email: string) => {
      // Extract just the email address if it contains a display name already
      const emailMatch = email.match(/<([^>]+)>/) || email.match(/([^\s<>]+@[^\s<>]+)/);
      const emailAddress = emailMatch ? emailMatch[1] : email;
      // Sanitize ministry name for email header (remove special characters that could break it)
      const safeName = ministryName.replace(/[<>"]/g, '').trim();
      return `${safeName} <${emailAddress}>`;
    };

    const fromWithMinistry = getFromWithMinistry(data.churchName, fromEmail || 'noreply@resend.dev');
    console.log('[Email] Using from address:', fromWithMinistry);

    emailsToSend.push(
      client.emails.send({
        from: fromWithMinistry,
        to: data.leaderEmail,
        subject: leaderSubject,
        html: leaderEmailContent
      })
    );

    if (data.convertEmail) {
      // Contact button HTML
      const contactButtonSection = data.contactUrl
        ? `<div style="margin: 25px 0; text-align: center;">
            <a href="${data.contactUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Contact Us</a>
          </div>`
        : '';
      
      // Build convert email content - use custom message if provided
      const convertEmailContent = data.customConvertMessage
        ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">We're Here For You</h2>
              <p>Hello ${data.convertName},</p>
              <div style="white-space: pre-wrap; margin: 20px 0;">${data.customConvertMessage}</div>
              <p style="margin: 20px 0;"><strong>Expected Contact Date:</strong> ${formattedDate}</p>
              ${videoCallSection}
              <p>If you have any prayer requests or need to connect sooner, please don't hesitate to reach out.</p>
              ${contactButtonSection}
              <p>Blessings,<br>${data.churchName}</p>
            </div>
          `
        : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">We're Here For You</h2>
              <p>Hello ${data.convertName},</p>
              <p>Thank you for worshiping and fellowshipping with us. We're grateful you joined us and pray your faith journey continues to grow stronger. Someone from ${data.churchName} will be reaching out soon to connect with you and see how we can support you.</p>
              <p style="margin: 20px 0;"><strong>Expected Contact Date:</strong> ${formattedDate}</p>
              ${videoCallSection}
              <p>If you have any prayer requests or need to connect sooner, please don't hesitate to reach out.</p>
              ${contactButtonSection}
              <p>Blessings,<br>${data.churchName}</p>
            </div>
          `;

      const convertSubject = data.customConvertSubject || `We'd love to connect with you - ${data.churchName}`;
      
      emailsToSend.push(
        client.emails.send({
          from: fromWithMinistry,
          to: data.convertEmail,
          subject: convertSubject,
          html: convertEmailContent
        })
      );
    }

    await Promise.all(emailsToSend);
    console.log(`[Email] Follow-up emails sent successfully for ${data.convertName}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send follow-up notification:', error?.message || error);
    console.error('[Email] Full error:', JSON.stringify(error, null, 2));
    return { success: false, error };
  }
}

interface AccountApprovalEmailData {
  leaderName: string;
  leaderEmail: string;
  churchName: string;
  temporaryPassword: string;
}

interface MinistryAdminApprovalEmailData {
  adminName: string;
  adminEmail: string;
  ministryName: string;
  temporaryPassword: string;
}

export async function sendMinistryAdminApprovalEmail(data: MinistryAdminApprovalEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const actualFromEmail = fromEmail || 'Zoweh Life <onboarding@resend.dev>';
    console.log(`Attempting to send ministry admin approval email from: ${actualFromEmail} to: ${data.adminEmail}`);

    const result = await client.emails.send({
      from: actualFromEmail,
      to: data.adminEmail,
      subject: 'Your Ministry Admin Account Has Been Approved - Zoweh Life',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Zoweh Life!</h2>
          <p>Hello ${data.adminName},</p>
          <p>Great news! Your ministry registration has been approved. You are now the Ministry Admin for <strong>${data.ministryName}</strong>.</p>
          <p>As a Ministry Admin, you can:</p>
          <ul>
            <li>Approve leader account requests for your ministry</li>
            <li>View and manage all converts, new members, and members</li>
            <li>Access ministry statistics and reports</li>
          </ul>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Login Details:</strong></p>
            <p><strong>Email:</strong> ${data.adminEmail}</p>
            <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
          </div>
          <p style="color: #666; font-size: 14px;"><em>Please change your password after your first login for security purposes.</em></p>
          <p>We're excited to have you on board. If you have any questions, please reach out to our support team.</p>
          <p>Blessings,<br>Zoweh Life Team</p>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend API returned error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`Ministry admin approval email sent successfully to ${data.adminEmail}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send ministry admin approval email:', error?.message || error);
    return { success: false, error };
  }
}

export async function sendAccountApprovalEmail(data: AccountApprovalEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const actualFromEmail = fromEmail || 'Zoweh Life <onboarding@resend.dev>';
    console.log(`Attempting to send approval email from: ${actualFromEmail} to: ${data.leaderEmail}`);

    const result = await client.emails.send({
      from: actualFromEmail,
      to: data.leaderEmail,
      subject: 'Your Leader Account Has Been Approved - Zoweh Life',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Zoweh Life!</h2>
          <p>Hello ${data.leaderName},</p>
          <p>Great news! Your leader account request has been approved. You can now log in and start managing Members and New Converts for <strong>${data.churchName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Login Details:</strong></p>
            <p><strong>Email:</strong> ${data.leaderEmail}</p>
            <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
          </div>
          <p style="color: #666; font-size: 14px;"><em>Please change your password after your first login for security purposes.</em></p>
          <p>We're excited to have you on board. If you have any questions, please reach out to your administrator.</p>
          <p>Blessings,<br>Zoweh Life Team</p>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend API returned error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`Account approval email sent successfully to ${data.leaderEmail}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send account approval email:', error?.message || error);
    return { success: false, error };
  }
}

interface ReminderEmailData {
  convertName: string;
  convertEmail: string;
  leaderName: string;
  churchName: string;
  followUpDate: string;
  contactUrl?: string;
  customSubject?: string;
  customMessage?: string;
}

export async function sendFollowUpReminderEmail(data: ReminderEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formattedDate = new Date(data.followUpDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build dynamic from address with ministry name
    const getFromWithMinistry = (ministryName: string, email: string) => {
      const emailMatch = email.match(/<([^>]+)>/) || email.match(/([^\s<>]+@[^\s<>]+)/);
      const emailAddress = emailMatch ? emailMatch[1] : email;
      const safeName = ministryName.replace(/[<>"]/g, '').trim();
      return `${safeName} <${emailAddress}>`;
    };

    const fromWithMinistry = getFromWithMinistry(data.churchName, fromEmail || 'noreply@resend.dev');

    // Contact button HTML
    const contactButtonSection = data.contactUrl
      ? `<div style="margin: 25px 0; text-align: center;">
          <a href="${data.contactUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Contact Us</a>
        </div>`
      : '';

    // Use custom subject/message if provided
    const emailSubject = data.customSubject || `Reminder: We're reaching out tomorrow - ${data.churchName}`;
    const emailMessage = data.customMessage || 
      `We wanted to let you know that someone from ${data.churchName} will be reaching out to you tomorrow to check in and see how you're doing on your faith journey.`;

    await client.emails.send({
      from: fromWithMinistry,
      to: data.convertEmail,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Just a Friendly Reminder</h2>
          <p>Hello ${data.convertName},</p>
          <p>${emailMessage}</p>
          <p style="margin: 20px 0;"><strong>Expected Contact Date:</strong> ${formattedDate}</p>
          <p>We're here to support you every step of the way. If you have any prayer requests or need anything before then, please don't hesitate to let us know.</p>
          ${contactButtonSection}
          <p>Blessings,<br>${data.churchName}</p>
        </div>
      `
    });

    console.log(`Reminder email sent to ${data.convertEmail} for follow-up on ${data.followUpDate}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return { success: false, error };
  }
}

interface AccountDenialEmailData {
  applicantName: string;
  applicantEmail: string;
}

export async function sendAccountDenialEmail(data: AccountDenialEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    await client.emails.send({
      from: fromEmail || 'Zoweh Life <noreply@resend.dev>',
      to: data.applicantEmail,
      subject: 'Leader Account Request Update - Zoweh Life',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Request Update</h2>
          <p>Hello ${data.applicantName},</p>
          <p>Thank you for your interest in becoming a leader with Zoweh Life.</p>
          <p>After careful review, we are unable to approve your account request at this time. If you believe this was in error or have questions, please contact your church administrator directly.</p>
          <p>Blessings,<br>Zoweh Life Team</p>
        </div>
      `
    });

    console.log(`Account denial email sent to ${data.applicantEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send account denial email:', error);
    return { success: false, error };
  }
}

interface GenericEmailData {
  to: string;
  subject: string;
  html: string;
}

interface MinistryRemovalEmailData {
  memberEmail: string;
  memberName: string;
  ministryName: string;
}

export async function sendMinistryRemovalEmail(data: MinistryRemovalEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const actualFromEmail = fromEmail || 'Zoweh Life <noreply@resend.dev>';
    console.log(`[Email] Sending ministry removal notification from: ${actualFromEmail} to: ${data.memberEmail}`);

    const result = await client.emails.send({
      from: actualFromEmail,
      to: data.memberEmail,
      subject: `You have been removed from ${data.ministryName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ministry Affiliation Update</h2>
          <p>Dear ${data.memberName},</p>
          <p>This is to inform you that you have been removed from <strong>${data.ministryName}</strong>.</p>
          <p>If you believe this was done in error, please contact the ministry leadership directly.</p>
          <p>You can still join other ministries through their public registration forms. Your member portal account remains active for any other ministries you may be affiliated with.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">This is an automated message from Zoweh Life.</p>
        </div>
      `
    });

    if (result.error) {
      console.error('[Email] Resend API returned error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`[Email] Ministry removal email sent successfully to ${data.memberEmail}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send ministry removal email:', error?.message || error);
    return { success: false, error };
  }
}

export async function sendEmail(data: GenericEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const actualFromEmail = fromEmail || 'Zoweh Life <noreply@resend.dev>';
    console.log(`[Email] Sending generic email from: ${actualFromEmail} to: ${data.to}`);

    const result = await client.emails.send({
      from: actualFromEmail,
      to: data.to,
      subject: data.subject,
      html: data.html
    });

    if (result.error) {
      console.error('[Email] Resend API returned error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`[Email] Email sent successfully to ${data.to}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send email:', error?.message || error);
    return { success: false, error };
  }
}

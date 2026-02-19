import { storage } from "./storage";
import { sendFollowUpReminderEmail } from "./email";
import { getBaseUrl } from "./utils/url";
import { sendSms, sendMms, formatPhoneForSms, buildFollowUpSmsMessage, getCurrentBillingPeriod, SMS_PLAN_LIMITS } from "./sms";

const REMINDER_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const CONTACT_REMINDER_DAYS = 14; // Days before auto-changing to CONTACT_NEW_MEMBER
const FOLLOWUP_PROGRESSION_DAYS = 20; // Days before auto-changing to next initiate stage

async function processExpiredFollowups() {
  try {
    console.log("[Scheduler] Checking for expired follow-ups to mark as NOT_COMPLETED...");
    
    const expiredFollowups = await storage.getExpiredScheduledFollowups();
    
    for (const followup of expiredFollowups) {
      await storage.updateCheckinOutcome(followup.id, "NOT_COMPLETED");
      console.log(`[Scheduler] Marked follow-up ${followup.id} as NOT_COMPLETED (was scheduled for ${followup.nextFollowupDate})`);
    }
    
    if (expiredFollowups.length > 0) {
      console.log(`[Scheduler] Marked ${expiredFollowups.length} expired follow-ups as NOT_COMPLETED`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing expired follow-ups:", error);
  }
}

async function processNeverContactedConverts() {
  try {
    console.log("[Scheduler] Checking for converts with no follow-up after 30 days...");
    
    const count = await storage.markConvertsAsNeverContacted();
    
    if (count > 0) {
      console.log(`[Scheduler] Marked ${count} converts as NEVER_CONTACTED (30+ days with no follow-up)`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing never contacted converts:", error);
  }
}

async function processUpcomingFollowUpReminders() {
  try {
    console.log("[Scheduler] Checking for upcoming follow-ups to send reminders...");
    
    const upcomingFollowups = await storage.getCheckinsWithUpcomingFollowups();
    
    for (const followup of upcomingFollowups) {
      const alreadySent = await storage.hasReminderBeenSent(followup.checkinId, "DAY_BEFORE");
      if (alreadySent) {
        console.log(`[Scheduler] Reminder already sent for checkin ${followup.checkinId}`);
        continue;
      }

      const method = followup.notificationMethod || "email";
      let reminderSent = false;

      if (followup.convertEmail) {
        const contactUrl = `${getBaseUrl()}/contact`;
        const result = await sendFollowUpReminderEmail({
          convertName: `${followup.convertFirstName} ${followup.convertLastName}`,
          convertEmail: followup.convertEmail,
          leaderName: followup.leaderName,
          churchName: followup.churchName,
          followUpDate: followup.nextFollowupDate,
          followUpTime: followup.nextFollowupTime || undefined,
          contactUrl,
        });
        if (result.success) {
          reminderSent = true;
          console.log(`[Scheduler] Email reminder sent for ${followup.convertFirstName} ${followup.convertLastName}`);
        }
      } else {
        console.log(`[Scheduler] No email for ${followup.convertFirstName} ${followup.convertLastName}, skipping email reminder`);
      }

      if (method === "sms" || method === "mms") {
        const phone = followup.convertPhone ? formatPhoneForSms(followup.convertPhone) : null;
        if (!phone) {
          console.log(`[Scheduler] Skipping ${method} reminder for ${followup.convertFirstName} - no phone`);
        } else {
          const church = await storage.getChurch(followup.churchId);
          const plan = (church?.plan || "free") as string;
          const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
          const billingPeriod = getCurrentBillingPeriod();
          const usage = await storage.getSmsUsage(followup.churchId, billingPeriod);
          const smsType = method as "sms" | "mms";
          const used = smsType === "sms" ? usage.smsCount : usage.mmsCount;
          const limit = smsType === "sms" ? limits.sms : limits.mms;
          if (used >= limit) {
            console.log(`[Scheduler] ${smsType.toUpperCase()} limit reached for church ${followup.churchId}, skipping SMS reminder`);
          } else {
            const msg = buildFollowUpSmsMessage({
              recipientName: followup.convertFirstName,
              churchName: followup.churchName,
              followUpDate: followup.nextFollowupDate,
              followUpTime: followup.nextFollowupTime || undefined,
              videoCallLink: followup.videoLink || undefined,
            });
            const sendFn = smsType === "sms" ? sendSms : sendMms;
            const result = await sendFn({ to: phone, body: msg });
            if (result.success) {
              await storage.incrementSmsUsage(followup.churchId, billingPeriod, smsType);
              reminderSent = true;
              console.log(`[Scheduler] ${smsType.toUpperCase()} reminder sent to ${followup.convertFirstName}`);
            } else {
              console.error(`[Scheduler] ${smsType.toUpperCase()} reminder failed:`, result.error);
            }
          }
        }
      }

      if (reminderSent) {
        await storage.recordReminderSent(followup.checkinId, "DAY_BEFORE");
      }
    }
    
    console.log(`[Scheduler] Processed ${upcomingFollowups.length} upcoming follow-ups`);
  } catch (error) {
    console.error("[Scheduler] Error processing follow-up reminders:", error);
  }
}

async function processNewMemberUpcomingFollowUpReminders() {
  try {
    console.log("[Scheduler] Checking for upcoming new member follow-ups to send reminders...");
    
    const upcomingFollowups = await storage.getNewMemberCheckinsWithUpcomingFollowups();
    
    for (const followup of upcomingFollowups) {
      const reminderKey = `new_member_${followup.checkinId}`;
      const alreadySent = await storage.hasReminderBeenSent(reminderKey, "DAY_BEFORE");
      if (alreadySent) {
        console.log(`[Scheduler] Reminder already sent for new member checkin ${followup.checkinId}`);
        continue;
      }

      const method = followup.notificationMethod || "email";
      let reminderSent = false;

      if (followup.newMemberEmail) {
        const contactUrl = `${getBaseUrl()}/contact`;
        const result = await sendFollowUpReminderEmail({
          convertName: `${followup.newMemberFirstName} ${followup.newMemberLastName}`,
          convertEmail: followup.newMemberEmail,
          leaderName: followup.leaderName,
          churchName: followup.churchName,
          followUpDate: followup.nextFollowupDate,
          followUpTime: followup.nextFollowupTime || undefined,
          contactUrl,
          customSubject: followup.customReminderSubject || undefined,
          customMessage: followup.customReminderMessage || undefined,
        });
        if (result.success) {
          reminderSent = true;
          console.log(`[Scheduler] Email reminder sent for new member ${followup.newMemberFirstName} ${followup.newMemberLastName}`);
        }
      } else {
        console.log(`[Scheduler] No email for ${followup.newMemberFirstName} ${followup.newMemberLastName}, skipping email reminder`);
      }

      if (method === "sms" || method === "mms") {
        const phone = followup.newMemberPhone ? formatPhoneForSms(followup.newMemberPhone) : null;
        if (!phone) {
          console.log(`[Scheduler] Skipping ${method} reminder for ${followup.newMemberFirstName} - no phone`);
        } else {
          const church = await storage.getChurch(followup.churchId);
          const plan = (church?.plan || "free") as string;
          const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
          const billingPeriod = getCurrentBillingPeriod();
          const usage = await storage.getSmsUsage(followup.churchId, billingPeriod);
          const smsType = method as "sms" | "mms";
          const used = smsType === "sms" ? usage.smsCount : usage.mmsCount;
          const limit = smsType === "sms" ? limits.sms : limits.mms;
          if (used >= limit) {
            console.log(`[Scheduler] ${smsType.toUpperCase()} limit reached for church ${followup.churchId}, skipping SMS reminder`);
          } else {
            const msg = buildFollowUpSmsMessage({
              recipientName: followup.newMemberFirstName,
              churchName: followup.churchName,
              followUpDate: followup.nextFollowupDate,
              followUpTime: followup.nextFollowupTime || undefined,
              videoCallLink: followup.videoLink || undefined,
              customMessage: followup.customReminderMessage || undefined,
            });
            const sendFn = smsType === "sms" ? sendSms : sendMms;
            const result = await sendFn({ to: phone, body: msg });
            if (result.success) {
              await storage.incrementSmsUsage(followup.churchId, billingPeriod, smsType);
              reminderSent = true;
              console.log(`[Scheduler] ${smsType.toUpperCase()} reminder sent to new member ${followup.newMemberFirstName}`);
            } else {
              console.error(`[Scheduler] ${smsType.toUpperCase()} reminder failed:`, result.error);
            }
          }
        }
      }

      if (reminderSent) {
        await storage.recordReminderSent(reminderKey, "DAY_BEFORE");
      }
    }
    
    console.log(`[Scheduler] Processed ${upcomingFollowups.length} upcoming new member follow-ups`);
  } catch (error) {
    console.error("[Scheduler] Error processing new member follow-up reminders:", error);
  }
}

// New Member Follow-up Workflow Functions

// Check for new members who haven't been contacted within 14 days of joining
async function processNewMemberContactReminders() {
  try {
    console.log("[Scheduler] Checking for new members needing contact reminder...");
    
    const newMembersToRemind = await storage.getNewMembersNeedingContactReminder(CONTACT_REMINDER_DAYS);
    
    for (const newMember of newMembersToRemind) {
      await storage.updateNewMemberFollowUpStage(newMember.id, "CONTACT_NEW_MEMBER");
      console.log(`[Scheduler] New member ${newMember.firstName} ${newMember.lastName} marked as CONTACT_NEW_MEMBER (14+ days with no follow-up)`);
    }
    
    if (newMembersToRemind.length > 0) {
      console.log(`[Scheduler] Marked ${newMembersToRemind.length} new members as needing contact`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing new member contact reminders:", error);
  }
}

// Check for new members who completed first follow-up 20 days ago - auto-change to INITIATE_SECOND
async function processNewMemberSecondFollowUp() {
  try {
    console.log("[Scheduler] Checking for new members needing second follow-up initiation...");
    
    const newMembersForSecond = await storage.getNewMembersNeedingSecondFollowUp(FOLLOWUP_PROGRESSION_DAYS);
    
    for (const newMember of newMembersForSecond) {
      await storage.updateNewMemberFollowUpStage(newMember.id, "INITIATE_SECOND");
      console.log(`[Scheduler] New member ${newMember.firstName} ${newMember.lastName} marked as INITIATE_SECOND (20 days after first completed)`);
    }
    
    if (newMembersForSecond.length > 0) {
      console.log(`[Scheduler] Marked ${newMembersForSecond.length} new members for second follow-up initiation`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing second follow-up initiation:", error);
  }
}

// Check for new members who completed second follow-up 20 days ago - auto-change to INITIATE_FINAL
async function processNewMemberFinalFollowUp() {
  try {
    console.log("[Scheduler] Checking for new members needing final follow-up initiation...");
    
    const newMembersForFinal = await storage.getNewMembersNeedingFinalFollowUp(FOLLOWUP_PROGRESSION_DAYS);
    
    for (const newMember of newMembersForFinal) {
      await storage.updateNewMemberFollowUpStage(newMember.id, "INITIATE_FINAL");
      console.log(`[Scheduler] New member ${newMember.firstName} ${newMember.lastName} marked as INITIATE_FINAL (20 days after second completed)`);
    }
    
    if (newMembersForFinal.length > 0) {
      console.log(`[Scheduler] Marked ${newMembersForFinal.length} new members for final follow-up initiation`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing final follow-up initiation:", error);
  }
}

export function startReminderScheduler() {
  console.log("[Scheduler] Starting follow-up reminder scheduler...");
  
  // Run immediately on startup
  processUpcomingFollowUpReminders();
  processNewMemberUpcomingFollowUpReminders();
  processExpiredFollowups();
  processNeverContactedConverts();
  processNewMemberContactReminders();
  processNewMemberSecondFollowUp();
  processNewMemberFinalFollowUp();
  
  // Then run periodically
  setInterval(() => {
    processUpcomingFollowUpReminders();
    processNewMemberUpcomingFollowUpReminders();
    processExpiredFollowups();
    processNeverContactedConverts();
    processNewMemberContactReminders();
    processNewMemberSecondFollowUp();
    processNewMemberFinalFollowUp();
  }, REMINDER_CHECK_INTERVAL);
}

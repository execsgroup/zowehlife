import { storage } from "./storage";
import { sendFollowUpReminderEmail } from "./email";

const REMINDER_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

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
      // Skip if convert doesn't have an email
      if (!followup.convertEmail) {
        console.log(`[Scheduler] Skipping reminder for ${followup.convertFirstName} ${followup.convertLastName} - no email`);
        continue;
      }

      // Check if reminder was already sent
      const alreadySent = await storage.hasReminderBeenSent(followup.checkinId, "DAY_BEFORE");
      if (alreadySent) {
        console.log(`[Scheduler] Reminder already sent for checkin ${followup.checkinId}`);
        continue;
      }

      // Send reminder email
      const result = await sendFollowUpReminderEmail({
        convertName: `${followup.convertFirstName} ${followup.convertLastName}`,
        convertEmail: followup.convertEmail,
        leaderName: followup.leaderName,
        churchName: followup.churchName,
        followUpDate: followup.nextFollowupDate,
      });

      if (result.success) {
        // Record that reminder was sent
        await storage.recordReminderSent(followup.checkinId, "DAY_BEFORE");
        console.log(`[Scheduler] Reminder sent for ${followup.convertFirstName} ${followup.convertLastName}`);
      }
    }
    
    console.log(`[Scheduler] Processed ${upcomingFollowups.length} upcoming follow-ups`);
  } catch (error) {
    console.error("[Scheduler] Error processing follow-up reminders:", error);
  }
}

export function startReminderScheduler() {
  console.log("[Scheduler] Starting follow-up reminder scheduler...");
  
  // Run immediately on startup
  processUpcomingFollowUpReminders();
  processExpiredFollowups();
  processNeverContactedConverts();
  
  // Then run periodically
  setInterval(() => {
    processUpcomingFollowUpReminders();
    processExpiredFollowups();
    processNeverContactedConverts();
  }, REMINDER_CHECK_INTERVAL);
}

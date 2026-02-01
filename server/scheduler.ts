import { storage } from "./storage";
import { sendFollowUpReminderEmail } from "./email";

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
  processExpiredFollowups();
  processNeverContactedConverts();
  processNewMemberContactReminders();
  processNewMemberSecondFollowUp();
  processNewMemberFinalFollowUp();
  
  // Then run periodically
  setInterval(() => {
    processUpcomingFollowUpReminders();
    processExpiredFollowups();
    processNeverContactedConverts();
    processNewMemberContactReminders();
    processNewMemberSecondFollowUp();
    processNewMemberFinalFollowUp();
  }, REMINDER_CHECK_INTERVAL);
}

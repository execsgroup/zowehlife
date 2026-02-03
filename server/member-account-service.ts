import { storage } from "./storage";
import { sendEmail } from "./email";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Person, MemberAccount, MinistryAffiliation } from "@shared/schema";

const CLAIM_TOKEN_EXPIRY_HOURS = 24;
const SALT_ROUNDS = 10;

interface ProvisionResult {
  person: Person;
  memberAccount: MemberAccount;
  affiliation: MinistryAffiliation;
  isNewAccount: boolean;
  claimToken?: string;
}

/**
 * Generates a secure random token and its hash
 */
function generateClaimToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/**
 * Hash a claim token for lookup
 */
export function hashClaimToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

interface ConvertProvisionParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  ministryId: string;
  ministryName: string;
  convertId?: string;
  sendClaimEmail?: boolean;
}

/**
 * Provision a member account for a convert created via public form or leader action.
 * This creates person identity, member account, and ministry affiliation.
 * Returns claim token for password setup if new account.
 */
export async function provisionMemberAccountForConvert(
  params: ConvertProvisionParams
): Promise<ProvisionResult | null> {
  const { email, firstName, lastName, phone = null, ministryId, convertId, sendClaimEmail = true } = params;
  
  if (!email) {
    return null; // Cannot create account without email
  }

  const normalizedEmail = email.toLowerCase();

  // Check if person already exists
  let person = await storage.getPersonByEmail(normalizedEmail);
  let isNewAccount = false;
  let claimToken: string | undefined;

  if (!person) {
    // Create new person
    person = await storage.createPerson({
      email: normalizedEmail,
      firstName,
      lastName,
      phone,
    });
  }

  // Check for existing member account
  let memberAccount = await storage.getMemberAccountByPersonId(person.id);

  if (!memberAccount) {
    // Create new member account
    memberAccount = await storage.createMemberAccount({
      personId: person.id,
      status: "PENDING_CLAIM",
    });
    isNewAccount = true;

    // Generate claim token
    const { token, hash } = generateClaimToken();
    claimToken = token;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CLAIM_TOKEN_EXPIRY_HOURS);

    await storage.createAccountClaimToken({
      memberAccountId: memberAccount.id,
      tokenHash: hash,
      expiresAt,
    });
  }

  // Check for existing affiliation
  let affiliation = await storage.checkAffiliationExists(person.id, ministryId);

  if (!affiliation) {
    // Create ministry affiliation
    affiliation = await storage.createMinistryAffiliation({
      personId: person.id,
      ministryId,
      relationshipType: "convert",
      convertId,
    });

    // Send appropriate email
    if (sendClaimEmail) {
      const ministry = await storage.getChurch(ministryId);
      if (ministry) {
        if (isNewAccount && claimToken) {
          await sendClaimAccountEmail(normalizedEmail, firstName, ministry.name, claimToken);
        } else {
          await sendAddedToMinistryEmail(normalizedEmail, firstName, ministry.name);
        }
      }
    }
  }

  return {
    person,
    memberAccount,
    affiliation,
    isNewAccount,
    claimToken: isNewAccount ? claimToken : undefined,
  };
}

interface MemberProvisionParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  ministryId: string;
  ministryName: string;
  memberId?: string;
  newMemberId?: string;
  memberType?: 'member' | 'new_member';
  sendClaimEmail?: boolean;
}

/**
 * Provision a member account when registering as a member or new member via public form.
 * Handles both 'member' and 'new_member' types.
 */
export async function provisionMemberAccountForMember(
  params: MemberProvisionParams
): Promise<ProvisionResult | null> {
  const { 
    email, 
    firstName, 
    lastName, 
    phone = null, 
    ministryId, 
    memberId, 
    newMemberId, 
    memberType = 'member', 
    sendClaimEmail = true 
  } = params;
  
  if (!email) {
    return null;
  }

  const normalizedEmail = email.toLowerCase();

  // Check if person already exists
  let person = await storage.getPersonByEmail(normalizedEmail);
  let isNewAccount = false;
  let claimToken: string | undefined;

  if (!person) {
    person = await storage.createPerson({
      email: normalizedEmail,
      firstName,
      lastName,
      phone,
    });
  }

  // Check for existing member account
  let memberAccount = await storage.getMemberAccountByPersonId(person.id);

  if (!memberAccount) {
    memberAccount = await storage.createMemberAccount({
      personId: person.id,
      status: "PENDING_CLAIM",
    });
    isNewAccount = true;

    // Generate claim token
    const { token, hash } = generateClaimToken();
    claimToken = token;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CLAIM_TOKEN_EXPIRY_HOURS);

    await storage.createAccountClaimToken({
      memberAccountId: memberAccount.id,
      tokenHash: hash,
      expiresAt,
    });
  }

  // Check for existing affiliation and update or create
  let affiliation = await storage.checkAffiliationExists(person.id, ministryId);
  
  // Determine relationship type (new_member or member)
  const relationshipType: "member" | "new_member" = memberType === 'new_member' ? 'new_member' : 'member';

  if (affiliation) {
    // Update relationship type if needed
    if (affiliation.relationshipType !== relationshipType) {
      affiliation = await storage.updateMinistryAffiliationType(affiliation.id, relationshipType);
    }
  } else {
    const affiliationData: any = {
      personId: person.id,
      ministryId,
      relationshipType,
    };
    
    // Set the appropriate foreign key based on type
    if (memberType === 'new_member' && newMemberId) {
      affiliationData.newMemberId = newMemberId;
    } else if (memberId) {
      affiliationData.memberId = memberId;
    }
    
    affiliation = await storage.createMinistryAffiliation(affiliationData);
  }

  // Send claim email if new account
  if (sendClaimEmail && isNewAccount && claimToken) {
    const ministry = await storage.getChurch(ministryId);
    if (ministry) {
      await sendPromotionToMemberEmail(normalizedEmail, firstName, ministry.name, claimToken);
    }
  }

  return {
    person,
    memberAccount,
    affiliation,
    isNewAccount,
    claimToken: isNewAccount ? claimToken : undefined,
  };
}

/**
 * Resend claim email for an existing member account
 */
export async function resendClaimEmail(memberAccountId: string): Promise<boolean> {
  const memberAccount = await storage.getMemberAccount(memberAccountId);
  if (!memberAccount || memberAccount.status !== "PENDING_CLAIM") {
    return false;
  }

  const person = await storage.getPerson(memberAccount.personId);
  if (!person) {
    return false;
  }

  // Invalidate existing tokens
  await storage.invalidateExistingTokens(memberAccountId);

  // Generate new claim token
  const { token, hash } = generateClaimToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CLAIM_TOKEN_EXPIRY_HOURS);

  await storage.createAccountClaimToken({
    memberAccountId,
    tokenHash: hash,
    expiresAt,
  });

  // Get affiliations to find ministry name
  const affiliations = await storage.getAffiliationsByPerson(person.id);
  let ministryName = "Zoweh Life Ministry";
  if (affiliations.length > 0) {
    const ministry = await storage.getChurch(affiliations[0].ministryId);
    if (ministry) {
      ministryName = ministry.name;
    }
  }

  await sendClaimAccountEmail(person.email, person.firstName, ministryName, token);
  return true;
}

/**
 * Resend claim token for a pending account
 * Used by leaders/admins to help members who lost their claim email
 */
export async function resendClaimToken(
  memberAccountId: string,
  ministryName: string
): Promise<{ success: boolean; error?: string }> {
  const memberAccount = await storage.getMemberAccount(memberAccountId);
  if (!memberAccount) {
    return { success: false, error: "Member account not found" };
  }

  if (memberAccount.status !== "PENDING_CLAIM") {
    return { success: false, error: "Account already claimed - member can use password reset instead" };
  }

  const person = await storage.getPerson(memberAccount.personId);
  if (!person) {
    return { success: false, error: "Person record not found" };
  }

  // Invalidate existing tokens and create a new one
  await storage.invalidateExistingTokens(memberAccountId);
  
  const token = generateClaimToken();
  const tokenHash = hashClaimToken(token);
  const expiresAt = new Date(Date.now() + CLAIM_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await storage.createAccountClaimToken({
    memberAccountId,
    tokenHash,
    expiresAt,
  });

  await sendClaimAccountEmail(person.email, person.firstName, ministryName, token);
  
  return { success: true };
}

/**
 * Claim account with token and set password
 */
export async function claimAccountWithToken(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = hashClaimToken(token);
  const claimToken = await storage.getValidClaimToken(tokenHash);

  if (!claimToken) {
    return { success: false, error: "Invalid or expired token" };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Update member account
  await storage.updateMemberAccountPassword(claimToken.memberAccountId, passwordHash);

  // Mark token as used
  await storage.markClaimTokenUsed(claimToken.id);

  return { success: true };
}

/**
 * Authenticate member login
 */
export async function authenticateMember(
  email: string,
  password: string
): Promise<{ success: boolean; memberAccount?: MemberAccount; person?: Person; error?: string }> {
  const person = await storage.getPersonByEmail(email);
  if (!person) {
    return { success: false, error: "Invalid email or password" };
  }

  const memberAccount = await storage.getMemberAccountByPersonId(person.id);
  if (!memberAccount) {
    return { success: false, error: "Invalid email or password" };
  }

  if (memberAccount.status === "SUSPENDED") {
    return { success: false, error: "Account is suspended" };
  }

  if (memberAccount.status === "PENDING_CLAIM" || !memberAccount.passwordHash) {
    return { success: false, error: "Please set up your password first using the link sent to your email" };
  }

  const passwordMatch = await bcrypt.compare(password, memberAccount.passwordHash);
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password" };
  }

  // Update last login
  await storage.updateMemberAccountLastLogin(memberAccount.id);

  return { success: true, memberAccount, person };
}

// Email sending functions
async function sendClaimAccountEmail(
  email: string,
  firstName: string,
  ministryName: string,
  token: string
): Promise<void> {
  const claimUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://zoweh-life.replit.app"}/member/claim?token=${token}`;

  await sendEmail({
    to: email,
    subject: `Welcome to ${ministryName} - Set Up Your Account`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D1B2A;">Welcome to ${ministryName}!</h2>
        <p>Hi ${firstName},</p>
        <p>We're excited to have you join our ministry community. Your member account has been created, and you can now access your personal portal.</p>
        <p>To get started, please set up your password by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${claimUrl}" style="background-color: #3F5BFF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Set Up Your Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't expect this email, you can safely ignore it.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Zoweh Life - Ministry Management</p>
      </div>
    `,
  });
}

async function sendAddedToMinistryEmail(
  email: string,
  firstName: string,
  ministryName: string
): Promise<void> {
  const loginUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://zoweh-life.replit.app"}/member/login`;

  await sendEmail({
    to: email,
    subject: `You've been added to ${ministryName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D1B2A;">Welcome to ${ministryName}!</h2>
        <p>Hi ${firstName},</p>
        <p>Great news! You've been added to another ministry: <strong>${ministryName}</strong>.</p>
        <p>You can access this ministry through your existing member portal by switching ministries in the dropdown menu.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3F5BFF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Log In to Your Portal</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Zoweh Life - Ministry Management</p>
      </div>
    `,
  });
}

async function sendPromotionToMemberEmail(
  email: string,
  firstName: string,
  ministryName: string,
  token: string
): Promise<void> {
  const claimUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://zoweh-life.replit.app"}/member/claim?token=${token}`;

  await sendEmail({
    to: email,
    subject: `Congratulations! You're now a member of ${ministryName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D1B2A;">Welcome to the ${ministryName} Family!</h2>
        <p>Hi ${firstName},</p>
        <p>Congratulations! You've been officially welcomed as a member of <strong>${ministryName}</strong>.</p>
        <p>Your member account has been created. Set up your password to access your personal member portal where you can:</p>
        <ul>
          <li>View your spiritual journey</li>
          <li>Submit prayer requests</li>
          <li>Stay connected with your ministry</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${claimUrl}" style="background-color: #3F5BFF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Set Up Your Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Zoweh Life - Ministry Management</p>
      </div>
    `,
  });
}

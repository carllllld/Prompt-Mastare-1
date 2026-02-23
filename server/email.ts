import { queueEmail } from './lib/email-service';

const APP_URL = process.env.APP_URL || 'https://optiprompt.se';

export interface EmailResult {
  success: boolean;
  error?: string;
  jobId?: string;
}

export async function sendVerificationEmail(email: string, token: string, ip?: string): Promise<EmailResult> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  
  return queueEmail('verification', email, { verificationUrl }, ip);
}

export async function sendTeamInviteEmail(
  email: string, 
  token: string, 
  teamName: string, 
  inviterEmail: string,
  ip?: string
): Promise<EmailResult> {
  const verificationUrl = `${APP_URL}/accept-invite?token=${token}`;
  
  return queueEmail('team_invite', email, { 
    teamName, 
    inviterEmail, 
    verificationUrl 
  }, ip);
}

export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  userName?: string,
  ip?: string
): Promise<EmailResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  return queueEmail('password_reset', email, { 
    resetUrl, 
    userName: userName || 'där' 
  }, ip);
}

export async function sendSubscriptionConfirmedEmail(
  email: string,
  planName: string,
  planPrice: string,
  userName?: string,
  ip?: string
): Promise<EmailResult> {
  const loginUrl = `${APP_URL}`;
  
  return queueEmail('subscription_confirmed', email, {
    userName: userName || 'där',
    planName,
    planPrice,
    loginUrl
  }, ip);
}

export async function sendWelcomeEmail(
  email: string, 
  userName?: string,
  ip?: string
): Promise<EmailResult> {
  const loginUrl = `${APP_URL}/login`;
  
  return queueEmail('welcome', email, { 
    userName: userName || 'där', 
    loginUrl 
  }, ip);
}


import { queueEmail } from './lib/email-service';
import { Request } from 'express';

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

// Legacy functions for backward compatibility
export async function sendEmailDirect(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> {
  const { sendEmailWithRetry } = await import('./lib/email-service');
  return sendEmailWithRetry('verification', to, { verificationUrl: '', subject, html, text });
}
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">OptiPrompt Mäklare</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Välkommen!</h2>
            <p>Tack för att du registrerade dig hos OptiPrompt Mäklare. För att aktivera ditt konto behöver du verifiera din e-postadress.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verifiera e-postadress
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">Länken är giltig i 24 timmar. Om du inte begärt detta mail kan du ignorera det.</p>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log('[Email] Verification email sent to:', email);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTeamInviteEmail(
  email: string, 
  token: string, 
  teamName: string, 
  inviterEmail: string
): Promise<EmailResult> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping team invite to:', email);
    console.log('[Email] Team invite link would be:', `${APP_URL}/teams/join/${token}`);
    return { success: true };
  }

  try {
    const inviteUrl = `${APP_URL}/teams/join/${token}`;
    
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Du är inbjuden till ${teamName} - OptiPrompt Mäklare`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">OptiPrompt Mäklare</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Team-inbjudan</h2>
            <p><strong>${inviterEmail}</strong> har bjudit in dig att gå med i teamet <strong>${teamName}</strong> på OptiPrompt Mäklare.</p>
            <p>OptiPrompt Mäklare hjälper mäklare att skriva professionella objektbeskrivningar med hjälp av AI.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Gå med i teamet
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">Inbjudan är giltig i 7 dagar. Om du inte har ett konto kommer du att kunna skapa ett när du klickar på länken.</p>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log('[Email] Team invite email sent to:', email);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send team invite email:', error);
    return { success: false, error: error.message };
  }
}

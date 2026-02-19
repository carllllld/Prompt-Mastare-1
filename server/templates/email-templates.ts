export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, string>;
}

export interface TemplateVariables {
  verificationUrl?: string;
  teamName?: string;
  inviterEmail?: string;
  userName?: string;
  resetUrl?: string;
  loginUrl?: string;
  supportEmail?: string;
}

export class EmailTemplateEngine {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Verification Email Template
    this.templates.set('verification', {
      subject: 'Verifiera din e-postadress - OptiPrompt Mäklare',
      html: this.getVerificationTemplate(),
      text: this.getVerificationTextTemplate(),
      variables: { verificationUrl: '' }
    });

    // Team Invite Template
    this.templates.set('team_invite', {
      subject: 'Inbjudan att gå med i team - OptiPrompt Mäklare',
      html: this.getTeamInviteTemplate(),
      text: this.getTeamInviteTextTemplate(),
      variables: { teamName: '', inviterEmail: '', verificationUrl: '' }
    });

    // Password Reset Template
    this.templates.set('password_reset', {
      subject: 'Återställ ditt lösenord - OptiPrompt Mäklare',
      html: this.getPasswordResetTemplate(),
      text: this.getPasswordResetTextTemplate(),
      variables: { resetUrl: '', userName: '' }
    });

    // Welcome Email Template
    this.templates.set('welcome', {
      subject: 'Välkommen till OptiPrompt Mäklare!',
      html: this.getWelcomeTemplate(),
      text: this.getWelcomeTextTemplate(),
      variables: { userName: '', loginUrl: '' }
    });
  }

  render(templateName: string, variables: TemplateVariables): EmailTemplate {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    let html = template.html;
    let text = template.text;
    let subject = template.subject;

    // Replace variables in all template parts
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), value || '');
      text = text.replace(new RegExp(placeholder, 'g'), value || '');
      subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return {
      subject,
      html,
      text,
      variables: template.variables
    };
  }

  private getVerificationTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifiera din e-postadress</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 20px; }
        .small-text { font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OptiPrompt Mäklare</h1>
        </div>
        <div class="content">
          <h2 style="color: #1f2937; margin-top: 0;">Välkommen!</h2>
          <p>Tack för att du registrerade dig hos OptiPrompt Mäklare. För att aktivera ditt konto behöver du verifiera din e-postadress.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" class="button">Verifiera e-postadress</a>
          </div>
          <p class="footer">Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
          <p class="small-text" style="word-break: break-all;">{{verificationUrl}}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p class="small-text" style="margin-bottom: 0;">Länken är giltig i 24 timmar. Om du inte begärt detta mail kan du ignorera det.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private getVerificationTextTemplate(): string {
    return `Välkommen till OptiPrompt Mäklare!

Tack för att du registrerade dig. För att aktivera ditt konto behöver du verifiera din e-postadress.

Klicka på länken nedan för att verifiera:
{{verificationUrl}}

Länken är giltig i 24 timmar. Om du inte begärt detta mail kan du ignorera det.

Med vänliga hälsningar,
OptiPrompt Mäklare Teamet`;
  }

  private getTeamInviteTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Team Inbjudan</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 20px; }
        .small-text { font-size: 12px; color: #9ca3af; }
        .invite-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OptiPrompt Mäklare</h1>
        </div>
        <div class="content">
          <h2 style="color: #1f2937; margin-top: 0;">Inbjudan till team</h2>
          <p>Du har bjudits in att gå med i teamet <strong>{{teamName}}</strong> på OptiPrompt Mäklare.</p>
          
          <div class="invite-box">
            <p style="margin: 0;"><strong>Inbjudan från:</strong> {{inviterEmail}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" class="button">Acceptera inbjudan</a>
          </div>
          
          <p class="footer">Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
          <p class="small-text" style="word-break: break-all;">{{verificationUrl}}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p class="small-text" style="margin-bottom: 0;">Inbjudan är giltig i 7 dagar. Om du inte vill gå med i detta team kan du ignorera detta mail.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private getTeamInviteTextTemplate(): string {
    return `Inbjudan till team - OptiPrompt Mäklare

Du har bjudits in att gå med i teamet {{teamName}}.

Inbjudan från: {{inviterEmail}}

Klicka på länken nedan för att acceptera inbjudan:
{{verificationUrl}}

Inbjudan är giltig i 7 dagar. Om du inte vill gå med i detta team kan du ignorera detta mail.

Med vänliga hälsningar,
OptiPrompt Mäklare Teamet`;
  }

  private getPasswordResetTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Återställ lösenord</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 20px; }
        .small-text { font-size: 12px; color: #9ca3af; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OptiPrompt Mäklare</h1>
        </div>
        <div class="content">
          <h2 style="color: #1f2937; margin-top: 0;">Återställ ditt lösenord</h2>
          <p>Hej {{userName}},</p>
          <p>Vi har tagit emot en förfrågan om att återställa ditt lösenord för ditt OptiPrompt Mäklare-konto.</p>
          
          <div class="warning">
            <p style="margin: 0;"><strong>Säkerhetsinformation:</strong> Om du inte begärt denna återställning, vänligen ignorera detta mail. Ditt lösenord kommer inte att ändras.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" class="button">Återställ lösenord</a>
          </div>
          
          <p class="footer">Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
          <p class="small-text" style="word-break: break-all;">{{resetUrl}}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p class="small-text" style="margin-bottom: 0;">Länken är giltig i 1 timme. Efter det behöver du begära en ny återställning.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private getPasswordResetTextTemplate(): string {
    return `Återställ lösenord - OptiPrompt Mäklare

Hej {{userName}},

Vi har tagit emot en förfrågan om att återställa ditt lösenord för ditt OptiPrompt Mäklare-konto.

Säkerhetsinformation: Om du inte begär denna återställning, vänligen ignorera detta mail. Ditt lösenord kommer inte att ändras.

Klicka på länken nedan för att återställa ditt lösenord:
{{resetUrl}}

Länken är giltig i 1 timme. Efter det behöver du begära en ny återställning.

Med vänliga hälsningar,
OptiPrompt Mäklare Teamet`;
  }

  private getWelcomeTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Välkommen!</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 20px; }
        .feature-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .feature-item:last-child { border-bottom: none; }
        .check { color: #10b981; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OptiPrompt Mäklare</h1>
        </div>
        <div class="content">
          <h2 style="color: #1f2937; margin-top: 0;">Välkommen, {{userName}}!</h2>
          <p>Tack för att du verifierade din e-postadress! Du är nu redo att börja skapa professionella objektbeskrivningar med AI.</p>
          
          <div class="feature-list">
            <h3 style="margin-top: 0;">Vad du kan göra nu:</h3>
            <div class="feature-item">
              <span class="check">✓</span> Skapa objektbeskrivningar för Hemnet och Booli
            </div>
            <div class="feature-item">
              <span class="check">✓</span> Använd avancerad AI för att optimera dina texter
            </div>
            <div class="feature-item">
              <span class="check">✓</span> Spara och hantera dina beskrivningar
            </div>
            <div class="feature-item">
              <span class="check">✓</span> Samarbeta i team (Premium)
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginUrl}}" class="button">Komma igång</a>
          </div>
          
          <p class="footer">Har du frågor? Tveka inte att kontakta vår support.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p class="small-text" style="margin-bottom: 0;">Detta mail skickades till {{userName}} eftersom du skapade ett konto hos OptiPrompt Mäklare.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private getWelcomeTextTemplate(): string {
    return `Välkommen till OptiPrompt Mäklare!

Hej {{userName}},

Tack för att du verifierade din e-postadress! Du är nu redo att börja skapa professionella objektbeskrivningar med AI.

Vad du kan göra nu:
✓ Skapa objektbeskrivningar för Hemnet och Booli
✓ Använd avancerad AI för att optimera dina texter
✓ Spara och hantera dina beskrivningar
✓ Samarbeta i team (Premium)

Börja här: {{loginUrl}}

Har du frågor? Tveka inte att kontakta vår support.

Med vänliga hälsningar,
OptiPrompt Mäklare Teamet`;
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}

export const emailTemplateEngine = new EmailTemplateEngine();

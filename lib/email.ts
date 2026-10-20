import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Send a welcome email to a newly registered user
 * Uses Resend if API key is configured and package is installed, otherwise logs to console
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      // Try to load Resend dynamically - catch if not installed
      let Resend: any;
      try {
        Resend = (await eval('import("resend")')).Resend;
      } catch {
        console.log(`📧 Welcome email would be sent to: ${email} (Resend package not installed)`);
        console.log(`Subject: Welcome to CineGen - Your Account is Ready!`);
        console.log(`Body: Congratulations ${name}! You've successfully created your CineGen account.`);
        return;
      }

      const resend = new Resend(apiKey);

      // Read email template
      let html = '';
      try {
        const templatePath = join(process.cwd(), 'emails', 'welcome-account.html');
        html = await readFile(templatePath, 'utf-8');
        // Replace placeholder with actual email
        html = html.replace(/{{email}}/g, email).replace(/{{name}}/g, name);
      } catch {
        // Fallback HTML if template doesn't exist
        html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0d0d14; color: #ffffff;">
            <h1 style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; font-weight: bold; margin-bottom: 20px;">CineGen</h1>
            <h2 style="font-size: 24px; margin-bottom: 16px;">Congratulations! 🎉</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px;">You have successfully created your CineGen account with email: <strong style="color: #ffffff;">${email}</strong></p>
            <a href="https://cinegen.app/dashboard" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #1f2937;">
              <p style="font-size: 12px; color: #6b7280; text-align: center;">© 2025 CineGen. All rights reserved.</p>
            </div>
          </div>
        `;
      }

      await resend.emails.send({
        from: 'CineGen <noreply@cinegen.app>',
        to: email,
        subject: 'Welcome to CineGen - Your Account is Ready!',
        html,
      });

      console.log(`✅ Welcome email sent to: ${email}`);
    } catch (error: any) {
      console.error('⚠️ Failed to send welcome email:', error.message);
    }
  } else {
    // Log mode when Resend is not configured
    console.log(`📧 Welcome email would be sent to: ${email}`);
    console.log(`Subject: Welcome to CineGen - Your Account is Ready!`);
    console.log(`Body: Congratulations ${name}! You've successfully created your CineGen account.`);
  }
}

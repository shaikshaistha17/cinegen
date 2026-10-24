/**
 * Email Service Module
 * Handles transactional email sending with Resend
 * Includes retry logic and email preferences check
 */

import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase';

// Initialize Resend only if API key is available and valid
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey && !resendApiKey.includes('PLACEHOLDER')
  ? new Resend(resendApiKey)
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailPreferences {
  proposal_submitted?: boolean;
  proposal_accepted?: boolean;
  payment_received?: boolean;
  delivery_uploaded?: boolean;
  review_submitted?: boolean;
  message_received?: boolean;
}

/**
 * Check if user has opted in for specific email type
 * @param userEmail User's email address
 * @param emailType Type of email (e.g., 'proposal_submitted')
 * @returns true if user wants to receive this email type
 */
async function checkEmailPreference(
  userEmail: string,
  emailType?: keyof EmailPreferences
): Promise<boolean> {
  // If no email type specified, send the email (system emails)
  if (!emailType) {
    return true;
  }

  try {
    const supabase = createServiceClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('email_preferences')
      .eq('email', userEmail)
      .single();

    if (error || !user) {
      // If user not found or error, allow email (fail open)
      console.error('Error fetching email preferences:', error);
      return true;
    }

    const preferences = user.email_preferences as EmailPreferences;
    
    // Check if user has opted in for this email type (default true)
    return preferences[emailType] !== false;
  } catch (error) {
    console.error('Error checking email preference:', error);
    // Fail open - allow email if preference check fails
    return true;
  }
}

/**
 * Send email with retry logic and preference checking
 * @param params Email parameters
 * @param emailType Optional email type for preference checking
 * @param maxRetries Maximum number of retry attempts
 */
export async function sendEmail(
  params: SendEmailParams,
  emailType?: keyof EmailPreferences,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text } = params;

  // Skip if Resend is not configured
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email:', subject);
    return { success: true }; // Return success to not break the flow
  }

  // Check email preferences
  const shouldSend = await checkEmailPreference(to, emailType);
  if (!shouldSend) {
    console.log(`Email skipped (user preference): ${emailType} to ${to}`);
    return { success: true }; // Return success since user opted out
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'CineGen <noreply@cinegen.ai>',
        to: [to],
        subject,
        html,
        text: text || undefined,
      });

      if (error) {
        lastError = error.message;
        console.error(`Email send attempt ${attempt + 1} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        continue;
      }

      console.log(`Email sent successfully to ${to}:`, data?.id);
      return { success: true };
    } catch (error: any) {
      lastError = error.message || 'Unknown error';
      console.error(`Email send attempt ${attempt + 1} error:`, error);
      
      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  console.error(`Failed to send email to ${to} after ${maxRetries} attempts`);
  return { success: false, error: lastError };
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  userRole: 'brand' | 'creator'
): Promise<{ success: boolean; error?: string }> {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cinegen.ai'}/dashboard`;
  
  const subject = userRole === 'brand' 
    ? 'Welcome to CineGen - Start Finding Creators'
    : 'Welcome to CineGen - Your Creative Journey Starts Now';

  const html = userRole === 'brand' ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">Welcome to CineGen! 🎉</h1>
      <p>Hi ${userName},</p>
      <p>We're thrilled to have you join CineGen. You now have access to thousands of talented creators ready to bring your campaigns to life.</p>
      
      <h2 style="color: #6366f1;">What you can do:</h2>
      <ul>
        <li>Post briefs and discover creators</li>
        <li>Use AI Brief Builder to streamline your workflow</li>
        <li>Review proposals and manage campaigns</li>
        <li>Connect with verified creative professionals</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Get Started</a>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">Your Creative Journey Starts Now! 🎨</h1>
      <p>Hi ${userName},</p>
      <p>Welcome to CineGen! You're now part of a thriving community of creators connected with brands through AI-powered matching.</p>
      
      <h2 style="color: #6366f1;">What you can do:</h2>
      <ul>
        <li>Browse exciting briefs from top brands</li>
        <li>Submit proposals and showcase your portfolio</li>
        <li>Get AI-matched opportunities based on your skills</li>
        <li>Build your reputation and grow your creative business</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Complete Your Profile</a>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(
  userEmail: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Your CineGen verification code';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">Verify Your Email</h1>
      <p>Your CineGen verification code is:</p>
      
      <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
        <h2 style="color: #1f2937; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h2>
      </div>

      <p style="color: #666;">⏱️ This code expires in 10 minutes.</p>
      
      <p style="color: #dc2626; font-size: 14px; margin-top: 30px;">
        🔒 Security Notice: Never share this code with anyone. CineGen staff will never ask for your verification code.
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        If you didn't request this code, please ignore this email or contact support@cinegen.ai if you're concerned about your account security.<br><br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send proposal notification email to brand
 */
export async function sendProposalNotificationEmail(
  brandEmail: string,
  creatorName: string,
  briefTitle: string,
  proposalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Proposal Received - ${briefTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">New Proposal Received! 🎉</h1>
      <p>Great news! <strong>${creatorName}</strong> has submitted a proposal for your brief "<strong>${briefTitle}</strong>".</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${proposalUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Proposal</a>
      </div>

      <p style="color: #666;">💡 Pro Tip: Review the creator's portfolio and past work before making a decision. You can message them directly to discuss details.</p>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: brandEmail, subject, html }, 'proposal_submitted');
}

/**
 * Send proposal accepted notification email to creator
 */
export async function sendProposalAcceptedEmail(
  creatorEmail: string,
  briefTitle: string,
  projectUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Your proposal was accepted!';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #10b981;">Congratulations! 🎉</h1>
      <p>Your proposal for "<strong>${briefTitle}</strong>" has been accepted!</p>
      
      <p>The brand is ready to move forward with your proposal. You can now start working on this exciting project.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${projectUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Project Details</a>
      </div>

      <p style="color: #666;">Next steps: Review the project requirements and start creating!</p>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: creatorEmail, subject, html }, 'proposal_accepted');
}

/**
 * Send payment received notification email to creator
 */
export async function sendPaymentReceivedEmail(
  creatorEmail: string,
  amount: number,
  projectTitle: string,
  projectUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Payment received';
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #10b981;">Payment Received! 💰</h1>
      <p>Great news! You've received a payment for your project "<strong>${projectTitle}</strong>".</p>
      
      <div style="background: #f0fdf4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #10b981;">
        <h2 style="color: #059669; font-size: 32px; margin: 0;">${formattedAmount}</h2>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${projectUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Project</a>
      </div>

      <p style="color: #666;">The funds will be transferred to your account according to your payout schedule.</p>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: creatorEmail, subject, html }, 'payment_received');
}

/**
 * Send delivery uploaded notification email to brand
 */
export async function sendDeliveryUploadedEmail(
  brandEmail: string,
  projectTitle: string,
  reviewUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'New delivery uploaded';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">New Delivery Uploaded! 📦</h1>
      <p>A new delivery has been uploaded for your project "<strong>${projectTitle}</strong>".</p>
      
      <p>The creator has submitted their work for your review. Please review the delivery and provide feedback.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Review Delivery</a>
      </div>

      <p style="color: #666;">💡 Tip: Provide clear and constructive feedback to help the creator deliver exactly what you need.</p>

      <p style="color: #666; font-size: 14px; margin-top: 40px;">
        Need help? Contact us at support@cinegen.ai<br>
        © 2024 CineGen AI. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail({ to: brandEmail, subject, html }, 'delivery_uploaded');
}

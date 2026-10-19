/**
 * Email Template Generation Module
 * Provides branded email templates for CineGen with variable substitution
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Template cache to avoid repeated file reads
const templateCache: Map<string, string> = new Map();

/**
 * Read email template from filesystem with caching
 */
function readTemplate(templateName: string): string {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = path.join(process.cwd(), 'emails', `${templateName}.html`);
  const content = fs.readFileSync(templatePath, 'utf-8');
  templateCache.set(templateName, content);
  return content;
}

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replace template variables in format {{VARIABLE_NAME}} with actual values
 * Automatically escapes HTML entities for security
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (variables[key] !== undefined) {
      return escapeHtml(variables[key]);
    }
    return match;
  });
}

/**
 * Generate password reset email
 */
export function generatePasswordResetEmail(
  resetLink: string,
  userEmail: string
): EmailTemplate {
  const template = readTemplate('password-reset');
  const processedHtml = replaceVariables(template, { RESET_LINK: resetLink });
  
  const plainText = `Reset Your Password

We received a request to reset your password for your CineGen account (${userEmail}).

Click the link below to create a new password:
${resetLink}

⏱️ This link expires in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
Need help? Contact us at support@cinegen.ai
© 2024 CineGen AI. All rights reserved.`;
  
  return {
    subject: 'Reset your CineGen password',
    html: processedHtml,
    text: plainText
  };
}

/**
 * Generate welcome email based on user role
 */
export function generateWelcomeEmail(
  userName: string,
  userRole: 'brand' | 'creator'
): EmailTemplate {
  if (userRole === 'brand') {
    const template = readTemplate('welcome-brand');
    const processedHtml = replaceVariables(template, { 
      USER_NAME: userName,
      CTA_LINK: 'https://cinegen.ai/dashboard'
    });

    const plainText = `Welcome to CineGen! 🎉

Hi ${userName},

We're thrilled to have you join CineGen. You now have access to thousands of talented creators ready to bring your campaigns to life.

What you can do:
• Post briefs and discover creators
• Use AI Brief Builder to streamline your workflow
• Review proposals and manage campaigns
• Connect with verified creative professionals

Get started: https://cinegen.ai/dashboard

---
Need help? Contact us at support@cinegen.ai
© 2024 CineGen AI. All rights reserved.`;

    return {
      subject: 'Welcome to CineGen - Start Finding Creators',
      html: processedHtml,
      text: plainText
    };
  } else {
    const template = readTemplate('welcome-creator');
    const processedHtml = replaceVariables(template, { 
      USER_NAME: userName,
      CTA_LINK: 'https://cinegen.ai/dashboard'
    });

    const plainText = `Your Creative Journey Starts Now! 🎨

Hi ${userName},

Welcome to CineGen! You're now part of a thriving community of creators connected with brands through AI-powered matching.

What you can do:
• Browse exciting briefs from top brands
• Submit proposals and showcase your portfolio
• Get AI-matched opportunities based on your skills
• Build your reputation and grow your creative business

Complete your profile: https://cinegen.ai/dashboard

---
Need help? Contact us at support@cinegen.ai
© 2024 CineGen AI. All rights reserved.`;

    return {
      subject: 'Welcome to CineGen - Your Creative Journey Starts Now',
      html: processedHtml,
      text: plainText
    };
  }
}

/**
 * Generate OTP verification email
 */
export function generateOTPEmail(
  code: string,
  userEmail: string
): EmailTemplate {
  const template = readTemplate('otp-verification');
  const processedHtml = replaceVariables(template, { OTP_CODE: code });

  const plainText = `Verify Your Email

Your CineGen verification code is:

    ${code}

⏱️ This code expires in 10 minutes.

🔒 Security Notice: Never share this code with anyone. CineGen staff will never ask for your verification code.

If you didn't request this code, please ignore this email or contact support@cinegen.ai if you're concerned about your account security.

---
© 2024 CineGen AI. All rights reserved.`;

  return {
    subject: 'Your CineGen verification code',
    html: processedHtml,
    text: plainText
  };
}

/**
 * Generate proposal notification email for brands
 */
export function generateProposalNotification(
  creatorName: string,
  briefTitle: string,
  proposalLink: string
): EmailTemplate {
  const creatorInitial = creatorName.charAt(0).toUpperCase();
  
  const template = readTemplate('proposal-received');
  const processedHtml = replaceVariables(template, {
    CREATOR_NAME: creatorName,
    BRIEF_TITLE: briefTitle,
    PROPOSAL_LINK: proposalLink,
    CREATOR_AVATAR_INITIAL: creatorInitial
  });

  const plainText = `New Proposal Received! 🎉

Great news! ${creatorName} has submitted a proposal for your brief "${briefTitle}".

View the full proposal and creator details:
${proposalLink}

💡 Pro Tip: Review the creator's portfolio and past work before making a decision. You can message them directly to discuss details.

---
Need help? Contact us at support@cinegen.ai
© 2024 CineGen AI. All rights reserved.`;

  return {
    subject: `New Proposal Received - ${briefTitle}`,
    html: processedHtml,
    text: plainText
  };
}

/**
 * Generate brief match notification email for creators
 */
export function generateBriefMatchEmail(
  briefTitle: string,
  matchScore: number,
  briefLink: string,
  brandName: string
): EmailTemplate {
  const template = readTemplate('brief-match');
  const processedHtml = replaceVariables(template, {
    BRIEF_TITLE: briefTitle,
    MATCH_SCORE: matchScore.toString(),
    BRIEF_LINK: briefLink,
    BRAND_NAME: brandName
  });

  const plainText = `Perfect Match Found! 🎯

${matchScore}% match with "${briefTitle}" by ${brandName}

This brief matches your skills and experience. Our AI has identified this as a great opportunity for you.

View the full brief and apply:
${briefLink}

Don't miss out on this opportunity to showcase your creative talents!

---
Need help? Contact us at support@cinegen.ai
© 2024 CineGen AI. All rights reserved.`;

  return {
    subject: `New Brief Match - ${briefTitle}`,
    html: processedHtml,
    text: plainText
  };
}

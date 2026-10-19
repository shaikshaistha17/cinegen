/**
 * Email Template Generation Module
 * Provides branded email templates for CineGen with variable substitution
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Replace template variables in format {{VARIABLE_NAME}} with actual values
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Convert HTML to plain text by stripping tags
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate password reset email
 */
export function generatePasswordResetEmail(
  resetLink: string,
  userEmail: string
): EmailTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your CineGen password</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">CineGen</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">AI Creator Marketplace</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                We received a request to reset your password for your CineGen account. Click the button below to create a new password.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="border-radius: 8px; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);">
                                        <a href="{{RESET_LINK}}" class="button" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; font-size: 14px; color: #c4b5fd;">
                                            ⏱️ <strong>This link expires in 1 hour</strong> for security reasons.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                                If you didn't request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
                                Need help? Contact us at <a href="mailto:support@cinegen.ai" style="color: #06b6d4; text-decoration: none;">support@cinegen.ai</a>
                            </p>
                            <p style="margin: 16px 0 0 0; font-size: 12px; color: #52525b; text-align: center; line-height: 1.6;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const processedHtml = replaceVariables(html, { RESET_LINK: resetLink });
  
  return {
    subject: 'Reset your CineGen password',
    html: processedHtml,
    text: `Reset Your Password\n\nWe received a request to reset your password for ${userEmail}. Click the link below to create a new password:\n\n${resetLink}\n\nThis link expires in 1 hour for security reasons.\n\nIf you didn't request a password reset, you can safely ignore this email.`
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
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CineGen</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">CineGen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px;">Welcome to CineGen! 🎉</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa;">Hi {{USER_NAME}},</p>
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                We're thrilled to have you join CineGen. You now have access to thousands of talented creators.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="border-radius: 8px; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);">
                                        <a href="{{CTA_LINK}}" class="button" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            Go to Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const processedHtml = replaceVariables(html, { 
      USER_NAME: userName,
      CTA_LINK: 'https://cinegen.ai/dashboard'
    });

    return {
      subject: 'Welcome to CineGen - Start Finding Creators',
      html: processedHtml,
      text: `Welcome to CineGen!\n\nHi ${userName},\n\nWe're thrilled to have you join CineGen. You now have access to thousands of talented creators ready to bring your campaigns to life.\n\nGet started: https://cinegen.ai/dashboard`
    };
  } else {
    // Creator welcome email
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CineGen</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">CineGen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px;">Your Creative Journey Starts Now! 🎨</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa;">Hi {{USER_NAME}},</p>
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                Welcome to CineGen! You're now part of a thriving community of creators.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%);">
                                        <a href="{{CTA_LINK}}" class="button" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            Complete Your Profile
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const processedHtml = replaceVariables(html, { 
      USER_NAME: userName,
      CTA_LINK: 'https://cinegen.ai/dashboard'
    });

    return {
      subject: 'Welcome to CineGen - Your Creative Journey Starts Now',
      html: processedHtml,
      text: `Your Creative Journey Starts Now!\n\nHi ${userName},\n\nWelcome to CineGen! You're now part of a thriving community of creators connected with brands through AI-powered matching.\n\nGet started: https://cinegen.ai/dashboard`
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your CineGen verification code</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .otp-code { font-size: 32px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">CineGen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; text-align: center;">Verify Your Email</h2>
                            <p style="margin: 0 0 32px 0; font-size: 16px; color: #d4d4d8; text-align: center;">
                                Enter this verification code to complete your sign-up:
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <div class="otp-code" style="display: inline-block; background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(6, 182, 212, 0.2)); border: 2px solid rgba(124, 58, 237, 0.5); border-radius: 12px; padding: 24px 48px;">
                                            <span style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">{{OTP_CODE}}</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; font-size: 14px; color: #fde68a; text-align: center;">
                                            ⏱️ <strong>This code expires in 10 minutes</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const processedHtml = replaceVariables(html, { OTP_CODE: code });

  return {
    subject: 'Your CineGen verification code',
    html: processedHtml,
    text: `Verify Your Email\n\nYour CineGen verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nNever share this code with anyone.`
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
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Proposal Received</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">CineGen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 24px;">New Proposal Received! 🎉</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #d4d4d8;">
                                {{CREATOR_NAME}} has submitted a proposal for "{{BRIEF_TITLE}}"
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="border-radius: 8px; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);">
                                        <a href="{{PROPOSAL_LINK}}" class="button" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            View Full Proposal
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const processedHtml = replaceVariables(html, {
    CREATOR_NAME: creatorName,
    BRIEF_TITLE: briefTitle,
    PROPOSAL_LINK: proposalLink,
    CREATOR_AVATAR_INITIAL: creatorInitial
  });

  return {
    subject: `New Proposal Received - ${briefTitle}`,
    html: processedHtml,
    text: `New Proposal Received!\n\n${creatorName} has submitted a proposal for "${briefTitle}".\n\nView the full proposal: ${proposalLink}`
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Brief Match</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">CineGen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 40px 30px; color: #e5e5e5;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; font-size: 32px; font-weight: bold; color: #06b6d4;">{{MATCH_SCORE}}% Match</div>
                            </div>
                            <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 24px; text-align: center;">Perfect Match Found! 🎯</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #d4d4d8; text-align: center;">
                                "{{BRIEF_TITLE}}" by {{BRAND_NAME}}
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
                                <tr>
                                    <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%);">
                                        <a href="{{BRIEF_LINK}}" class="button" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            View Brief & Apply
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #0f0f1a; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 CineGen AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const processedHtml = replaceVariables(html, {
    BRIEF_TITLE: briefTitle,
    MATCH_SCORE: matchScore.toString(),
    BRIEF_LINK: briefLink,
    BRAND_NAME: brandName
  });

  return {
    subject: `New Brief Match - ${briefTitle}`,
    html: processedHtml,
    text: `Perfect Match Found!\n\n${matchScore}% match with "${briefTitle}" by ${brandName}\n\nView and apply: ${briefLink}`
  };
}

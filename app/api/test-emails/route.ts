import { NextResponse } from 'next/server';
import {
  generatePasswordResetEmail,
  generateWelcomeEmail,
  generateOTPEmail,
  generateProposalNotification,
  generateBriefMatchEmail,
} from '@/lib/email-templates';

export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Generate all email templates with sample data
  const passwordReset = generatePasswordResetEmail(
    'https://cinegen.ai/reset?token=DEMO123',
    'demo@cinegen.ai'
  );

  const welcomeBrand = generateWelcomeEmail('Alex Johnson', 'brand');
  const welcomeCreator = generateWelcomeEmail('Maya Patel', 'creator');

  const otp = generateOTPEmail('847392', 'demo@cinegen.ai');

  const proposal = generateProposalNotification(
    'Carlos Rivera',
    'Summer Campaign 2025',
    'https://cinegen.ai/proposals/demo-123'
  );

  const briefMatch = generateBriefMatchEmail(
    'Tech Product Launch',
    94,
    'https://cinegen.ai/briefs/demo-456',
    'TechCorp'
  );

  // Create HTML preview page
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineGen Email Templates - Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            color: #e5e5e5;
            padding: 40px 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px 20px;
            background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
            border-radius: 16px;
        }
        
        .header h1 {
            font-size: 36px;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .warning {
            background-color: rgba(251, 191, 36, 0.1);
            border-left: 4px solid #fbbf24;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 40px;
            color: #fde68a;
        }
        
        .warning strong {
            display: block;
            margin-bottom: 4px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 40px;
        }
        
        .email-card {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .email-card h2 {
            font-size: 20px;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .email-card .subject {
            font-size: 14px;
            color: #a1a1aa;
            margin-bottom: 16px;
            font-style: italic;
        }
        
        .email-card iframe {
            width: 100%;
            height: 600px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background-color: #ffffff;
        }
        
        .actions {
            margin-top: 16px;
            display: flex;
            gap: 12px;
        }
        
        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #7c3aed, #06b6d4);
            color: #ffffff;
        }
        
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: rgba(255, 255, 255, 0.1);
            color: #e5e5e5;
        }
        
        .btn-secondary:hover {
            background-color: rgba(255, 255, 255, 0.15);
        }
        
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 CineGen Email Templates</h1>
            <p>Judge Preview - Professional Branded Email Templates</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Development Preview Only</strong>
            This page is for testing and demonstration purposes. Remove before production deployment.
        </div>
        
        <div class="grid">
            <!-- Password Reset Email -->
            <div class="email-card">
                <h2>1. Password Reset</h2>
                <p class="subject">Subject: ${escapeHtml(passwordReset.subject)}</p>
                <iframe srcdoc="${escapeHtml(passwordReset.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(0)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(0)">View Plain Text</button>
                </div>
            </div>
            
            <!-- Welcome Brand Email -->
            <div class="email-card">
                <h2>2. Welcome Email (Brand)</h2>
                <p class="subject">Subject: ${escapeHtml(welcomeBrand.subject)}</p>
                <iframe srcdoc="${escapeHtml(welcomeBrand.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(1)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(1)">View Plain Text</button>
                </div>
            </div>
            
            <!-- Welcome Creator Email -->
            <div class="email-card">
                <h2>3. Welcome Email (Creator)</h2>
                <p class="subject">Subject: ${escapeHtml(welcomeCreator.subject)}</p>
                <iframe srcdoc="${escapeHtml(welcomeCreator.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(2)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(2)">View Plain Text</button>
                </div>
            </div>
            
            <!-- OTP Verification Email -->
            <div class="email-card">
                <h2>4. OTP Verification</h2>
                <p class="subject">Subject: ${escapeHtml(otp.subject)}</p>
                <iframe srcdoc="${escapeHtml(otp.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(3)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(3)">View Plain Text</button>
                </div>
            </div>
            
            <!-- Proposal Received Email -->
            <div class="email-card">
                <h2>5. Proposal Received (Brand)</h2>
                <p class="subject">Subject: ${escapeHtml(proposal.subject)}</p>
                <iframe srcdoc="${escapeHtml(proposal.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(4)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(4)">View Plain Text</button>
                </div>
            </div>
            
            <!-- Brief Match Email -->
            <div class="email-card">
                <h2>6. Brief Match (Creator)</h2>
                <p class="subject">Subject: ${escapeHtml(briefMatch.subject)}</p>
                <iframe srcdoc="${escapeHtml(briefMatch.html)}"></iframe>
                <div class="actions">
                    <button class="btn btn-primary" onclick="copyHtml(5)">Copy HTML</button>
                    <button class="btn btn-secondary" onclick="viewText(5)">View Plain Text</button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const templates = ${JSON.stringify([
          passwordReset,
          welcomeBrand,
          welcomeCreator,
          otp,
          proposal,
          briefMatch,
        ])};
        
        function copyHtml(index) {
            const html = templates[index].html;
            navigator.clipboard.writeText(html).then(() => {
                alert('HTML copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy HTML. Check console for details.');
            });
        }
        
        function viewText(index) {
            const text = templates[index].text;
            alert(text);
        }
    </script>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Film, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Check if demo account
    const isDemoAccount = email.toLowerCase().includes('@cinegen.demo') || email.toLowerCase().includes('demo');
    if (isDemoAccount) {
      toast.error('Password reset not available for demo accounts. Demo password is always Demo@123');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSent(true);
      toast.success('Check your email for the reset link');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl">
              Cine<span className="gradient-text">Gen</span>
            </span>
          </Link>
          <h1 className="font-display font-bold text-3xl mb-2">Reset your password</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6"
          >
            {!sent ? (
              <>
                <h2 className="font-semibold text-lg mb-6">Forgot Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <Link
                    href="/login"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-semibold text-xl mb-2">Check your email</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  We sent a password reset link to <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  The link will expire in 1 hour.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            )}
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Mail className="w-5 h-5 text-violet-400" />
              <h2 className="font-semibold">What happens next?</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-violet-400">1</span>
                </div>
                <span className="text-muted-foreground">
                  Check your email inbox for a message from CineGen
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-violet-400">2</span>
                </div>
                <span className="text-muted-foreground">
                  Click the reset link in the email (valid for 1 hour)
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-violet-400">3</span>
                </div>
                <span className="text-muted-foreground">
                  Enter your new password on the reset page
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-violet-400">4</span>
                </div>
                <span className="text-muted-foreground">
                  Sign in with your new password
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-xl border bg-violet-500/5 border-violet-500/20">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium text-foreground">Demo accounts</span> cannot reset passwords. 
                The password is always <code className="bg-white/10 px-1.5 py-0.5 rounded text-foreground">Demo@123</code>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

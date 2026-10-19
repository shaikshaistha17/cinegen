'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Film, Eye, EyeOff, Lock, CheckCircle, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const router = useRouter();

  // Check token validity on page load
  useEffect(() => {
    const checkToken = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setTokenError(true);
          toast.error('Your reset link has expired or is invalid');
        }
      } catch (err) {
        console.error('Token check error:', err);
        setTokenError(true);
      } finally {
        setCheckingToken(false);
      }
    };

    checkToken();
  }, []);

  // Password validation helpers
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      toast.success('Password reset successful!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-2">Password reset!</h1>
          <p className="text-muted-foreground">Redirecting you to login...</p>
        </motion.div>
      </div>
    );
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Reset link expired</h1>
          <p className="text-muted-foreground mb-6">
            Your password reset link has expired or is invalid. Reset links are valid for 1 hour.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
          >
            Request a new link
          </Link>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="font-display font-bold text-3xl mb-2">Create new password</h1>
          <p className="text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6"
          >
            <h2 className="font-semibold text-lg mb-6">Set New Password</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isValid}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
              >
                {loading ? 'Resetting password...' : 'Reset password'}
              </button>
            </form>
          </motion.div>

          {/* Requirements Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-5 h-5 text-violet-400" />
              <h2 className="font-semibold">Password requirements</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                {hasMinLength ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={hasMinLength ? 'text-foreground' : 'text-muted-foreground'}>
                  At least 8 characters
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                {hasUppercase ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={hasUppercase ? 'text-foreground' : 'text-muted-foreground'}>
                  At least 1 uppercase letter
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                {hasNumber ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={hasNumber ? 'text-foreground' : 'text-muted-foreground'}>
                  At least 1 number
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                {passwordsMatch ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={passwordsMatch ? 'text-foreground' : 'text-muted-foreground'}>
                  Passwords match
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-xl border bg-violet-500/5 border-violet-500/20">
              <p className="text-xs text-muted-foreground">
                🔒 <span className="font-medium text-foreground">Security tip:</span> Use a unique password 
                that you don't use on other websites.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to login
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

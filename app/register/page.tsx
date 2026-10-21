'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Film, Eye, EyeOff, Sparkles, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'brand' | 'creator';

const PERKS = {
  brand: [
    'Post unlimited campaign briefs',
    'AI-powered brief builder (Gemini)',
    'Smart creator matching engine',
    'Manage proposals & engagements',
    'Access 18+ verified AI creators',
  ],
  creator: [
    'Showcase your AI portfolio',
    'Browse & apply to live briefs',
    'Get matched to relevant brands',
    'Track proposals & earnings',
    'Grow your creator profile',
  ],
};

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('brand');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast.error('Please fill all fields. Password must be at least 6 characters.');
      return;
    }
    if (role === 'brand' && !companyName.trim()) {
      toast.error('Please enter your company name.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password, 
          name: name.trim(),
          companyName: role === 'brand' ? companyName.trim() : undefined,
          role 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // LOCAL MODE: Store user in localStorage
      if (data.localMode && data.user) {
        const users = JSON.parse(localStorage.getItem('cinegen_users') || '[]');
        users.push(data.user);
        localStorage.setItem('cinegen_users', JSON.stringify(users));
        
        // Create session
        const session = {
          userId: data.user.id,
          email: data.user.email,
          role: data.user.role,
          name: data.user.name,
          loginAt: new Date().toISOString(),
        };
        localStorage.setItem('cinegen_session', JSON.stringify(session));
        
        console.log('✅ Account created in local mode');
      }

      if (data.message && data.message.includes('email')) {
        setNeedsVerification(true);
        toast.info('Check your email for verification code');
      } else {
        setDone(true);
        toast.success(`Welcome to CineGen, ${name.trim()}!`);
        setTimeout(() => {
          window.location.href = role === 'creator' ? '/onboarding' : '/dashboard';
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      setDone(true);
      toast.success('Email verified! Welcome to CineGen!');
      setTimeout(() => {
        window.location.href = role === 'creator' ? '/onboarding' : '/dashboard';
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-2">You're in!</h1>
          <p className="text-muted-foreground">
            {role === 'creator' ? 'Setting up your creator profile...' : 'Taking you to your dashboard...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl">Cine<span className="gradient-text">Gen</span></span>
          </Link>
          <h1 className="font-display font-bold text-3xl mb-2">Create your account</h1>
          <p className="text-muted-foreground">
            Already have one?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6">
            {!needsVerification ? (
              <>
                {/* Role picker */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                  {(['brand', 'creator'] as Role[]).map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        role === r
                          ? r === 'brand'
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25'
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      {r === 'brand' ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      {r === 'brand' ? "I'm a Brand" : "I'm a Creator"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {role === 'brand' ? 'Your Full Name' : 'Your Full Name'}
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shaistha Shaik"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                  required />
              </div>
              {role === 'brand' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company / Agency Name</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Nexus Energy Co."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                    required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                    required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg ${
                  role === 'brand'
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-violet-500/25'
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-500/25'
                }`}>
                {loading ? <span className="animate-pulse">Creating account...</span> : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                By signing up you agree to our Terms & Privacy Policy
              </p>
            </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="font-semibold text-lg mb-2">Verify your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-center tracking-widest text-lg focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingOtp || otp.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-violet-500/25"
                  >
                    {verifyingOtp ? (
                      <span className="animate-pulse">Verifying...</span>
                    ) : (
                      <>Verify & Continue <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNeedsVerification(false)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to registration
                  </button>
                </form>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-5">
              {role === 'brand' ? <Sparkles className="w-5 h-5 text-violet-400" /> : <Zap className="w-5 h-5 text-cyan-400" />}
              <h2 className="font-semibold">What you get as a {role === 'brand' ? 'Brand' : 'Creator'}</h2>
            </div>
            <ul className="space-y-3">
              {PERKS[role].map((perk, i) => (
                <motion.li key={perk} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm">
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${role === 'brand' ? 'text-violet-400' : 'text-cyan-400'}`} />
                  <span className="text-muted-foreground">{perk}</span>
                </motion.li>
              ))}
            </ul>
            <div className={`mt-6 p-4 rounded-xl border ${role === 'brand' ? 'bg-violet-500/5 border-violet-500/20' : 'bg-cyan-500/5 border-cyan-500/20'}`}>
              <p className="text-xs text-muted-foreground">
                🎉 <span className="font-medium text-foreground">Free forever</span> — No credit card required.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground mb-3">Just want to explore? Use demo login:</p>
              <div className="flex gap-2">
                <Link href="/login" className="flex-1 text-center text-xs px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/20 transition-all">
                  Brand Demo
                </Link>
                <Link href="/login" className="flex-1 text-center text-xs px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/20 transition-all">
                  Creator Demo
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

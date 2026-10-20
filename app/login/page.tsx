"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Film, Eye, EyeOff, Copy, Check, Zap, Users, Search, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

type TabType = 'signin' | 'getstarted' | 'freeaccounts';
type Role = 'brand' | 'creator';

const DEMO_ACCOUNTS = [
  { name: "Aryan Kapoor", email: "aryan@cinegen.demo" },
  { name: "Priya Nair", email: "priya@cinegen.demo" },
  { name: "Rahul Sharma", email: "rahul@cinegen.demo" },
  { name: "Zara Ahmed", email: "zara@cinegen.demo" },
  { name: "Marcus Chen", email: "marcus@cinegen.demo" },
  { name: "Anjali Desai", email: "anjali@cinegen.demo" },
  { name: "Vikram Rajan", email: "vikram@cinegen.demo" },
  { name: "Lena Volkov", email: "lena@cinegen.demo" },
  { name: "Dev Patel", email: "dev@cinegen.demo" },
  { name: "Yuna Kim", email: "yuna@cinegen.demo" },
  { name: "Rohan Mathur", email: "rohan@cinegen.demo" },
  { name: "Aisha Okafor", email: "aisha@cinegen.demo" },
  { name: "Sameer Joshi", email: "sameer@cinegen.demo" },
  { name: "Carlos Rivera", email: "carlos@cinegen.demo" },
  { name: "Meera Iyer", email: "meera@cinegen.demo" },
  { name: "Tanvir Sheikh", email: "tanvir@cinegen.demo" },
  { name: "Natasha Pinto", email: "natasha@cinegen.demo" },
  { name: "Ishaan Verma", email: "ishaan@cinegen.demo" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<TabType>('signin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Registration form states
  const [regRole, setRegRole] = useState<Role>('brand');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPass, setRegShowPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regDone, setRegDone] = useState(false);
  
  const { login, loginAsRole, session, loading: sessionLoading } = useSession();
  const router = useRouter();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (session) {
      window.location.href = "/dashboard";
    }
  }, [session, router]);

  // Show spinner while redirecting
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(email, password);
    if (ok) {
      toast.success("Welcome to CineGen!");
      window.location.href = "/dashboard";
    } else {
      setError("Invalid email or password. Use the demo credentials below or sign up for an account.");
    }
    setLoading(false);
  };

  const handleOneClick = async (role: "brand" | "creator") => {
    await loginAsRole(role);
    toast.success(`Logged in as ${role === "brand" ? "Brand — Arjun Mehta" : "Creator — Aryan Kapoor"}`);
    window.location.href = "/dashboard";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || regPassword.length < 6) {
      toast.error('Please fill all fields. Password must be at least 6 characters.');
      return;
    }
    setRegLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: regEmail.trim(), 
          password: regPassword, 
          name: regName.trim(), 
          role: regRole 
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
        toast.info('Check your email for verification link');
        setRegDone(true);
        setTimeout(() => {
          window.location.href = regRole === 'creator' ? '/onboarding' : '/dashboard';
        }, 2000);
      } else {
        setRegDone(true);
        toast.success(`Welcome to CineGen, ${regName.trim()}!`);
        setTimeout(() => {
          window.location.href = regRole === 'creator' ? '/onboarding' : '/dashboard';
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Signup failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl">Cine<span className="gradient-text">Gen</span></span>
          </Link>
          <h1 className="font-display font-bold text-3xl mb-2">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your account or{" "}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              create one free
            </Link>
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 p-1 glass rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'signin'
                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                : 'bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('getstarted')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'getstarted'
                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                : 'bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10'
            }`}
          >
            Get Started
          </button>
          <button
            onClick={() => setActiveTab('freeaccounts')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'freeaccounts'
                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                : 'bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10'
            }`}
          >
            Free User Accounts
          </button>
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'signin' && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="brand@cinegen.demo"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Demo@123"
                      className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href="/auth/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-transparent text-xs text-muted-foreground">or jump in instantly</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleOneClick("brand")}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Continue as Brand</div>
                    <div className="text-xs text-muted-foreground">Post briefs & hire creators</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                </button>

                <button
                  onClick={() => handleOneClick("creator")}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Continue as Creator</div>
                    <div className="text-xs text-muted-foreground">Browse briefs & submit proposals</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                </button>

                <Link
                  href="/creators"
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Explore as Guest</div>
                    <div className="text-xs text-muted-foreground">Browse creators without signing in</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'getstarted' && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              {regDone ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="font-display font-bold text-2xl mb-2">You're in!</h2>
                  <p className="text-muted-foreground">
                    {regRole === 'creator' ? 'Setting up your creator profile...' : 'Taking you to your dashboard...'}
                  </p>
                </motion.div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="font-display font-bold text-2xl mb-2">Create your account</h2>
                    <p className="text-sm text-muted-foreground">
                      Already have one?{' '}
                      <button onClick={() => setActiveTab('signin')} className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                        Sign in
                      </button>
                    </p>
                  </div>

                  {/* Role picker */}
                  <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                    {(['brand', 'creator'] as Role[]).map((r) => (
                      <button key={r} onClick={() => setRegRole(r)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          regRole === r
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

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {regRole === 'brand' ? 'Brand / Company Name' : 'Your Full Name'}
                      </label>
                      <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                        placeholder={regRole === 'brand' ? 'e.g. Nexus Energy Co.' : 'e.g. Aryan Kapoor'}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email address</label>
                      <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Password</label>
                      <div className="relative">
                        <input type={regShowPass ? 'text' : 'password'} value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                          required minLength={6} />
                        <button type="button" onClick={() => setRegShowPass(!regShowPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {regShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={regLoading}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg ${
                        regRole === 'brand'
                          ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-violet-500/25'
                          : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-500/25'
                      }`}>
                      {regLoading ? <span className="animate-pulse">Creating account...</span> : (
                        <>Create Account <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                      By signing up you agree to our Terms & Privacy Policy
                    </p>
                  </form>

                  {/* Benefits section */}
                  <div className={`mt-6 pt-6 border-t border-white/5 space-y-2`}>
                    <div className="flex items-center gap-2 mb-3">
                      {regRole === 'brand' ? <Sparkles className="w-4 h-4 text-violet-400" /> : <Zap className="w-4 h-4 text-cyan-400" />}
                      <h3 className="text-sm font-semibold">What you get</h3>
                    </div>
                    {regRole === 'brand' ? (
                      <>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                          <span>Post unlimited campaign briefs</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                          <span>AI-powered brief builder</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                          <span>Access 18+ verified AI creators</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>Showcase your AI portfolio</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>Browse & apply to live briefs</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>Get matched to relevant brands</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'freeaccounts' && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="mb-4">
                <h2 className="font-semibold text-lg mb-2">Free Demo Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  All accounts use password: <code className="bg-white/5 px-2 py-1 rounded text-foreground font-mono text-xs">Demo@123</code>
                </p>
              </div>
              
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {DEMO_ACCOUNTS.map((account) => (
                  <div
                    key={account.email}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{account.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{account.email}</div>
                    </div>
                    <CopyButton text={account.email} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

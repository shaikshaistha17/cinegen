"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Film, Eye, EyeOff, Copy, Check, Zap, Users, Search, ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

type TabType = 'signin' | 'freeaccounts';

const DEMO_ACCOUNTS = [
  { name: "Shaistha Shaik", email: "shaistha@cinegen.demo" },
  { name: "Sraddha Tadivaka", email: "sraddha@cinegen.demo" },
  { name: "Charitha Javangula", email: "charitha@cinegen.demo" },
  { name: "Tanuja Gandla", email: "tanuja@cinegen.demo" },
  { name: "Deekshitha Sanivarapu", email: "deekshitha@cinegen.demo" },
  { name: "Veda Gelli", email: "veda@cinegen.demo" },
  { name: "Keerthi Gampala", email: "keerthi@cinegen.demo" },
  { name: "Leela Jammula", email: "leela@cinegen.demo" },
  { name: "Shazia Shaik", email: "shazia@cinegen.demo" },
  { name: "Rahul Vincy", email: "rahul@cinegen.demo" },
  { name: "Dehtaj Shaik", email: "dehtaj@cinegen.demo" },
  { name: "Teja Angirekula", email: "teja@cinegen.demo" },
  { name: "Devendar Raju", email: "devendar@cinegen.demo" },
  { name: "Vamsi Krishna", email: "vamsi@cinegen.demo" },
  { name: "Gowtham Reddy", email: "gowtham@cinegen.demo" },
  { name: "Pavan Naidu", email: "pavan@cinegen.demo" },
  { name: "Charan Tej", email: "charan@cinegen.demo" },
  { name: "Pawan Kalyan", email: "pawan@cinegen.demo" },
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
    toast.success(`Logged in as ${role === "brand" ? "Brand — Arjun Mehta" : "Creator — Shaistha Shaik"}`);
    window.location.href = "/dashboard";
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
                    <div className="text-sm font-medium">Continue as Demo Brand</div>
                    <div className="text-xs text-muted-foreground">Explore brand features instantly</div>
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
                    <div className="text-sm font-medium">Continue as Demo Creator</div>
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

          {activeTab === 'freeaccounts' && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-200 font-medium mb-2">⚠️ Shared Demo Accounts</p>
                <p className="text-xs text-muted-foreground">
                  These are public demo accounts for testing. Any data you create will be visible to other users. 
                  For private testing, please <Link href="/register" className="text-violet-400 hover:text-violet-300">create your own account</Link>.
                </p>
              </div>
              
              <div className="mb-4">
                <h2 className="font-semibold text-lg mb-2">Team Demo Accounts</h2>
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

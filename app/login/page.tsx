"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Film, Eye, EyeOff, Copy, Check, Zap, Users, Search, ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

const CREDS = [
  { role: "Brand", email: "brand@cinegen.demo", password: "Demo@123", desc: "Post briefs, discover creators, manage campaigns", color: "violet" },
  { role: "Creator (Aryan)", email: "creator@cinegen.demo", password: "Demo@123", desc: "Browse briefs, submit proposals, manage profile", color: "cyan" },
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
    toast.success(`Logged in as ${role === "brand" ? "Brand — Arjun Mehta" : "Creator — Aryan Kapoor"}`);
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background */}
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
          <h1 className="font-display font-bold text-3xl mb-2">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your account or{" "}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              create one free
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Login Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold text-lg mb-6">Sign In</h2>
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

              <a
                href="/api/auth/google"
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Continue with Google</div>
                  <div className="text-xs text-muted-foreground">Sign in using your Google account</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>

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
          </motion.div>

          {/* Credentials Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Judge callout */}
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/5 border border-violet-500/20 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <Users className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-sm text-violet-300">For Judges & Evaluators</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Use the 1-click buttons or credentials below. No email verification, no OTP — instant access.
              </p>

              <div className="space-y-3">
                {CREDS.map((c) => (
                  <div key={c.role} className={`p-4 rounded-xl bg-${c.color}-500/10 border border-${c.color}-500/20`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold text-${c.color}-400 uppercase tracking-wider`}>{c.role} Account</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-foreground bg-white/5 px-2 py-0.5 rounded">{c.email}</code>
                          <CopyButton text={c.email} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Password:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-foreground bg-white/5 px-2 py-0.5 rounded">{c.password}</code>
                          <CopyButton text={c.password} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature list */}
            <div className="glass border border-white/5 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">All 18 creator accounts</h3>
              <p className="text-xs text-muted-foreground mb-3">All use password: <code className="bg-white/5 px-1.5 py-0.5 rounded text-foreground">Demo@123</code></p>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                {[
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
                ].map((c) => (
                  <div key={c.email} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-xs text-foreground font-medium">{c.name}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-muted-foreground">{c.email}</code>
                      <CopyButton text={c.email} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
